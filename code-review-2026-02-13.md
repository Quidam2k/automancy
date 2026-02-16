# v3.0 Output Layer Code Review — 2026-02-13

## Summary

Reviewed all 8 files in `src/automation/` against the gold standard (`fvtt-Item-agonizing-touch-EL0z1OFJwnKDnCig.json`) and reference repos (midi-qol, DAE, chris-premades, midi-item-showcase-community). Build succeeds, all 4 CLI demo items and 3 inline demos convert and validate cleanly. The rewrite is structurally solid — activity schema, midiProperties, damage parts, effect changes, and module flags all match reference items closely.

## Issues

### 1. CRITICAL — Attack+save combo: effect references missing from attack activity

**File:** `automation-engine.ts:161-163`

The code strips effect IDs from the attack activity for attack+save combos:
```ts
const attackContext = parsed.saves.length > 0
  ? { ...context, effectIds: [] }
  : context;
```

The gold standard has the dazed effect referenced on **both** activities:
- Attack activity: `effects: [{_id: "Kp8HgC7trgk3iiKI", level: {}}]` — no `onSave` field
- Save activity: `effects: [{_id: "Kp8HgC7trgk3iiKI", onSave: false, level: {min: null, max: null}}]`

**Note:** Dagger of Venom (2024) has `effects: []` on its attack activity, so there is variation across items. But the project's chosen gold standard clearly has effects on both.

The CLAUDE.md claim that "attack activity gets damage parts but no effect references" is incorrect vs the gold standard.

### 2. MODERATE — Save activity should have type-only damage part

**File:** `automation-engine.ts:172`

The code creates `{ ...parsed, damage: [] }` for the save, stripping all damage. The gold standard's save activity has a damage part with null dice but the damage type populated:
```json
{"number": null, "denomination": null, "bonus": "", "types": ["psychic"], "scaling": {"number": 1}}
```

This tells midi-qol what damage type is associated with the save. Note `scaling.number` is `1` (not `null`) in the reference.

### 3. MODERATE — DAE item-level `specialDuration` always empty

**File:** `flag-builder.ts:78-85`

`buildDaeFlags` returns hardcoded defaults with `specialDuration: []`. The gold standard has `specialDuration: ["turnEnd"]` at the item level. Should be derived from parsed ability condition timing.

### 4. MINOR — Custom condition docstring contradicts behavior

**File:** `effect-builder.ts:4, 79`

Module docstring says custom conditions don't get fake statuses, but line 79 adds `effect.statuses = [condition.type]`. The behavior matches the gold standard (`statuses: ["dazed"]`), so the code is correct — the docstring is misleading.

### 5. MINOR — `itemHint` formatting produces awkward prose

**File:** `flag-builder.ts:107-140`

`generateItemHint` produces: `"Melee spell attack. 4d6 psychic. DC 14 WIS save. or dazed."` — note the ". or dazed." pattern. Gold standard: `"Melee spell attack. On hit: 4d6 psychic + DC 14 WIS save or dazed."`

### 6. MINOR — `MIDI_PROPERTIES_DEFAULTS` version-specific differences

**File:** `constants.ts:192-219`

Newer reference items (Dagger of Venom 2024) have slight variations in which midiProperties fields are present. Current defaults match the gold standard, which is fine.

### 7. COSMETIC — Extra null fields on effect duration

**File:** `foundry-schema.ts:287-295`

`createBaseEffect` includes `seconds`, `startRound`, `startTurn` fields the gold standard doesn't have. Not harmful but adds bulk.

### 8. COSMETIC — `mapAbilityTypeToItemType` always returns `'feat'`

**File:** `automation-engine.ts:404-422`

Every branch returns `'feat'`. Could be simplified or expanded with actual mapping logic.

## What's Correct

- Activity schema (activation, consumption, duration, range, target, uses) — exact match
- midiProperties (~20 fields, correct defaults)
- macroData, ignoreTraits, overTimeProperties on every activity
- Attack type classification (msak -> melee/spell)
- Save DC format (ability as string array, formula as string)
- Damage parts format (number, denomination, bonus, types, custom, scaling)
- Effect changes for dazed (flags.midi-qol.dazed mode 5, macro.tokenMagic mode 0)
- DAE effect flags (stackable, specialDuration, macroRepeat, transfer)
- midi-qol effect flags (effectActivation: 'failedSave')
- chris-premades / convenient-effects custom condition flags
- Item-level midi-qol flags (effectActivation, forceWorkflow, noDamSave, rollOtherDamage, saveDamage, otherSaveDamage)
- All 15 standard condition changes with correct midi-qol flag paths
- Paralyzed critical: `checkNearby(-1, targetUuid, 5)`
- Validation (missing fields, invalid IDs, bad DAE values, cross-reference mismatches)
- AoE template detection (line, cone, sphere, cube, cylinder)
- Recharge mechanics format
- Pre-generated IDs for cross-references

## Reference Items Consulted

- `fvtt-Item-agonizing-touch-EL0z1OFJwnKDnCig.json` (gold standard, manually verified)
- `reference/midi-item-showcase-community/packData/misc-items-2024/Dagger_of_Venom_1hOW9TyUpORw6Z6i.json`
- `reference/midi-qol/FLAGS.md`
- `reference/midi-qol/src/module/settings.ts`
- `reference/dae/src/dae.ts`, `reference/dae/src/globals.ts`
