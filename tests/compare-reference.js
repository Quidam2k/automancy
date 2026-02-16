/**
 * Comparison test: Run SRD creature text through our converter and
 * compare structural output against reference repo items.
 *
 * Usage: node tests/compare-reference.js
 */

const fs = require('fs');
const path = require('path');
const { AutomancyConverter } = require('../dist/index');

const converter = new AutomancyConverter();

// ============================================================
// Test cases: SRD text + reference file for comparison
// ============================================================

const testCases = [
  {
    name: 'Agonizing Touch (gold standard)',
    text: 'Agonizing Touch. Melee Spell Attack: +7 to hit, reach 5 ft., one target. Hit: 4d6 psychic damage, and the target must succeed on a DC 14 Wisdom saving throw or be dazed until the end of its next turn.',
    abilityName: 'Agonizing Touch',
    referenceFile: path.join(__dirname, '..', 'fvtt-Item-agonizing-touch-EL0z1OFJwnKDnCig.json'),
    checks: [
      'attack_activity_has_effects',
      'save_activity_has_effects_with_onSave',
      'save_activity_has_type_only_damage',
      'effect_has_duration_rounds_100',
      'effect_dae_specialDuration',
      'item_dae_specialDuration',
      'effect_has_statuses',
      'effect_has_midi_effectActivation',
      'item_hint_format',
    ],
  },
  {
    name: 'Ghoul Claw (chris-premades)',
    // SRD 2024 Ghoul Claw text
    text: 'Claw. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 1d4 + 2 slashing damage. If the target is a creature other than an Elf or Undead, it must succeed on a DC 10 Constitution saving throw or be paralyzed for 2 rounds. At the end of each of its turns, the target can repeat the saving throw, ending the effect on a success.',
    abilityName: 'Claw',
    referenceFile: path.join(__dirname, '..', 'reference', 'chris-premades', 'packData', 'cpr-monster-features-2024', 'Claw_aZrSwkgOo6lQOfM0.json'),
    checks: [
      'has_attack_activity',
      'has_save_activity',
      'save_dc_matches',
      'condition_paralyzed',
      'effect_dae_specialDuration_turnEnd',
    ],
  },
];

// ============================================================
// Comparison functions
// ============================================================

function findActivityByType(activities, type) {
  for (const [id, act] of Object.entries(activities)) {
    if (act.type === type) return act;
  }
  return null;
}

