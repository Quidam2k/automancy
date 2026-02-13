/**
 * Builds D&D5e 4.x activities from parsed ability data.
 * Activity types: attack, save, damage, heal, utility.
 */

import { ParsedAbility, DamageData, SaveData } from '../types';
import { createBaseActivity, createDamagePart, createEffectReference } from './foundry-schema';
import { Ability, ABILITIES } from './constants';

export interface ActivityBuildContext {
  effectIds: string[];
  activityIds: { [key: string]: string };
}

/**
 * Build an attack activity from parsed ability data.
 */
export function buildAttackActivity(
  id: string,
  parsed: ParsedAbility,
  context: ActivityBuildContext,
): Record<string, any> {
  const activity = createBaseActivity({ id, type: 'attack' });

  // Set activation
  activity.activation.type = mapActivationType(parsed.activation.type);
  activity.activation.value = parsed.activation.cost;

  // Set attack type
  if (parsed.attackType) {
    const isRanged = parsed.attackType === 'rwak' || parsed.attackType === 'rsak';
    const isSpell = parsed.attackType === 'msak' || parsed.attackType === 'rsak';
    activity.attack.type = {
      value: isRanged ? 'ranged' : 'melee',
      classification: isSpell ? 'spell' : 'weapon',
    };
  }

  // Set attack bonus if flat
  if (parsed.attackBonus !== undefined) {
    activity.attack.bonus = String(parsed.attackBonus);
    activity.attack.flat = true;
  }

  // Set range
  setActivityRange(activity, parsed);

  // Set target
  setActivityTarget(activity, parsed);

  // Build damage parts
  activity.damage.parts = parsed.damage.map(d => parseDamageToFoundryPart(d));

  // Wire effect references
  for (const effectId of context.effectIds) {
    activity.effects.push(createEffectReference(effectId));
  }

  return activity;
}

/**
 * Build a save activity from parsed ability data.
 */
export function buildSaveActivity(
  id: string,
  parsed: ParsedAbility,
  context: ActivityBuildContext,
): Record<string, any> {
  const activity = createBaseActivity({ id, type: 'save' });

  // Set activation
  activity.activation.type = mapActivationType(parsed.activation.type);
  activity.activation.value = parsed.activation.cost;

  // Set save details
  if (parsed.saves.length > 0) {
    const save = parsed.saves[0];
    activity.save.ability = [normalizeAbility(save.ability)];

    if (save.dc !== null) {
      if (save.scaling === 'flat') {
        activity.save.dc.calculation = '';
        activity.save.dc.formula = String(save.dc);
      } else if (save.scaling === 'spell') {
        activity.save.dc.calculation = 'spellcasting';
        activity.save.dc.formula = '';
      }
    }
  }

  // Set damage onSave
  const hasHalfDamage = parsed.raw.toLowerCase().includes('half');
  activity.damage.onSave = hasHalfDamage ? 'half' : 'none';

  // Set range
  setActivityRange(activity, parsed);

  // Set target
  setActivityTarget(activity, parsed);

  // Build damage parts
  activity.damage.parts = parsed.damage.map(d => parseDamageToFoundryPart(d));

  // Wire effect references (not applied on save by default)
  for (const effectId of context.effectIds) {
    activity.effects.push(createEffectReference(effectId, false));
  }

  return activity;
}

/**
 * Build a damage-only activity (no attack roll, no save).
 */
export function buildDamageActivity(
  id: string,
  parsed: ParsedAbility,
  context: ActivityBuildContext,
): Record<string, any> {
  const activity = createBaseActivity({ id, type: 'damage' });

  activity.activation.type = mapActivationType(parsed.activation.type);
  activity.activation.value = parsed.activation.cost;

  setActivityRange(activity, parsed);
  setActivityTarget(activity, parsed);

  activity.damage.parts = parsed.damage.map(d => parseDamageToFoundryPart(d));

  for (const effectId of context.effectIds) {
    activity.effects.push(createEffectReference(effectId));
  }

  return activity;
}

