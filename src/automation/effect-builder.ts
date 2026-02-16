/**
 * Builds Active Effects with correct DAE/midi-qol flags.
 * Both standard and custom conditions go in statuses[] (for icon display).
 * Custom conditions additionally get chris-premades + convenient-effects flags.
 */

import { ParsedAbility, ConditionData, ActiveEffectData, ChangeData } from '../types';
import { createBaseEffect } from './foundry-schema';
import {
  STANDARD_CONDITIONS,
  StandardCondition,
  ACTIVE_EFFECT_MODES,
  DaeSpecialDuration,
} from './constants';

/**
 * Build effects from parsed ability data.
 * Returns an array of complete ActiveEffectData.
 */
export function buildEffects(
  parsed: ParsedAbility,
  effectIds: string[],
): ActiveEffectData[] {
  const effects: ActiveEffectData[] = [];

  if (parsed.conditions.length === 0 && parsed.effects.length === 0) {
    return effects;
  }

  // Build one effect per condition
  parsed.conditions.forEach((condition, index) => {
    const id = effectIds[index] || effectIds[0];
    const effect = buildConditionEffect(parsed.name, condition, id);
    effects.push(effect);
  });

  // Build effects for non-condition effects (advantage, etc.)
  // These get merged into existing effects or create new ones
  if (parsed.effects.length > 0 && effects.length === 0) {
    const id = effectIds[0];
    const effect = buildGenericEffect(parsed.name, parsed.effects, id);
    effects.push(effect);
  }

  return effects;
}

/**
 * Build an effect for a standard or custom condition.
 */
function buildConditionEffect(
  abilityName: string,
  condition: ConditionData,
  effectId: string,
): ActiveEffectData {
  const conditionName = condition.name || condition.type;
  const effect = createBaseEffect(effectId, `${abilityName} - ${capitalize(conditionName)}`);

  const isStandard = isStandardCondition(condition.type);

  if (isStandard) {
    // Standard conditions go in statuses[]
    effect.statuses = [condition.type];
    effect.changes = getStandardConditionChanges(condition.type as StandardCondition);
  } else {
    // Custom conditions get midi-qol flag changes + status for icon display
    effect.changes = getCustomConditionChanges(condition.type);
    // Add informational flags
    effect.flags!['chris-premades'] = {
      condition: true,
      conditionType: condition.type,
      customCondition: true,
    };
    effect.flags!['convenient-effects'] = {
      isCustom: true,
      description: getConditionDescription(condition.type),
    };
    // Custom conditions still get a status for the icon
    effect.statuses = [condition.type];
  }

  // Set duration
  setEffectDuration(effect, condition);

  // Set midi-qol effectActivation flag
  effect.flags!['midi-qol'] = {
    effectActivation: 'failedSave',
  };

  return effect;
}

/**
 * Build a generic effect from non-condition effect data (advantage, AC bonus, etc.).
 */
function buildGenericEffect(
  abilityName: string,
  effects: ParsedAbility['effects'],
  effectId: string,
): ActiveEffectData {
  const effect = createBaseEffect(effectId, abilityName);

  for (const eff of effects) {
    const changes = getEffectChanges(eff);
    effect.changes.push(...changes);
  }

  return effect;
}

/**
 * Check if a condition is in the standard D&D 5e set.
 */
function isStandardCondition(type: string): boolean {
  return (STANDARD_CONDITIONS as readonly string[]).includes(type.toLowerCase());
}

/**
 * Get Active Effect changes for a standard condition.
 * These set the appropriate midi-qol flags.
 */