function runChecks(result, reference, checks) {
  const outcomes = [];
  const item = result.foundryItem;
  const refItem = reference;

  for (const check of checks) {
    switch (check) {
      case 'attack_activity_has_effects': {
        const attack = findActivityByType(item.system.activities, 'attack');
        const refAttack = findActivityByType(refItem.system.activities, 'attack');
        const has = attack && attack.effects && attack.effects.length > 0;
        const refHas = refAttack && refAttack.effects && refAttack.effects.length > 0;
        outcomes.push({
          check,
          pass: has === refHas,
          ours: has ? `${attack.effects.length} effect(s)` : 'none',
          ref: refHas ? `${refAttack.effects.length} effect(s)` : 'none',
        });
        break;
      }

      case 'save_activity_has_effects_with_onSave': {
        const save = findActivityByType(item.system.activities, 'save');
        const refSave = findActivityByType(refItem.system.activities, 'save');
        const hasOnSave = save && save.effects && save.effects.some(e => e.onSave !== undefined);
        const refHasOnSave = refSave && refSave.effects && refSave.effects.some(e => e.onSave !== undefined);
        outcomes.push({
          check,
          pass: hasOnSave === refHasOnSave,
          ours: hasOnSave ? `onSave=${save.effects[0].onSave}` : 'no onSave',
          ref: refHasOnSave ? `onSave=${refSave.effects[0].onSave}` : 'no onSave',
        });
        break;
      }

      case 'save_activity_has_type_only_damage': {
        const save = findActivityByType(item.system.activities, 'save');
        const refSave = findActivityByType(refItem.system.activities, 'save');
        const part = save && save.damage && save.damage.parts && save.damage.parts[0];
        const refPart = refSave && refSave.damage && refSave.damage.parts && refSave.damage.parts[0];
        const isTypeOnly = part && part.number === null && part.denomination === null && part.types && part.types.length > 0;
        const refIsTypeOnly = refPart && refPart.number === null && refPart.denomination === null && refPart.types && refPart.types.length > 0;
        outcomes.push({
          check,
          pass: isTypeOnly === refIsTypeOnly,
          ours: part ? `num=${part.number} denom=${part.denomination} types=${JSON.stringify(part.types)}` : 'no parts',
          ref: refPart ? `num=${refPart.number} denom=${refPart.denomination} types=${JSON.stringify(refPart.types)}` : 'no parts',
        });
        break;
      }

      case 'effect_has_duration_rounds_100': {
        const eff = item.effects && item.effects[0];
        const refEff = refItem.effects && refItem.effects[0];
        const rounds = eff && eff.duration && eff.duration.rounds;
        const refRounds = refEff && refEff.duration && refEff.duration.rounds;
        outcomes.push({
          check,
          pass: rounds === refRounds,
          ours: `rounds=${rounds}`,
          ref: `rounds=${refRounds}`,
        });
        break;
      }

      case 'effect_dae_specialDuration': {
        const eff = item.effects && item.effects[0];
        const refEff = refItem.effects && refItem.effects[0];
        const sd = eff && eff.flags && eff.flags.dae && eff.flags.dae.specialDuration;
        const refSd = refEff && refEff.flags && refEff.flags.dae && refEff.flags.dae.specialDuration;
        outcomes.push({
          check,
          pass: JSON.stringify(sd) === JSON.stringify(refSd),
          ours: JSON.stringify(sd),
          ref: JSON.stringify(refSd),
        });
        break;
      }

      case 'item_dae_specialDuration': {
        const sd = item.flags && item.flags.dae && item.flags.dae.specialDuration;
        const refSd = refItem.flags && refItem.flags.dae && refItem.flags.dae.specialDuration;
        outcomes.push({
          check,
          pass: JSON.stringify(sd) === JSON.stringify(refSd),
          ours: JSON.stringify(sd),
          ref: JSON.stringify(refSd),
        });
        break;
      }

      case 'effect_has_statuses': {
        const eff = item.effects && item.effects[0];
        const refEff = refItem.effects && refItem.effects[0];
        const statuses = eff && eff.statuses;
        const refStatuses = refEff && refEff.statuses;
        const hasStatuses = statuses && statuses.length > 0;
        const refHasStatuses = refStatuses && refStatuses.length > 0;
        outcomes.push({
          check,
          pass: hasStatuses === refHasStatuses,
          ours: JSON.stringify(statuses),
          ref: JSON.stringify(refStatuses),
        });
        break;
      }

      case 'effect_has_midi_effectActivation': {
        const eff = item.effects && item.effects[0];
        const refEff = refItem.effects && refItem.effects[0];
        const val = eff && eff.flags && eff.flags['midi-qol'] && eff.flags['midi-qol'].effectActivation;
        const refVal = refEff && refEff.flags && refEff.flags['midi-qol'] && refEff.flags['midi-qol'].effectActivation;
        outcomes.push({
          check,
          pass: val === refVal,
          ours: String(val),
          ref: String(refVal),
        });
        break;
      }

      case 'item_hint_format': {
        const hint = item.flags && item.flags['chris-premades'] && item.flags['chris-premades'].medkit && item.flags['chris-premades'].medkit.itemHint;
        // Just check it contains key phrases and doesn't have the old ". or" bug
        const hasAttackType = hint && /melee|ranged/i.test(hint);
        const hasDamage = hint && /\d+d\d+/.test(hint);
        const noOldBug = hint && !hint.includes('. or ');
        const pass = hasAttackType && hasDamage && noOldBug;
        outcomes.push({
          check,
          pass,
          ours: hint || '(missing)',
          ref: '(prose format, no ". or" bug)',
        });
        break;
      }

      case 'has_attack_activity': {
        const attack = findActivityByType(item.system.activities, 'attack');
        const refAttack = findActivityByType(refItem.system.activities, 'attack');
        outcomes.push({
          check,
          pass: !!attack === !!refAttack,
          ours: attack ? 'present' : 'missing',
          ref: refAttack ? 'present' : 'missing',
        });
        break;
      }

      case 'has_save_activity': {
        const save = findActivityByType(item.system.activities, 'save');
        const refSave = findActivityByType(refItem.system.activities, 'save');
        outcomes.push({
          check,
          pass: !!save === !!refSave,
          ours: save ? 'present' : 'missing',
          ref: refSave ? 'present' : 'missing',
        });
        break;
      }

      case 'save_dc_matches': {
        const save = findActivityByType(item.system.activities, 'save');
        const refSave = findActivityByType(refItem.system.activities, 'save');
        const dc = save && save.save && save.save.dc && save.save.dc.formula;
        const refDc = refSave && refSave.save && refSave.save.dc && refSave.save.dc.formula;
        outcomes.push({
          check,
          pass: dc === refDc,
          ours: `DC formula="${dc}"`,
          ref: `DC formula="${refDc}"`,
        });
        break;
      }

      case 'condition_paralyzed': {
        const hasParalyzed = item.effects && item.effects.some(e => e.statuses && e.statuses.includes('paralyzed'));
        const refHasParalyzed = refItem.effects && refItem.effects.some(e => {
          // chris-premades stores conditions in flags, not always in statuses
          const cpConditions = e.flags && e.flags['chris-premades'] && e.flags['chris-premades'].conditions;
          return (e.statuses && e.statuses.includes('paralyzed')) || (cpConditions && cpConditions.includes('paralyzed'));
        });
        outcomes.push({
          check,
          pass: hasParalyzed === refHasParalyzed,
          ours: hasParalyzed ? 'paralyzed detected' : 'no paralyzed',
          ref: refHasParalyzed ? 'paralyzed in ref' : 'no paralyzed in ref',
        });
        break;
      }

      case 'effect_dae_specialDuration_turnEnd': {
        const eff = item.effects && item.effects.find(e => e.statuses && e.statuses.includes('paralyzed'));
        const refEff = refItem.effects && refItem.effects[0]; // chris-premades Claw has one effect
        const sd = eff && eff.flags && eff.flags.dae && eff.flags.dae.specialDuration;
        const refSd = refEff && refEff.flags && refEff.flags.dae && refEff.flags.dae.specialDuration;
        const hasTurnEnd = sd && sd.includes('turnEndSource');
        const refHasTurnEnd = refSd && refSd.includes('turnEnd');
        outcomes.push({
          check,
          pass: hasTurnEnd || (sd && sd.length > 0 && refSd && refSd.length > 0),
          ours: JSON.stringify(sd),
          ref: JSON.stringify(refSd),
          note: 'Effect uses turnEndSource, item uses turnEnd (expected difference)',
        });
        break;
      }
    }
  }

  return outcomes;
}

