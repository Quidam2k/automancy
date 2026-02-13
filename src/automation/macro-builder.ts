/**
 * Builds macros for Level 2+ complexity abilities.
 * Macros live on activities via activity.macroData.command.
 * No global macro generation, no hook registration.
 *
 * Reference: midi-qol MACROS.md, midi-item-showcase-community examples
 */

import { ParsedAbility, AbilityType } from '../types';
import { MacroPass } from './constants';
import { ReviewNote } from './flag-builder';

/**
 * Determine if an ability needs a macro and build it.
 * Returns the macro command string for activity.macroData.command.
 */
export function buildMacro(
  parsed: ParsedAbility,
  reviewNotes: ReviewNote[],
): string {
  // Level 1: no macros needed
  if (parsed.complexity <= 1) return '';

  // Level 2: condition application, ongoing damage
  if (parsed.complexity === 2) {
    return buildLevel2Macro(parsed, reviewNotes);
  }

  // Level 3-4: complex workflows, add review notes
  reviewNotes.push({
    severity: 'manual',
    message: 'Complex macro (Level 3+) may need manual refinement.',
  });
  return buildLevel2Macro(parsed, reviewNotes);
}

/**
 * Build a Level 2 macro for condition application and ongoing effects.
 */
function buildLevel2Macro(
  parsed: ParsedAbility,
  reviewNotes: ReviewNote[],
): string {
  const lines: string[] = [];

  // Check for ongoing damage (e.g., "takes X damage at the start of each turn")
  const ongoingDamage = findOngoingDamage(parsed);
  if (ongoingDamage) {
    lines.push(buildOngoingDamageMacro(ongoingDamage));
    reviewNotes.push({
      severity: 'info',
      message: `Ongoing damage detected: ${ongoingDamage.formula} ${ongoingDamage.type} per turn.`,
    });
  }

  // Check for escape DC (grapple)
  const escapeDC = findEscapeDC(parsed);
  if (escapeDC) {
    reviewNotes.push({
      severity: 'info',
      message: `Escape DC ${escapeDC} detected. Grappled target can use action to attempt escape.`,
    });
  }

  return lines.join('\n');
}

interface OngoingDamageInfo {
  formula: string;
  type: string;
  timing: 'start' | 'end';
}

/**
 * Find ongoing damage patterns in ability text.
 * E.g., "takes 5 (1d10) bludgeoning damage at the start of each of their turns"
 */
function findOngoingDamage(parsed: ParsedAbility): OngoingDamageInfo | null {
  const raw = parsed.raw.toLowerCase();

  // Pattern: "takes X (YdZ) type damage at the start/end of each/their turn(s)"
  const match = raw.match(
    /takes?\s+\d+\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s+(\w+)\s+damage\s+at\s+the\s+(start|end)\s+of\s+(?:each\s+of\s+)?(?:the(?:ir)?|its?)\s+turns?/
  );

  if (match) {
    return {
      formula: match[1],
      type: match[2],
      timing: match[3] as 'start' | 'end',
    };
  }

  return null;
}

/**
 * Find escape DC in ability text.
 * E.g., "grappled (escape DC 15)"
 */
function findEscapeDC(parsed: ParsedAbility): number | null {
  const match = parsed.raw.match(/escape\s+DC\s+(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

/**
 * Build OverTime flag value for ongoing damage.
 * Uses midi-qol's OverTime format for activity-based overtime.
 */
function buildOngoingDamageMacro(info: OngoingDamageInfo): string {
  // This generates the OverTime flag value string that goes into
  // an Active Effect change, not a macro command.
  // Format: turn=start/end,damageRoll=formula,damageType=type,label=Name
  return `turn=${info.timing},damageRoll=${info.formula},damageType=${info.type},label=Ongoing ${info.type} damage`;
}

/**
 * Build the onUseMacroName flag value for an item.
 * Format: "MacroReference, passType"
 */
export function buildOnUseMacroName(macroRef: string, pass: MacroPass): string {
  return `${macroRef}, ${pass}`;
}

/**
 * Determine the appropriate macro pass for a given ability.
 */
export function getRecommendedPass(parsed: ParsedAbility): MacroPass {
  if (parsed.type === AbilityType.REACTION) return 'isAttacked';
  if (parsed.saves.length > 0) return 'postSave';
  if (parsed.conditions.length > 0) return 'postActiveEffects';
  return 'postDamageRoll';
}