function getStandardConditionChanges(condition: StandardCondition): ChangeData[] {
  const changes: ChangeData[] = [];

  switch (condition) {
    case 'prone':
      // Prone: grants advantage to melee, disadvantage to ranged; disadvantage on attacks
      changes.push(
        { key: 'flags.midi-qol.grants.advantage.attack.mwak', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.grants.advantage.attack.msak', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.grants.disadvantage.attack.rwak', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.grants.disadvantage.attack.rsak', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.disadvantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
      );
      break;

    case 'grappled':
      // Grappled: speed 0
      changes.push(
        { key: 'system.attributes.movement.walk', mode: ACTIVE_EFFECT_MODES.OVERRIDE, value: '0', priority: 50 },
      );
      break;

    case 'restrained':
      // Restrained: speed 0, disadvantage on attacks, advantage to attacks against, disadvantage on dex saves
      changes.push(
        { key: 'system.attributes.movement.walk', mode: ACTIVE_EFFECT_MODES.OVERRIDE, value: '0', priority: 50 },
        { key: 'flags.midi-qol.disadvantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.grants.advantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.disadvantage.save.dex', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
      );
      break;

    case 'blinded':
      changes.push(
        { key: 'flags.midi-qol.disadvantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.grants.advantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
      );
      break;

    case 'frightened':
      changes.push(
        { key: 'flags.midi-qol.disadvantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.disadvantage.check.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
      );
      break;

    case 'paralyzed':
      changes.push(
        { key: 'flags.midi-qol.fail.save.str', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.fail.save.dex', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.grants.advantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.grants.critical.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: 'checkNearby(-1, targetUuid, 5)', priority: 20 },
      );
      break;

    case 'stunned':
      changes.push(
        { key: 'flags.midi-qol.fail.save.str', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.fail.save.dex', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.grants.advantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
      );
      break;

    case 'poisoned':
      changes.push(
        { key: 'flags.midi-qol.disadvantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.disadvantage.check.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
      );
      break;

    case 'incapacitated':
      // No attacks, no reactions
      break;

    case 'invisible':
      changes.push(
        { key: 'flags.midi-qol.advantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.grants.disadvantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
      );
      break;

    case 'petrified':
      changes.push(
        { key: 'flags.midi-qol.grants.advantage.attack.all', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.fail.save.str', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
        { key: 'flags.midi-qol.fail.save.dex', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: '1', priority: 20 },
      );
      break;

    // Conditions with minimal mechanical changes handled by Foundry itself
    case 'charmed':
    case 'deafened':
    case 'exhaustion':
    case 'unconscious':
      break;
  }

  return changes;
}

/**
 * Get changes for a custom (non-standard) condition.
 */
function getCustomConditionChanges(type: string): ChangeData[] {
  const changes: ChangeData[] = [];

  switch (type.toLowerCase()) {
    case 'dazed':
      // MCDM condition: can only take action, bonus, OR move - not all three
      changes.push(
        { key: 'flags.midi-qol.dazed', mode: ACTIVE_EFFECT_MODES.OVERRIDE, value: '1', priority: 20 },
        { key: 'macro.tokenMagic', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: 'blur', priority: 20 },
      );
      break;

    case 'bleeding':
      // Damage at start of turn
      changes.push(
        { key: 'flags.midi-qol.OverTime', mode: ACTIVE_EFFECT_MODES.CUSTOM, value: 'turn=start,damageRoll=1d6,damageType=slashing,label=Bleeding', priority: 20 },
      );
      break;

    default:
      // Unknown custom condition - add a flag for tracking
      changes.push(
        { key: `flags.midi-qol.${type}`, mode: ACTIVE_EFFECT_MODES.OVERRIDE, value: '1', priority: 20 },
      );
      break;
  }

  return changes;
}

/**
 * Get Active Effect changes for generic effects (advantage, AC bonus, etc.).
 */
function getEffectChanges(eff: ParsedAbility['effects'][0]): ChangeData[] {
  const changes: ChangeData[] = [];

  switch (eff.type) {
    case 'advantage':
      changes.push({
        key: 'flags.midi-qol.advantage.attack.all',
        mode: ACTIVE_EFFECT_MODES.CUSTOM,
        value: '1',
        priority: 20,
      });
      break;

    case 'disadvantage':
      changes.push({
        key: 'flags.midi-qol.disadvantage.attack.all',
        mode: ACTIVE_EFFECT_MODES.CUSTOM,
        value: '1',
        priority: 20,
      });
      break;

    case 'ac_bonus':
      if (eff.value !== undefined) {
        changes.push({
          key: 'system.attributes.ac.bonus',
          mode: ACTIVE_EFFECT_MODES.ADD,
          value: String(eff.value),
          priority: 20,
        });
      }
      break;

    case 'damage_resistance':
      if (eff.damageTypes) {
        for (const dt of eff.damageTypes) {
          changes.push({
            key: `system.traits.dr.value`,
            mode: ACTIVE_EFFECT_MODES.ADD,
            value: dt,
            priority: 20,
          });
        }
      }
      break;
  }

  return changes;
}

/**
 * Set effect duration from condition data.
 */
function setEffectDuration(effect: ActiveEffectData, condition: ConditionData): void {
  if (condition.saveEnds) {
    // Save-ends: long duration + specialDuration for turn-based saves
    effect.duration.rounds = 100;
    effect.duration.turns = 0;

    const timing = condition.saveEndsTiming || 'end_of_turn';
    const specialDuration: DaeSpecialDuration = timing === 'start_of_turn' ? 'turnStartSource' : 'turnEndSource';

    if (effect.flags?.dae) {
      effect.flags.dae.specialDuration = [specialDuration];
      effect.flags.dae.macroRepeat = 'endEveryTurn';
    }
  }
}

function getConditionDescription(type: string): string {
  const descriptions: Record<string, string> = {
    dazed: 'Dazed: Can only take an action, a bonus action, OR move on your turn - not all three.',
    bleeding: 'Bleeding: Takes damage at the start of each turn.',
  };
  return descriptions[type.toLowerCase()] || `Affected by ${type}.`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