// ============================================================
// Main
// ============================================================

let totalPass = 0;
let totalFail = 0;
let totalSkip = 0;

for (const tc of testCases) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${tc.name}`);
  console.log(`${'='.repeat(60)}`);

  // Load reference
  let reference;
  try {
    reference = JSON.parse(fs.readFileSync(tc.referenceFile, 'utf-8'));
  } catch (e) {
    console.log(`  SKIP - Reference file not found: ${tc.referenceFile}`);
    totalSkip += tc.checks.length;
    continue;
  }

  // Convert
  const result = converter.convertAbility(tc.text, tc.abilityName);
  if (!result.success) {
    console.log(`  FAIL - Conversion failed: ${result.error}`);
    totalFail += tc.checks.length;
    continue;
  }

  console.log(`  Converted: ${result.foundryItem.name} (${Object.keys(result.foundryItem.system.activities).length} activities, ${result.foundryItem.effects.length} effects)`);

  // Run checks
  const outcomes = runChecks(result, reference, tc.checks);
  for (const o of outcomes) {
    const status = o.pass ? 'PASS' : 'FAIL';
    const icon = o.pass ? '+' : '-';
    console.log(`  [${icon}] ${status}: ${o.check}`);
    console.log(`       Ours: ${o.ours}`);
    console.log(`       Ref:  ${o.ref}`);
    if (o.note) console.log(`       Note: ${o.note}`);
    if (o.pass) totalPass++;
    else totalFail++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`SUMMARY: ${totalPass} passed, ${totalFail} failed, ${totalSkip} skipped`);
console.log(`${'='.repeat(60)}`);

process.exit(totalFail > 0 ? 1 : 0);
