# Automancy Session Resume Notes

## Last Updated: 2025-12-21

## Current Status: WORKING

The system is now generating valid Foundry VTT items with proper D&D5e 4.x activities structure. Both single ability conversion and full creature stat block conversion are functional.

---

## What Works

### Single Ability Conversion
```bash
npx ts-node src/cli.ts convert "Agonizing Touch. Melee Spell Attack: +6 to hit..." "Agonizing Touch" --output output.json
```

### Full Creature Stat Block Conversion
```bash
npx ts-node src/cli.ts creature wraith.txt --output wraith-complete.json
```

---

## Key Fixes Implemented This Session

### 1. Effect ID Mismatch Fix (CRITICAL)
**Problem:** Dazed effect wasn't being applied because effect IDs in activities didn't match effect IDs in the effects array.

**Root Cause:** The base `effect-generator.ts` didn't include MCDM conditions (dazed, bleeding, weakened, slowed) in its `mapConditionToStatus` function. When it couldn't map "dazed", it returned `null` instead of creating the effect. The Phase 2 condition-engine then created a new effect with a different ID.

**Fix:** Updated `src/automation/effect-generator.ts`:
- Added MCDM conditions to `mapConditionToStatus` (lines 303-307)
- Added dazed condition changes to `getConditionChanges` (lines 369-383)
- Updated `createConditionEffect` to include proper flags for MCDM conditions (chris-premades, convenient-effects, automancy)
- Added MCDM condition icons to `getConditionIcon` (lines 473-477)

### 2. Activation Type Detection Fix
**Problem:** "bonus action" appearing in the Dazed description was incorrectly detected as the ability's activation type.

**Fix:** Updated `src/parser/text-analyzer.ts` to only consider "bonus action" matches within the first 50 characters of text (line 173).

### 3. Save-Ends Timing Detection Fix
**Problem:** "save ends at end of turn" wasn't being detected correctly.

**Fix:** Updated pattern in `text-analyzer.ts` (line 390) to handle various phrasings like "at end of turn", "end of their turn", etc.

### 4. Creature Converter Overhaul
**Problem:** The creature converter was splitting abilities incorrectly and not detecting section headers.

**Fixes to `src/creature-converter.ts`:**
- Complete rewrite of `parseStatBlock` to handle MCDM format (lines 58-169)
- Added `parseAbilityScores` for vertical ability score format (lines 172-199)
- Added `parseSpeed`, `parseSenses` helper methods
- Added `extractSections` to detect Actions/Reactions/etc. headers (lines 265-331)
- Added `parseAbilitiesFromText` to keep complete ability descriptions together (lines 334-381)
- Added `setActivationType` to set activation in D&D5e 4.x activities structure (lines 532-543)
- Fixed `convertAbilities` to handle all section types (actions, reactions, bonus actions, legendary actions)

### 5. CLI Save Function Fix
**Problem:** Saving creature output failed because `saveResult` tried to access `result.foundryItem`.

**Fix:** Updated `src/cli.ts` line 263 to handle both single items and creature packages.

---

## D&D5e 4.x Activities Structure

The key architectural insight is that D&D5e 4.x uses `system.activities` instead of top-level `actionType`, `damage`, `save` fields:

```json
{
  "system": {
    "activities": {
      "dnd5eactivity000": {
        "_id": "dnd5eactivity000",
        "type": "attack",
        "activation": { "type": "action" },
        "damage": { "parts": [...] },
        "effects": [{ "_id": "EFFECT_ID_HERE" }]
      },
      "dnd5eactivity100": {
        "_id": "dnd5eactivity100",
        "type": "save",
        "activation": { "type": "action" },
        "damage": { "onSave": "none", "parts": [] },
        "save": { "ability": ["wis"], "dc": { "formula": "14" } },
        "effects": [{ "_id": "EFFECT_ID_HERE", "onSave": false }]
      }
    }
  },
  "effects": [
    { "_id": "EFFECT_ID_HERE", "name": "...", "statuses": ["dazed"] }
  ]
}
```

**Critical:** The `_id` in `effects` array MUST match the `_id` referenced in `activities[].effects[]`.

---

## Test Files

- `wraith.txt` - Full MCDM Wraith stat block for testing creature converter
- `wraith-complete.json` - Generated output with actor + 5 items
- `agonizing-touch-v8.json` - Latest single ability output
- `fvtt-Item-agonizing-touch-EL0z1OFJwnKDnCig.json` - Reference working item

---

## Known Remaining Issues

1. **Ability names include attack type** - e.g., "Agonizing Touch. Melee Spell Attack" instead of just "Agonizing Touch". Minor cosmetic issue.

2. **Specter summoning not automated** - The "Humanoid dies within 1 minute" spawning effect isn't automated.

3. **HP Max reduction on failed saves** - The cumulative HP max halving on failed saves is documented in the effect flags but not fully automated with a working macro.

---

## Quick Test Commands

```bash
# Single ability
npx ts-node src/cli.ts convert "Melee Spell Attack: +6 to hit, reach 5 ft., one creature. Hit: 4d6 psychic damage. DC 14 WIS save or be dazed (save ends at end of turn)." "Agonizing Touch"

# Full creature
npx ts-node src/cli.ts creature wraith.txt --output wraith-complete.json

# Check TypeScript compiles
npx tsc --noEmit
```

---

## File Structure

```
src/
├── cli.ts                    # CLI entry point
├── index.ts                  # AutomancyConverter main class
├── phase2-converter.ts       # Phase 2 enhancement pipeline
├── creature-converter.ts     # Full creature stat block conversion
├── parser/
│   ├── text-analyzer.ts      # Text parsing and pattern extraction
│   └── pattern-matcher.ts    # Regex patterns for D&D text
├── automation/
│   ├── rule-engine.ts        # Core automation generation with D&D5e 4.x activities
│   ├── effect-generator.ts   # Active Effect generation (MCDM conditions added)
│   ├── flag-generator.ts     # MidiQOL flag generation
│   ├── condition-engine.ts   # Phase 2 condition processing
│   └── ...                   # Other Phase 2 systems
└── types/
    ├── index.ts              # Core type definitions
    └── creature-types.ts     # Creature-specific types
```
