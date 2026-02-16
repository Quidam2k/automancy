/**
 * AutomationEngine: Single orchestrator that converts ParsedAbility -> AutomationResult.
 * Pipeline: pre-generate IDs -> build effects -> build activities -> build flags -> assemble item.
 */

import {
  ParsedAbility,
  AbilityType,
  AutomationComplexity,
  DamageData,
  FoundryItemData,
  ActiveEffectData,
  AutomationResult,
  ValidationResult,
} from '../types';
import { generateFoundryId } from './constants';
import { createBaseItem, createDamagePart } from './foundry-schema';
import {
  buildAttackActivity,
  buildSaveActivity,
  buildDamageActivity,
  buildHealActivity,
  buildUtilityActivity,
  ActivityBuildContext,
} from './activity-builder';
import { buildEffects } from './effect-builder';
import { buildFlags, ReviewNote } from './flag-builder';
import { validateItem } from './validation';

export interface AutomationEngineResult {
  success: boolean;
  item: FoundryItemData;
  reviewNotes: ReviewNote[];
  validation: ValidationResult;
  complexity: AutomationComplexity;
}

export class AutomationEngine {
  /**
   * Convert a ParsedAbility into a complete, validated Foundry item.
   */
  public convert(parsed: ParsedAbility): AutomationEngineResult {
    const reviewNotes: ReviewNote[] = [];

    // Step 1: Pre-generate IDs for effects and activities
    const effectIds = this.preGenerateEffectIds(parsed);
    const activityIds = this.preGenerateActivityIds(parsed);

    // Step 2: Build effects (need to happen first so activities can reference them)
    const effects = buildEffects(parsed, effectIds);

    // Step 3: Build activities (referencing effect IDs)
    const context: ActivityBuildContext = { effectIds: effectIds.slice(0, effects.length), activityIds };
    const activities = this.buildActivities(parsed, context, reviewNotes);

    // Step 4: Build item-level flags
    const flags = buildFlags(parsed, reviewNotes);

    // Step 5: Assemble the item
    const item = this.assembleItem(parsed, activities, effects, flags);

    // Step 5b: Handle conditional damage bonuses
    this.handleConditionalDamage(parsed, item, reviewNotes);

    // Step 6: Set description
    item.system.description.value = this.formatDescription(parsed);

    // Step 7: Validate
    const validation = validateItem(item);

    // Add validation errors as review notes
    for (const error of validation.errors) {
      reviewNotes.push({ severity: 'warning', message: `Validation: ${error}` });
    }

    // Add complexity notes
    if (parsed.complexity >= AutomationComplexity.COMPLEX) {
      reviewNotes.push({
        severity: 'info',
        message: `Complexity ${parsed.complexity}/4: Manual review recommended for advanced automation.`,
      });
    }

    return {
      success: validation.valid,
      item,
      reviewNotes,
      validation,
      complexity: parsed.complexity,
    };
  }

