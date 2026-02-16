# Known Gaps — v3.0 Post-Review

Documented 2026-02-13 after code review fixes and comparison testing.

## Resolved Issues (from code-review-2026-02-13.md)

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | CRITICAL | Attack activity missing effect refs in attack+save combos | Fixed: attack keeps plain refs (no onSave) |
| 2 | MODERATE | Save activity missing type-only damage parts | Fixed: null dice, type preserved, scaling.number: 1 |
| 3 | MODERATE | DAE item-level specialDuration always empty | Fixed: derived from condition saveEndsTiming |
| 4 | MINOR | effect-builder docstring contradicts behavior | Fixed: docstring corrected |
| 5 | MINOR | itemHint produces ". or dazed." awkward prose | Fixed: "On hit: 4d6 psychic + DC 14 WIS save or dazed." |
| 6 | MINOR | MIDI_PROPERTIES_DEFAULTS version differences | No action: matches gold standard |
| 7 | COSMETIC | Extra null fields in effect duration | Fixed: removed seconds, startRound, startTurn |
| 8 | COSMETIC | mapAbilityTypeToItemType always returns feat | Fixed: simplified to single return |

Additionally fixed: parser saveEnds detection was only matching literal "save ends" phrase.

## Remaining Known Gaps

### 1. Effect-level `turnEndSource` vs `turnEnd` (LOW)

Our effect-builder always maps `end_of_turn` to `turnEndSource` (source creature's turn end). The chris-premades Ghoul Claw reference uses `turnEnd` (target creature's turn end) on its effect. The gold standard uses `turnEndSource`. Both are valid DAE configurations but semantically different:

- `turnEnd` = effect expires at end of the **target's** turn
- `turnEndSource` = effect expires at end of the **source's** turn

For text like "until the end of **its** next turn" where "its" = the target, `turnEnd` is more semantically correct. For "until the end of **your** next turn" where "your" = the source, `turnEndSource` is correct. We currently always use `turnEndSource` to match the gold standard.

**Impact:** Minor. DAE handles both correctly; the difference is which creature's turn triggers expiry.

### 2. Conditions without explicit duration phrases (LOW)

Text like "must succeed on a DC 13 WIS save or be frightened" with NO stated duration gets `saveEnds: false`. In D&D, many frightened effects implicitly have "save ends at end of each turn" even if the text abbreviates it. Our parser only triggers managed duration when it finds explicit evidence:

- "save ends" / "repeat the saving throw"
- "until the end/start of [turn]"
- "for X minutes/rounds"

**Impact:** Some conditions that should have managed durations won't get them. The GM sees a condition applied without DAE expiry and configures manually.

**Future fix:** Could add known-condition defaults (e.g., frightened from saves defaults to "save ends each turn"), but this requires assumptions that may not match every ability.

### 3. No timed duration support (e.g., "for 1 minute") (MODERATE)

When a condition says "poisoned for 1 minute", the parser detects `saveEnds: true` (via `hasTimedDuration`), but `setEffectDuration` only sets `rounds: 100` + `specialDuration`. It doesn't set `duration.seconds: 60` or `duration.rounds: 10` for timed effects.

**Impact:** Timed conditions get the save-ends machinery but not the actual time-based duration. The DAE specialDuration may cause them to expire at the wrong time.

**Future fix:** Parse the time value and set `duration.seconds` or `duration.rounds` accordingly, instead of always using `rounds: 100`.

### 4. Condition detection regex doesn't match all phrasings (LOW)

The condition detection regex requires "be/is/becomes/are" before the condition name. This misses:
- "knocked prone" (no "be")
- "falling unconscious" (no "be")
- "rendered incapacitated" (no "be")

**Impact:** Some conditions in non-standard phrasings won't be detected.

**Future fix:** Expand the regex to include "knocked", "rendered", "falling", "left" and other preceding verbs.

### 5. Reference items use module-specific features we don't generate (INFO)

Chris-premades items have features we don't generate:
- `chris-premades.hiddenActivities` — hides activities from UI
- `chris-premades.activityIdentifiers` — maps role names to activity IDs
- `chris-premades.macros.midi.item` — references to module-specific macro functions
- `dnd5e.riders.activity` — save activity triggered automatically by attack
- `flags.midi-qol.forceCEOff` — disables Convenient Effects

These are advanced module-integration patterns. Our output focuses on the core automation (activities, effects, flags) and leaves advanced module wiring for manual configuration.

## Test Coverage

- `tests/compare-reference.js` — 14 structural checks against gold standard + Ghoul Claw reference
- `tests/test-saveends.js` — 5 tests covering saveEnds detection across patterns
- `npm start` — 3 inline demos (Flame Sword, Lightning Bolt, Bear Hug)
- `npm run cli demo` — 4 CLI demos (Flame Sword, Lightning Bolt, Dragon Slayer, Bless)
