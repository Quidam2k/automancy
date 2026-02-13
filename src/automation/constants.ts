/**
 * Validated constants derived from reference repositories.
 * Every string literal in the output layer comes from this file.
 * Sources: midi-qol settings.ts, dae dae.ts/globals.ts, FLAGS.md
 */

// --- Macro Passes (midi-qol settings.ts:1187-1216) ---
export const MACRO_PASSES = [
  'preTargeting',
  'preItemRoll',
  'templatePlaced',
  'preAttackRoll',
  'preAttackRollConfig',
  'preCheckHits',
  'postAttackRoll',
  'preDamageRoll',
  'postDamageRoll',
  'damageBonus',
  'preSave',
  'postSave',
  'preDamageRollConfig',
  'preDamageApplication',
  'preActiveEffects',
  'postActiveEffects',
  'isTargeted',
  'isPreAttacked',
  'isAttacked',
  'isHit',
  'preTargetSave',
  'isSave',
  'isSaveSuccess',
  'isSaveFailure',
  'preTargetDamageApplication',
  'postTargetEffectApplication',
  'isDamaged',
  'all',
] as const;

export type MacroPass = typeof MACRO_PASSES[number];

// --- DAE specialDuration values (dae.ts:69-76) ---
export const DAE_SPECIAL_DURATIONS = [
  'turnStart',
  'turnEnd',
  'turnStartSource',
  'turnEndSource',
  'combatEnd',
  'joinCombat',
] as const;

export type DaeSpecialDuration = typeof DAE_SPECIAL_DURATIONS[number];

// --- DAE macroRepeat values (dae.ts:77-84) ---
export const DAE_MACRO_REPEATS = [
  'none',
  'startEveryTurn',
  'endEveryTurn',
  'startEndEveryTurn',
  'startEveryTurnAny',
  'endEveryTurnAny',
  'startEndEveryTurnAny',
] as const;

export type DaeMacroRepeat = typeof DAE_MACRO_REPEATS[number];

// --- DAE stackable values (dae globals.ts:73) ---
export const DAE_STACKABLE_VALUES = [
  'noneName',
  'noneNameOnly',
  'none',
  'multi',
  'count',
  'countDeleteDecrement',
] as const;

export type DaeStackable = typeof DAE_STACKABLE_VALUES[number];

// --- Active Effect Modes (Foundry CONST.ACTIVE_EFFECT_MODES) ---
export const ACTIVE_EFFECT_MODES = {
  CUSTOM: 0,
  MULTIPLY: 1,
  ADD: 2,
  DOWNGRADE: 3,
  UPGRADE: 4,
  OVERRIDE: 5,
} as const;

// --- Standard D&D 5e Conditions (Foundry system) ---
export const STANDARD_CONDITIONS = [
  'blinded',
  'charmed',
  'deafened',
  'exhaustion',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
] as const;

export type StandardCondition = typeof STANDARD_CONDITIONS[number];

// --- D&D 5e Ability Abbreviations ---
export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = typeof ABILITIES[number];

// --- Attack Types ---
export const ATTACK_TYPES = ['mwak', 'rwak', 'msak', 'rsak'] as const;
export type AttackType = typeof ATTACK_TYPES[number];

// --- Activity Types (D&D5e 4.x) ---
export const ACTIVITY_TYPES = [
  'attack',
  'save',
  'damage',
  'heal',
  'utility',
  'check',
  'enchant',
  'summon',
] as const;

export type ActivityType = typeof ACTIVITY_TYPES[number];

// --- Damage Types ---
export const DAMAGE_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
] as const;

export type DamageType = typeof DAMAGE_TYPES[number];

// --- Damage onSave values ---
export const DAMAGE_ON_SAVE = ['half', 'none', 'full'] as const;
export type DamageOnSave = typeof DAMAGE_ON_SAVE[number];

// --- Duration Units ---
export const DURATION_UNITS = [
  'inst', 'turn', 'round', 'minute', 'hour', 'day', 'month', 'year', 'perm', 'spec',
] as const;

// --- Range Units ---
export const RANGE_UNITS = [
  'self', 'touch', 'ft', 'mi', 'spec', 'any',
] as const;

// --- Item Types ---
export const ITEM_TYPES = [
  'weapon', 'spell', 'feat', 'equipment', 'consumable', 'tool', 'loot',
] as const;

// --- Activation Types ---
export const ACTIVATION_TYPES = [
  'action', 'bonus', 'reaction', 'legendary', 'lair', 'special', 'none',
] as const;

// --- Valid midi-qol item-level flags (FLAGS.md: Item Flags section) ---
export const VALID_MIDI_ITEM_FLAGS = [
  'onUseMacroName',
  'effectActivation',
  'forceWorkflow',
  'noDamSave',
  'rollOtherDamage',
  'saveDamage',
  'otherSaveDamage',
  'syntheticItem',
] as const;

// --- Valid midi-qol effect-level flags ---
export const VALID_MIDI_EFFECT_FLAGS = [
  'effectActivation',
] as const;

// --- midiProperties defaults (from reference item agonizing-touch) ---
export const MIDI_PROPERTIES_DEFAULTS = {
  ignoreTraits: [] as string[],
  triggeredActivityId: 'none',
  triggeredActivityConditionText: '',
  triggeredActivityTargets: 'targets',
  triggeredActivityRollAs: 'self',
  autoConsume: false,
  forceConsumeDialog: 'default',
  forceRollDialog: 'default',
  forceDamageDialog: 'default',
  confirmTargets: 'default',
  autoTargetType: 'any',
  autoTargetAction: 'default',
  automationOnly: false,
  otherActivityCompatible: true,
  otherActivityAsParentType: true,
  identifier: '',
  displayActivityName: false,
  rollMode: 'default',
  chooseEffects: false,
  toggleEffect: false,
  ignoreFullCover: false,
  removeChatButtons: 'default',
  magicEffect: false,
  magicDamage: false,
  noConcentrationCheck: false,
  autoCEEffects: 'default',
} as const;

// --- AoE Template Types ---
export const TEMPLATE_TYPES = [
  'cone', 'cube', 'cylinder', 'line', 'radius', 'sphere', 'square', 'wall',
] as const;

// --- Foundry ID generation ---
const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateFoundryId(): string {
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += ID_CHARS.charAt(Math.floor(Math.random() * ID_CHARS.length));
  }
  return id;
}