  /**
   * Pre-generate effect IDs based on how many conditions the ability applies.
   */
  private preGenerateEffectIds(parsed: ParsedAbility): string[] {
    const count = Math.max(parsed.conditions.length, parsed.effects.length > 0 ? 1 : 0);
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(generateFoundryId());
    }
    return ids;
  }

  /**
   * Pre-generate activity IDs based on ability type.
   */
  private preGenerateActivityIds(parsed: ParsedAbility): { [key: string]: string } {
    const ids: { [key: string]: string } = {};

    switch (parsed.type) {
      case AbilityType.WEAPON_ATTACK:
      case AbilityType.SPELL_ATTACK:
        ids.attack = generateFoundryId();
        if (parsed.saves.length > 0) {
          ids.save = generateFoundryId();
        }
        break;

      case AbilityType.SAVE_ABILITY:
        ids.save = generateFoundryId();
        break;

      case AbilityType.HEALING:
        ids.heal = generateFoundryId();
        break;

      case AbilityType.UTILITY:
      case AbilityType.PASSIVE:
        ids.utility = generateFoundryId();
        break;

      case AbilityType.REACTION:
        ids.utility = generateFoundryId();
        break;

      default:
        ids.utility = generateFoundryId();
        break;
    }

    return ids;
  }

  /**
   * Build activities based on ability type.
   */
  private buildActivities(
    parsed: ParsedAbility,
    context: ActivityBuildContext,
    reviewNotes: ReviewNote[],
  ): Record<string, Record<string, any>> {
    const activities: Record<string, Record<string, any>> = {};

    switch (parsed.type) {
      case AbilityType.WEAPON_ATTACK:
      case AbilityType.SPELL_ATTACK: {
        // Primary: attack activity (keeps full damage + effect refs without onSave)
        const attackId = context.activityIds.attack;
        if (attackId) {
          activities[attackId] = buildAttackActivity(attackId, parsed, context);
        }
        // Secondary: save activity (if ability has saves too)
        const saveId = context.activityIds.save;
        if (saveId && parsed.saves.length > 0) {
          // Build save with no damage, then add type-only parts
          const saveParsed = { ...parsed, damage: [] as DamageData[] };
          const saveActivity = buildSaveActivity(saveId, saveParsed, context);
          // Add type-only damage parts (null dice, type preserved, scaling.number: 1)
          // so midi-qol knows the associated damage type
          saveActivity.damage.parts = parsed.damage
            .filter((d: DamageData) => !d.conditional)
            .map((d: DamageData) => createDamagePart(null, null, '', d.type ? [d.type] : [], { number: 1 }));
          activities[saveId] = saveActivity;
        }
        break;
      }

      case AbilityType.SAVE_ABILITY: {
        const saveId = context.activityIds.save;
        if (saveId) {
          activities[saveId] = buildSaveActivity(saveId, parsed, context);
        }
        break;
      }

      case AbilityType.HEALING: {
        const healId = context.activityIds.heal;
        if (healId) {
          activities[healId] = buildHealActivity(healId, parsed, context);
        }
        break;
      }

      case AbilityType.UTILITY:
      case AbilityType.PASSIVE: {
        const utilId = context.activityIds.utility;
        if (utilId) {
          if (parsed.damage.length > 0) {
            activities[utilId] = buildDamageActivity(utilId, parsed, context);
          } else {
            activities[utilId] = buildUtilityActivity(utilId, parsed, context);
          }
        }
        break;
      }

      case AbilityType.REACTION: {
        const utilId = context.activityIds.utility;
        if (utilId) {
          const activity = buildUtilityActivity(utilId, parsed, context);
          activity.activation.type = 'reaction';
          activities[utilId] = activity;
          reviewNotes.push({
            severity: 'manual',
            message: 'Reaction trigger may need manual configuration with gambits-premades.',
          });
        }
        break;
      }
    }

    return activities;
  }

  /**
   * Assemble the final Foundry item from components.
   */
  private assembleItem(
    parsed: ParsedAbility,
    activities: Record<string, Record<string, any>>,
    effects: ActiveEffectData[],
    flags: Record<string, any>,
  ): FoundryItemData {
    const itemType = this.mapAbilityTypeToItemType(parsed.type);
    const item = createBaseItem(parsed.name, itemType);

    // Set activities
    item.system.activities = activities;

    // Set effects
    item.effects = effects;

    // Set flags
    item.flags = flags;

    // Set icon
    item.img = this.getIcon(parsed);

    // Handle recharge (Foundry native system.recharge)
    if (parsed.resources.type === 'recharge' && parsed.resources.recharge) {
      const rechargeMatch = parsed.resources.recharge.match(/(\d+)/);
      if (rechargeMatch) {
        item.system.uses = {
          max: '1',
          spent: 0,
          recovery: [
            {
              period: 'recharge',
              formula: rechargeMatch[1],
              type: 'recoverAll',
            },
          ],
        };
      }
    }

    // Handle per-day / per-rest uses
    if (parsed.resources.type === 'per_day' && parsed.resources.amount) {
      item.system.uses = {
        max: String(parsed.resources.amount),
        spent: 0,
        recovery: [
          {
            period: 'lr',
            type: 'recoverAll',
          },
        ],
      };
    }
    if (parsed.resources.type === 'per_rest' && parsed.resources.amount) {
      item.system.uses = {
        max: String(parsed.resources.amount),
        spent: 0,
        recovery: [
          {
            period: 'sr',
            type: 'recoverAll',
          },
        ],
      };
    }

    // Handle AoE templates
    this.configureAoETemplates(item, parsed, activities);

    return item;
  }

  /**
   * Configure AoE template settings on activities based on parsed range/area data.
   */
  private configureAoETemplates(
    item: FoundryItemData,
    parsed: ParsedAbility,
    activities: Record<string, Record<string, any>>,
  ): void {
    // Detect AoE from raw text
    const raw = parsed.raw.toLowerCase();
    let templateType: string | null = null;
    let size: number | null = null;

    // "X-foot line"
    const lineMatch = raw.match(/(\d+)[- ]foot\s+line/);
    if (lineMatch) {
      templateType = 'line';
      size = parseInt(lineMatch[1]);
    }

    // "X-foot cone"
    const coneMatch = raw.match(/(\d+)[- ]foot\s+cone/);
    if (coneMatch) {
      templateType = 'cone';
      size = parseInt(coneMatch[1]);
    }

    // "X-foot radius" / "X-foot-radius sphere"
    const radiusMatch = raw.match(/(\d+)[- ]foot[- ]?radius/);
    if (radiusMatch) {
      templateType = 'sphere';
      size = parseInt(radiusMatch[1]);
    }

    // "X-foot cube"
    const cubeMatch = raw.match(/(\d+)[- ]foot\s+cube/);
    if (cubeMatch) {
      templateType = 'cube';
      size = parseInt(cubeMatch[1]);
    }

    // "X-foot cylinder"
    const cylinderMatch = raw.match(/(\d+)[- ]foot\s+cylinder/);
    if (cylinderMatch) {
      templateType = 'cylinder';
      size = parseInt(cylinderMatch[1]);
    }

    if (templateType && size) {
      // Set on all activities
      for (const activity of Object.values(activities)) {
        activity.target.template.type = templateType;
        activity.target.template.size = String(size);
        activity.target.template.units = 'ft';

        // For lines, set width (default 5ft)
        if (templateType === 'line') {
          activity.target.template.width = '5';
        }

        // Clear individual target count for AoE
        activity.target.affects.count = '';
        activity.target.affects.type = '';
      }
    }
  }

  /**
   * Handle conditional damage bonuses (e.g., "Against dragons, +3d6 extra damage").
   * Creates a damageBonus macro pass or reviewNote.
   */
  private handleConditionalDamage(
    parsed: ParsedAbility,
    item: FoundryItemData,
    reviewNotes: ReviewNote[],
  ): void {
    const conditionalDamage = parsed.damage.filter(d => d.conditional);
    if (conditionalDamage.length === 0) return;

    for (const cd of conditionalDamage) {
      reviewNotes.push({
        severity: 'manual',
        message: `Conditional damage: ${cd.formula} ${cd.type}${cd.condition ? ` (${cd.condition})` : ''}. May need damageBonus macro or manual configuration.`,
      });

      // If we can detect the creature type condition, add a damageBonus onUseMacroName
      if (cd.condition) {
        const creatureType = detectCreatureTypeCondition(cd.condition);
        if (creatureType) {
          // Add onUseMacroName flag for damageBonus pass
          if (!item.flags['midi-qol'].onUseMacroName) {
            item.flags['midi-qol'].onUseMacroName = '';
          }
          reviewNotes.push({
            severity: 'info',
            message: `Detected creature-type conditional: +${cd.formula} vs ${creatureType}. Use damageBonus macro pass with raceOrType check.`,
          });
        }
      }
    }
  }

  /**
   * Map AbilityType to Foundry item type.
   * Currently all abilities map to 'feat'. Expand when spell/weapon types are needed.
   */
  private mapAbilityTypeToItemType(_type: AbilityType): FoundryItemData['type'] {
    return 'feat';
  }

  /**
   * Generate an HTML description from parsed ability.
   */
  private formatDescription(parsed: ParsedAbility): string {
    return `<p>${this.escapeHtml(parsed.raw)}</p>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Get an appropriate icon for the ability.
   */
  private getIcon(parsed: ParsedAbility): string {
    switch (parsed.type) {
      case AbilityType.WEAPON_ATTACK:
        return 'icons/svg/sword.svg';
      case AbilityType.SPELL_ATTACK:
        return 'icons/svg/lightning.svg';
      case AbilityType.SAVE_ABILITY:
        return 'icons/svg/explosion.svg';
      case AbilityType.HEALING:
        return 'icons/svg/heal.svg';
      case AbilityType.REACTION:
        return 'icons/svg/shield.svg';
      default:
        return 'icons/svg/mystery-man.svg';
    }
  }
}

/**
 * Detect creature type from a condition string.
 * E.g., "against dragons" -> "dragon"
 */
function detectCreatureTypeCondition(condition: string): string | null {
  const creatureTypes = [
    'dragon', 'undead', 'fiend', 'celestial', 'fey', 'elemental',
    'aberration', 'beast', 'construct', 'giant', 'humanoid',
    'monstrosity', 'ooze', 'plant',
  ];

  const lower = condition.toLowerCase();
  for (const type of creatureTypes) {
    if (lower.includes(type)) {
      return type;
    }
  }
  return null;
}
