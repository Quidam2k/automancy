// Core Types for Automancy Converter
// Based on analysis of reference repositories

export interface AbilityDescription {
  raw: string;
  parsed: ParsedAbility;
}

export interface ParsedAbility {
  name: string;
  raw: string; // Added for Phase 2 support
  type: AbilityType;
  attackType?: "mwak" | "rwak" | "msak" | "rsak"; // Specific attack action type
  attackBonus?: number; // Parsed attack bonus from "+X to hit"
  activation: ActivationData;
  target: TargetData;
  damage: DamageData[];
  saves: SaveData[];
  effects: EffectData[];
  conditions: ConditionData[];
  resources: ResourceData;
  duration: DurationData;
  range: RangeData;
  complexity: AutomationComplexity;
  requirements?: any[]; // Added for Phase 2 support
}

export enum AbilityType {
  WEAPON_ATTACK = "weapon_attack",
  SPELL_ATTACK = "spell_attack", 
  SAVE_ABILITY = "save_ability",
  HEALING = "healing",
  UTILITY = "utility",
  PASSIVE = "passive",
  REACTION = "reaction"
}

export enum AutomationComplexity {
  SIMPLE = 1,      // Basic flags and effects only
  MODERATE = 2,    // Simple macros, conditional effects  
  COMPLEX = 3,     // Advanced macros, multi-step workflows
  REACTION = 4     // Real-time reactions, cross-actor effects
}

export interface ActivationData {
  type: "action" | "bonus" | "reaction" | "legendary" | "lair" | "special";
  cost: number;
  condition?: string;
}

export interface TargetData {
  value: number | null;
  type: "self" | "creature" | "ally" | "enemy" | "object" | "space";
  width?: number;
  units?: "ft" | "mi" | "any";
}

export interface RangeData {
  value: number | null;
  long?: number | null;
  units: "ft" | "mi" | "touch" | "self" | "sight" | "unlimited" | "special";
}

export interface DamageData {
  formula: string;
  type: string;
  versatile?: string;
  conditional?: boolean;
  condition?: string;
}

export interface SaveData {
  ability: string;
  dc: number | null;
  scaling: "flat" | "spell" | "dex" | "prof";
}

export interface DurationData {
  value: number | null;
  units: "inst" | "turn" | "round" | "minute" | "hour" | "day" | "perm" | "spec";
  concentration?: boolean;
}

export interface EffectData {
  name?: string;
  type: "ac_bonus" | "ability_modifier" | "damage_resistance" | "condition" | "advantage" | "disadvantage";
  value?: number;
  ability?: string;
  damageTypes?: string[];
  amount?: number;
  condition?: string;
}

export interface ConditionData {
  type: string;
  name: string; // Display name of the condition
  value: any;
  condition?: string;
  saveEnds?: boolean; // Whether the condition can be ended with a save
  saveEndsTiming?: "start_of_turn" | "end_of_turn"; // When the save happens
}

export interface ResourceData {
  consumesResource: boolean;
  type?: "per_day" | "per_rest" | "recharge" | "charges";
  amount?: number;
  consumed?: number; // Added for Phase 2 support
  recharge?: string;
}

// Foundry VTT Data Structures

export interface FoundryItemData {
  _id: string;
  name: string;
  type: "spell" | "feat" | "weapon" | "equipment" | "consumable" | "tool" | "loot" | "background" | "class" | "subclass" | "race";
  img: string;
  system: any;
  effects: ActiveEffectData[];
  flags: Record<string, any>;
  folder?: string | null;
  sort: number;
  ownership: Record<string, number>;
}

export interface ActiveEffectData {
  _id?: string;
  name: string;
  img?: string;
  changes: ChangeData[];
  duration: {
    startTime?: number | null;
    seconds?: number | null;
    rounds?: number | null;
    turns?: number | null;
    startRound?: number | null;
    startTurn?: number | null;
  };
  flags?: Record<string, any>;
  statuses?: string[];
  transfer?: boolean;
  disabled?: boolean;
  origin?: string;
}

export interface ChangeData {
  key: string;
  mode: number; // CONST.ACTIVE_EFFECT_MODES
  value: string;
  priority?: number;
}

export interface MacroData {
  name: string;
  type: "script" | "chat";
  scope: "global" | "actors";
  command: string;
  img?: string;
}

export interface AutomationResult {
  item: FoundryItemData;
  effects: ActiveEffectData[];
  macros: MacroData[];
  flags: Record<string, any>;
  complexity: AutomationComplexity;
}

// Configuration and Template Types

export interface ParsingPattern {
  name: string;
  regex: RegExp;
  extractor: (match: RegExpMatchArray) => any;
  priority: number;
}

export interface AutomationTemplate {
  name: string;
  type: AbilityType;
  attackType?: "mwak" | "rwak" | "msak" | "rsak"; // Specific attack action type
  complexity: AutomationComplexity;
  itemTemplate: Partial<FoundryItemData>;
  effectTemplates: Partial<ActiveEffectData>[];
  flagTemplates: Record<string, any>;
  macroTemplate?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
