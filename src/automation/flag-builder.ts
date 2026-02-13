/**
 * Builds item-level flags for Foundry items.
 * Only real, verified flag values from reference repos.
 */

import { ParsedAbility, AbilityType, AutomationComplexity } from '../types';

export interface ReviewNote {
  severity: 'info' | 'warning' | 'manual';
  message: string;
  field?: string;
}

/**
 * Build item-level flags from parsed ability data.
 */
export function buildFlags(
  parsed: ParsedAbility,
  reviewNotes: ReviewNote[],
): Record<string, any> {
  const flags: Record<string, any> = {};

  // midi-qol flags
  flags['midi-qol'] = buildMidiFlags(parsed);

  // DAE flags
  flags['dae'] = buildDaeFlags(parsed);

  // dnd5e flags
  flags['dnd5e'] = {
    riders: {
      activity: [],
    },
  };

  // chris-premades flags
  flags['chris-premades'] = buildChrisPremadeFlags(parsed);

  // gambits-premades flags (for reaction abilities)
  if (parsed.type === AbilityType.REACTION) {
    flags['gambits-premades'] = buildGambitFlags(parsed);
  }

  // automancy metadata
  flags['automancy'] = {
    generated: true,
    version: '3.0.0',
    complexity: parsed.complexity,
    sourceType: parsed.type,
  };

  return flags;
}

/**
 * Build midi-qol item-level flags.
 * Only flags that exist in FLAGS.md "Item Flags" section.
 */
function buildMidiFlags(parsed: ParsedAbility): Record<string, any> {
  const flags: Record<string, any> = {};

  // Attack + Save combo: need effectActivation
  if (hasAttackAndSave(parsed)) {
    flags.effectActivation = true;
    flags.forceWorkflow = true;
    flags.noDamSave = true;
    flags.saveDamage = 'nodam';
    flags.otherSaveDamage = 'nodam';
    flags.rollOtherDamage = 'none';
  }

  return flags;
}

/**
 * Build DAE item-level flags.
 */
function buildDaeFlags(parsed: ParsedAbility): Record<string, any> {
  return {
    transfer: false,
    stackable: 'noneName',
    specialDuration: [],
    macroRepeat: 'none',
  };
}

/**
 * Build chris-premades item-level flags.
 */
function buildChrisPremadeFlags(parsed: ParsedAbility): Record<string, any> {
  return {
    info: {
      name: parsed.name,
      version: '3.0.0',
    },
    medkit: {
      enable: true,
      autoApply: true,
      itemHint: generateItemHint(parsed),
    },
  };
}

/**
 * Generate a human-readable hint for the chris-premades medkit.
 */
function generateItemHint(parsed: ParsedAbility): string {
  const parts: string[] = [];

  // Attack type
  if (parsed.attackType) {
    const attackNames: Record<string, string> = {
      mwak: 'Melee weapon attack',
      rwak: 'Ranged weapon attack',
      msak: 'Melee spell attack',
      rsak: 'Ranged spell attack',
    };
    parts.push(attackNames[parsed.attackType] || 'Attack');
  }

  // Damage
  if (parsed.damage.length > 0) {
    const dmgParts = parsed.damage.map(d => `${d.formula} ${d.type}`);
    parts.push(dmgParts.join(' + '));
  }

  // Saves
  if (parsed.saves.length > 0) {
    const save = parsed.saves[0];
    parts.push(`DC ${save.dc} ${save.ability.toUpperCase()} save`);
  }

  // Conditions
  if (parsed.conditions.length > 0) {
    const condNames = parsed.conditions.map(c => c.name || c.type);
    parts.push(`or ${condNames.join(', ')}`);
  }

  return parts.join('. ') + '.';
}

/**
 * Build gambits-premades flags for reaction abilities.
 * The gpsUuid flag links to the reaction automation in gambits-premades.
 */
function buildGambitFlags(parsed: ParsedAbility): Record<string, any> {
  return {
    gpsUuid: '',  // Placeholder: set to actual UUID after import into Foundry
    reactionTrigger: parsed.activation.condition || '',
  };
}

/**
 * Check if ability has both attack and save components.
 */
function hasAttackAndSave(parsed: ParsedAbility): boolean {
  const hasAttack = parsed.type === AbilityType.WEAPON_ATTACK || parsed.type === AbilityType.SPELL_ATTACK;
  const hasSave = parsed.saves.length > 0;
  return hasAttack && hasSave;
}
