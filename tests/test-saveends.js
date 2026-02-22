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
    expectRounds: 2,
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
  {
    name: 'Poisoned for 1 minute (timed duration)',
    text: 'Poison Breath (Recharge 5-6). The creature exhales a 30-foot cone of poisonous gas. Each creature in the area must make a DC 11 Constitution saving throw, taking 5d8 poison damage on a failed save, or half as much on a successful one. A creature that fails is also poisoned for 1 minute.',
    expectCondition: 'poisoned',
    expectSaveEnds: true,
    expectSeconds: 60,
    expectRounds: null, // should use seconds, not rounds
  },
  {
    name: 'Frightened for 1 hour',
    text: 'Terrifying Roar. Each creature within 30 feet must succeed on a DC 15 Wisdom saving throw or be frightened for 1 hour.',
    expectCondition: 'frightened',
    expectSaveEnds: true,
    expectSeconds: 3600,
    expectRounds: null,
  },
  {
    name: 'Stunned for 2 rounds',
    text: 'Psychic Blast. The target must succeed on a DC 14 Intelligence saving throw or be stunned for 2 rounds.',
    expectCondition: 'stunned',
    expectSaveEnds: true,
    expectSeconds: null,
    expectRounds: 2,
  },
];

let pass = 0;
let fail = 0;

for (const t of tests) {
  const r = c.convertAbility(t.text, t.name);
  const eff = r.foundryItem && r.foundryItem.effects && r.foundryItem.effects.find(
    e => e.statuses && e.statuses.includes(t.expectCondition)
  );

  const rounds = eff ? (eff.duration.rounds || null) : null;
  const seconds = eff ? (eff.duration.seconds || null) : null;
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
    console.log(`  saveEnds=${saveEnds ? saveEnds.saveEnds : '?'}, duration.rounds=${rounds}, duration.seconds=${seconds}`);
    console.log(`  DAE specialDuration: ${JSON.stringify(eff.flags.dae.specialDuration)}`);
    if (saveEnds && saveEnds.timedDuration) {
      console.log(`  timedDuration: ${JSON.stringify(saveEnds.timedDuration)}`);
    }

    // Check seconds if expected
    const expectSeconds = t.expectSeconds !== undefined ? t.expectSeconds : null;
    const roundsOk = rounds === t.expectRounds;
    const secondsOk = expectSeconds === null ? true : seconds === expectSeconds;

    if (roundsOk && secondsOk) {
      console.log(`  [+] PASS: rounds=${rounds} seconds=${seconds} (expected rounds=${t.expectRounds} seconds=${expectSeconds})`);
      pass++;
    } else {
      console.log(`  [-] FAIL: rounds=${rounds} seconds=${seconds} (expected rounds=${t.expectRounds} seconds=${expectSeconds})`);
      fail++;
    }
  }
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${pass} pass, ${fail} fail`);
