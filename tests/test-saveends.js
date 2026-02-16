/**
 * Quick test: verify saveEnds detection for various D&D text patterns.
 * Usage: node tests/test-saveends.js
 */
const { AutomancyConverter } = require('../dist/index');
const c = new AutomancyConverter();

const tests = [
  {
    name: 'Prone from save (no duration)',
    text: 'Tail. Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 2d8 + 4 bludgeoning damage. The target must succeed on a DC 14 Strength saving throw or be prone.',
    expectCondition: 'prone',
    expectSaveEnds: false, // no duration phrase = no managed duration (stand up with movement)
    expectRounds: null,
  },
  {
    name: 'Dazed until end of turn',
    text: 'Agonizing Touch. Melee Spell Attack: +7 to hit, reach 5 ft., one target. Hit: 4d6 psychic damage, and the target must succeed on a DC 14 Wisdom saving throw or be dazed until the end of its next turn.',
    expectCondition: 'dazed',
    expectSaveEnds: true,
    expectRounds: 100,
  },
  {
    name: 'Paralyzed with repeat save',
    text: 'Claw. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 1d4 + 2 slashing damage. The target must succeed on a DC 10 Constitution saving throw or be paralyzed for 2 rounds. At the end of each of its turns, the target can repeat the saving throw.',
    expectCondition: 'paralyzed',
    expectSaveEnds: true,
    expectRounds: 100,
  },
  {
    name: 'Frightened (no explicit duration)',
    text: 'Horrifying Visage. Each creature within 60 feet that can see the creature must succeed on a DC 13 Wisdom saving throw or be frightened.',
    expectCondition: 'frightened',
    expectSaveEnds: false, // no duration phrase = no managed duration (needs review note)
    expectRounds: null,
  },
  {
    name: 'Grappled from attack (no save)',
    text: 'Tentacle. Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 2d6 + 4 bludgeoning damage, and the target is grappled (escape DC 16).',
    expectCondition: 'grappled',
    expectSaveEnds: false, // no save DC pattern, no duration
    expectRounds: null,
  },
];

let pass = 0;
let fail = 0;

for (const t of tests) {
  const r = c.convertAbility(t.text, t.name);
  const eff = r.foundryItem && r.foundryItem.effects && r.foundryItem.effects.find(
    e => e.statuses && e.statuses.includes(t.expectCondition)
  );

  const rounds = eff ? eff.duration.rounds : null;
  const condFound = !!eff;

  console.log(`\n${t.name}:`);
  if (!condFound) {
    console.log(`  Condition "${t.expectCondition}" NOT DETECTED (${r.foundryItem ? r.foundryItem.effects.length : 0} effects total)`);
    // Check if the condition was even detected by parser
    const parsed = r.original.parsed;
    if (parsed) {
      console.log(`  Parser conditions: ${JSON.stringify(parsed.conditions.map(c => c.type))}`);
      if (parsed.conditions.length > 0) {
        console.log(`  saveEnds: ${parsed.conditions[0].saveEnds}, timing: ${parsed.conditions[0].saveEndsTiming}`);
      }
    }
  } else {
    const saveEnds = r.original.parsed.conditions.find(c => c.type === t.expectCondition);
    console.log(`  Condition found: ${t.expectCondition}`);
    console.log(`  saveEnds=${saveEnds ? saveEnds.saveEnds : '?'}, duration.rounds=${rounds}`);
    console.log(`  DAE specialDuration: ${JSON.stringify(eff.flags.dae.specialDuration)}`);

    if (rounds === t.expectRounds) {
      console.log(`  [+] PASS: rounds=${rounds} (expected ${t.expectRounds})`);
      pass++;
    } else {
      console.log(`  [-] FAIL: rounds=${rounds} (expected ${t.expectRounds})`);
      fail++;
    }
  }
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${pass} pass, ${fail} fail`);
