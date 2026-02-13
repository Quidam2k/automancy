/**
 * Validates generated Foundry items against known-good schema.
 * Every item passes through validation before output.
 */

import { FoundryItemData, ActiveEffectData, ValidationResult } from '../types';
import {
  ACTIVITY_TYPES,
  DAMAGE_TYPES,
  ABILITIES,
  DAE_SPECIAL_DURATIONS,
  DAE_MACRO_REPEATS,
  DAE_STACKABLE_VALUES,
  STANDARD_CONDITIONS,
  ACTIVATION_TYPES,
} from './constants';

/**
 * Validate a complete Foundry item.
 */
export function validateItem(item: FoundryItemData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required top-level fields
  if (!item._id || item._id.length !== 16) {
    errors.push(`Invalid _id: must be 16 characters, got "${item._id}"`);
  }
  if (!item.name) {
    errors.push('Missing item name');
  }
  if (!item.type) {
    errors.push('Missing item type');
  }

  // System block
  if (!item.system) {
    errors.push('Missing system block');
  } else {
    // Validate activities
    if (item.system.activities) {
      for (const [actId, activity] of Object.entries(item.system.activities)) {
        validateActivity(actId, activity as Record<string, any>, errors, warnings);
      }
    }
  }

  // Validate effects
  if (item.effects) {
    for (const effect of item.effects) {
      validateEffect(effect, errors, warnings);
    }
  }

  // Validate cross-references: effect IDs in activities must exist
  if (item.system?.activities && item.effects) {
    const effectIds = new Set(item.effects.map(e => e._id));
    for (const [actId, activity] of Object.entries(item.system.activities)) {
      const act = activity as Record<string, any>;
      if (act.effects) {
        for (const effectRef of act.effects) {
          if (effectRef._id && !effectIds.has(effectRef._id)) {
            errors.push(`Activity ${actId} references non-existent effect ${effectRef._id}`);
          }
        }
      }
    }
  }

  // Validate flags
  if (item.flags) {
    validateItemFlags(item.flags, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateActivity(
  actId: string,
  activity: Record<string, any>,
  errors: string[],
  warnings: string[],
): void {
  // Must have _id matching key
  if (activity._id !== actId) {
    errors.push(`Activity _id "${activity._id}" doesn't match key "${actId}"`);
  }

  // Must have valid type
  if (!activity.type || !(ACTIVITY_TYPES as readonly string[]).includes(activity.type)) {
    errors.push(`Activity ${actId}: invalid type "${activity.type}"`);
  }

  // Must have activation
  if (!activity.activation) {
    errors.push(`Activity ${actId}: missing activation block`);
  } else if (activity.activation.type && !(ACTIVATION_TYPES as readonly string[]).includes(activity.activation.type)) {
    warnings.push(`Activity ${actId}: unusual activation type "${activity.activation.type}"`);
  }

  // Must have midiProperties
  if (!activity.midiProperties) {
    errors.push(`Activity ${actId}: missing midiProperties block`);
  }

  // Must have macroData
  if (!activity.macroData) {
    errors.push(`Activity ${actId}: missing macroData block`);
  }

  // Must have ignoreTraits
  if (!activity.ignoreTraits) {
    errors.push(`Activity ${actId}: missing ignoreTraits block`);
  }

  // Validate damage parts if present
  if (activity.damage?.parts) {
    for (let i = 0; i < activity.damage.parts.length; i++) {
      const part = activity.damage.parts[i];
      validateDamagePart(actId, i, part, errors, warnings);
    }
  }

  // Validate save if present
  if (activity.type === 'save' && activity.save) {
    if (activity.save.ability) {
      for (const abl of activity.save.ability) {
        if (!(ABILITIES as readonly string[]).includes(abl)) {
          errors.push(`Activity ${actId}: invalid save ability "${abl}"`);
        }
      }
    }
  }

  // Validate attack if present
  if (activity.type === 'attack' && activity.attack) {
    if (activity.attack.type) {
      const validValues = ['melee', 'ranged'];
      const validClassifications = ['weapon', 'spell'];
      if (activity.attack.type.value && !validValues.includes(activity.attack.type.value)) {
        errors.push(`Activity ${actId}: invalid attack.type.value "${activity.attack.type.value}"`);
      }
      if (activity.attack.type.classification && !validClassifications.includes(activity.attack.type.classification)) {
        errors.push(`Activity ${actId}: invalid attack.type.classification "${activity.attack.type.classification}"`);
      }
    }
  }
}

function validateDamagePart(
  actId: string,
  index: number,
  part: Record<string, any>,
  errors: string[],
  warnings: string[],
): void {
  // Must have correct structure
  if (!('number' in part) || !('denomination' in part) || !('bonus' in part) || !('types' in part)) {
    errors.push(`Activity ${actId} damage part ${index}: missing required fields (number, denomination, bonus, types)`);
    return;
  }

  // Must have custom block
  if (!part.custom || !('enabled' in part.custom)) {
    errors.push(`Activity ${actId} damage part ${index}: missing custom block`);
  }

  // Must have scaling block
  if (!part.scaling) {
    errors.push(`Activity ${actId} damage part ${index}: missing scaling block`);
  }

  // Validate damage types
  if (part.types) {
    for (const dt of part.types) {
      if (!(DAMAGE_TYPES as readonly string[]).includes(dt)) {
        warnings.push(`Activity ${actId} damage part ${index}: unusual damage type "${dt}"`);
      }
    }
  }
}

function validateEffect(
  effect: ActiveEffectData,
  errors: string[],
  warnings: string[],
): void {
  if (!effect._id || effect._id.length !== 16) {
    errors.push(`Effect "${effect.name}": invalid _id`);
  }

  if (!effect.name) {
    errors.push('Effect missing name');
  }

  // Validate changes
  if (effect.changes) {
    for (const change of effect.changes) {
      if (!change.key) {
        errors.push(`Effect "${effect.name}": change missing key`);
      }
      if (change.mode === undefined || change.mode === null) {
        errors.push(`Effect "${effect.name}": change missing mode`);
      }
    }
  }

  // Validate DAE flags if present
  if (effect.flags?.dae) {
    const dae = effect.flags.dae;

    if (dae.specialDuration) {
      for (const sd of dae.specialDuration) {
        if (!(DAE_SPECIAL_DURATIONS as readonly string[]).includes(sd)) {
          errors.push(`Effect "${effect.name}": invalid specialDuration "${sd}"`);
        }
      }
    }

    if (dae.macroRepeat && !(DAE_MACRO_REPEATS as readonly string[]).includes(dae.macroRepeat)) {
      errors.push(`Effect "${effect.name}": invalid macroRepeat "${dae.macroRepeat}"`);
    }

    if (dae.stackable && !(DAE_STACKABLE_VALUES as readonly string[]).includes(dae.stackable)) {
      errors.push(`Effect "${effect.name}": invalid stackable "${dae.stackable}"`);
    }
  }
}

function validateItemFlags(
  flags: Record<string, any>,
  warnings: string[],
): void {
  // Check for known fabricated flags
  const knownBadFlags = [
    'midi-qol.rollAttackPerTarget',  // This is an activity midiProperty, not an item flag
    'midi-qol.damageType',           // Not a real flag
  ];

  for (const badFlag of knownBadFlags) {
    const [ns, key] = badFlag.split('.');
    if (flags[ns] && key in flags[ns]) {
      warnings.push(`Item flag "${badFlag}" may not be valid - verify against FLAGS.md`);
    }
  }
}
