// Extended types for full creature automation
import { FoundryItemData, ActiveEffectData } from './index';

export interface CreatureDescription {
  name: string;
  type: string;
  size: string;
  alignment: string;
  
  // Core stats
  armorClass: number;
  hitPoints: number;
  hitDie: string;
  speed: Record<string, number>;
  
  // Ability scores
  abilities: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  
  // Skills and proficiencies
  skills?: Record<string, number>;
  savingThrows?: Record<string, number>;
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: string[];
  senses?: Record<string, number>;
  languages?: string[];
  
  // Challenge and XP
  challengeRating: string;
  experiencePoints: number;
  proficiencyBonus: number;
  
  // Abilities
  traits?: string[];
  actions?: string[];
  bonusActions?: string[];
  reactions?: string[];
  legendaryActions?: string[];
  
  // Raw text for parsing
  rawDescription?: string;
}

export interface FoundryActorData {
  _id: string;
  name: string;
  type: "npc";
  img: string;
  system: {
    abilities: Record<string, { value: number; proficient: number; bonuses: { check: string; save: string } }>;
    attributes: {
      ac: { flat: number; calc: string; formula: string };
      hp: { value: number; max: number; temp: number; tempmax: number; formula: string };
      movement: Record<string, number>;
      senses: Record<string, number>;
      spellcasting: string;
      prof: number;
    };
    details: {
      biography: { value: string; public: string };
      alignment: string;
      race: string;
      type: { value: string; subtype: string; swarm: string; custom: string };
      environment: string;
      cr: number;
      spellLevel: number;
      xp: { value: number };
      source: string;
    };
    skills: Record<string, { value: number; ability: string; bonuses: { check: string; passive: string } }>;
    traits: {
      size: string;
      di: { value: string[]; custom: string };
      dr: { value: string[]; custom: string };
      dv: { value: string[]; custom: string };
      ci: { value: string[]; custom: string };
      languages: { value: string[]; custom: string };
    };
    currency: Record<string, number>;
    spells: Record<string, any>;
    bonuses: Record<string, any>;
    resources: {
      legact: { value: number; max: number };
      legres: { value: number; max: number };
      lair: { value: boolean; initiative: number };
    };
  };
  effects: ActiveEffectData[];
  items: FoundryItemData[];
  flags: Record<string, any>;
  folder: string | null;
  sort: number;
  ownership: Record<string, number>;
}

export interface CreatureAutomationResult {
  actor: FoundryActorData;
  items: FoundryItemData[];
  effects: ActiveEffectData[];
  macros: any[];
}