/**
 * Build a utility activity (no damage, no attack, no save).
 */
export function buildUtilityActivity(
  id: string,
  parsed: ParsedAbility,
  context: ActivityBuildContext,
): Record<string, any> {
  const activity = createBaseActivity({ id, type: 'utility' });

  activity.activation.type = mapActivationType(parsed.activation.type);
  activity.activation.value = parsed.activation.cost;

  setActivityRange(activity, parsed);
  setActivityTarget(activity, parsed);

  for (const effectId of context.effectIds) {
    activity.effects.push(createEffectReference(effectId));
  }

  return activity;
}

/**
 * Build a heal activity.
 */
export function buildHealActivity(
  id: string,
  parsed: ParsedAbility,
  context: ActivityBuildContext,
): Record<string, any> {
  const activity = createBaseActivity({ id, type: 'heal' });

  activity.activation.type = mapActivationType(parsed.activation.type);
  activity.activation.value = parsed.activation.cost;

  setActivityRange(activity, parsed);
  setActivityTarget(activity, parsed);

  // Parse the first damage entry as healing
  if (parsed.damage.length > 0) {
    const heal = parsed.damage[0];
    const parts = parseDamageFormula(heal.formula);
    activity.healing = {
      custom: { enabled: false, formula: '' },
      number: parts.number,
      denomination: parts.denomination,
      bonus: parts.bonus,
      types: ['healing'],
      scaling: { mode: '', number: null, formula: '' },
    };
  }

  for (const effectId of context.effectIds) {
    activity.effects.push(createEffectReference(effectId));
  }

  return activity;
}

// --- Helper Functions ---

function mapActivationType(type: string): string {
  const map: Record<string, string> = {
    action: 'action',
    bonus: 'bonus',
    reaction: 'reaction',
    legendary: 'legendary',
    lair: 'lair',
    special: 'special',
  };
  return map[type] || 'action';
}

function setActivityRange(activity: Record<string, any>, parsed: ParsedAbility): void {
  if (parsed.range.units === 'touch') {
    activity.range.units = 'touch';
  } else if (parsed.range.units === 'self') {
    activity.range.units = 'self';
  } else if (parsed.range.value) {
    activity.range.units = 'ft';
    activity.range.value = parsed.range.value;
  }
}

function setActivityTarget(activity: Record<string, any>, parsed: ParsedAbility): void {
  if (parsed.target.value) {
    activity.target.affects.count = String(parsed.target.value);
  }
  if (parsed.target.type) {
    activity.target.affects.type = parsed.target.type;
  }
}

function normalizeAbility(ability: string): string {
  const lower = ability.toLowerCase().substring(0, 3);
  if ((ABILITIES as readonly string[]).includes(lower)) {
    return lower as Ability;
  }
  // Map full names
  const map: Record<string, Ability> = {
    strength: 'str', dexterity: 'dex', constitution: 'con',
    intelligence: 'int', wisdom: 'wis', charisma: 'cha',
  };
  return map[ability.toLowerCase()] || lower;
}

/**
 * Parse a damage formula like "4d6", "2d8 + 3" into Foundry damage part format.
 */
function parseDamageFormula(formula: string): { number: number | null; denomination: number | null; bonus: string } {
  const diceMatch = formula.match(/(\d+)d(\d+)/);
  const bonusMatch = formula.match(/[+-]\s*(\d+)(?!d)/);

  return {
    number: diceMatch ? parseInt(diceMatch[1]) : null,
    denomination: diceMatch ? parseInt(diceMatch[2]) : null,
    bonus: bonusMatch ? bonusMatch[0].replace(/\s/g, '') : '',
  };
}

/**
 * Convert a DamageData from parser into a Foundry damage part.
 */
function parseDamageToFoundryPart(damage: DamageData): Record<string, any> {
  const parts = parseDamageFormula(damage.formula);
  return createDamagePart(
    parts.number,
    parts.denomination,
    parts.bonus,
    damage.type ? [damage.type] : [],
  );
}
