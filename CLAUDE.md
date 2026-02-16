# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Automancy** is a TypeScript converter that transforms natural language D&D 5e homebrew ability descriptions into fully automated Foundry VTT items. Output is compatible with MidiQOL, DAE, Chris Premades, and Gambit's Premades modules.

**Current status**: v3.0 output layer rewrite complete (commit `7b87a20`). The parser (`src/parser/`) was left untouched; the entire `src/automation/` directory and `src/phase2-converter.ts` were deleted and rebuilt from scratch using verified patterns from reference repositories. All output passes structural validation against real Foundry items (the gold standard is `fvtt-Item-agonizing-touch-EL0z1OFJwnKDnCig.json`).

## Build & Run Commands

```bash
npm run build          # Compile TypeScript (tsc) -- MUST run before any CLI usage
npm run dev            # Watch mode - recompile on changes
npm run clean          # Remove dist/
npm start              # Run demo (dist/index.js) -- 3 test abilities
npm run cli demo       # CLI demo with 4 test cases (Flame Sword, Lightning Bolt, Dragon Slayer, Bless)
npm run cli convert "ability text" [name] [--output file.json]
npm run cli batch input.txt [--output output.json]
npm run cli creature statblock.txt [--output creature.json]
npm run cli capabilities   # Show supported patterns
npm run lint           # ESLint
npm test               # Jest (no test files exist yet)
```

Always `npm run build` before running -- the CLI runs from `dist/`.

## Architecture

```
Text Input --> TextAnalyzer (parsing) --> AutomationEngine (output) --> Foundry JSON
```

### Pipeline Flow

1. **TextAnalyzer** (`src/parser/text-analyzer.ts`) parses raw text into a `ParsedAbility` struct using **PatternMatcher** (`src/parser/pattern-matcher.ts`) which has 20+ regex patterns for D&D text formats.

2. **AutomationEngine** (`src/automation/automation-engine.ts`) orchestrates the output pipeline:
   - Pre-generates IDs for effects and activities (so activities can reference effect IDs)
   - Builds effects via `effect-builder.ts` (conditions, advantages, duration)
   - Builds activities via `activity-builder.ts` (attack, save, damage, heal, utility)
   - Builds item-level flags via `flag-builder.ts` (midi-qol, DAE, chris-premades, gambits-premades)
   - Assembles the item (recharge, per-day/per-rest uses, AoE templates)
   - Handles conditional damage bonuses
   - Validates output via `validation.ts` (checks against allowlists from constants.ts)
   - Returns `AutomationEngineResult` with reviewNotes for anything needing manual attention

### Source Files

```
src/
  index.ts                 -- Public API: AutomancyConverter class
  cli.ts                   -- CLI with convert/batch/creature/demo/capabilities commands
  creature-converter.ts    -- Full stat block -> Foundry actor + items conversion
  types/
    index.ts               -- All core types (ParsedAbility, FoundryItemData, ActiveEffectData, etc.)
    creature-types.ts      -- CreatureDescription, FoundryActorData, etc.
  parser/
    text-analyzer.ts       -- TextAnalyzer: raw text -> ParsedAbility
    pattern-matcher.ts     -- PatternMatcher: 20+ regex patterns for D&D formats
  automation/
    constants.ts           -- Central allowlists: macro passes, DAE values, conditions, damage types
    foundry-schema.ts      -- Factory functions: createBaseItem, createBaseActivity, createBaseEffect, createDamagePart
    activity-builder.ts    -- Builds D&D5e 4.x activities (attack, save, damage, heal, utility)
    effect-builder.ts      -- Builds Active Effects with correct DAE/midi-qol flag changes
    flag-builder.ts        -- Builds item-level flags (midi-qol, DAE, chris-premades, gambits)
    macro-builder.ts       -- Level 2+ macro support (ongoing damage, escape DC, OverTime)
    automation-engine.ts   -- Single orchestrator: ParsedAbility -> AutomationEngineResult
    validation.ts          -- Validates output against known-good schema and allowlists
```

### Key Types (src/types/index.ts)

- `ParsedAbility` -- Structured representation of a parsed ability (output of TextAnalyzer)
- `FoundryItemData` -- Complete Foundry item with `_id`, `name`, `type`, `system`, `effects[]`, `flags`
- `ActiveEffectData` / `ChangeData` -- Effect structures with changes, duration, flags, statuses
- `AbilityType` enum -- weapon_attack, spell_attack, save_ability, healing, utility, passive, reaction
- `AutomationComplexity` enum -- SIMPLE(1), MODERATE(2), COMPLEX(3), REACTION(4)
- `ValidationResult` -- `{valid, errors[], warnings[]}`

### Entry Points

- `AutomancyConverter` (`src/index.ts`) -- Public API. Wraps TextAnalyzer + AutomationEngine.
- `AutomancyCLI` (`src/cli.ts`) -- CLI interface with convert/batch/creature/demo commands.
- `CreatureConverter` (`src/creature-converter.ts`) -- Parses stat block text, generates Foundry actor, converts each ability section (traits, actions, bonus actions, reactions, legendary actions) via AutomancyConverter.

## Key Design Decisions

- **All constants from reference repos.** Every flag path, specialDuration, macro pass, and status string comes from `constants.ts` derived from actual reference repo source code. No other module generates string literals.
- **Macros live on activities.** Real items use `activity.macroData.command` for inline code. No global macro generation, no hook registration, no `window.*` exports.
- **reviewNotes for complex cases.** Level 3-4 abilities output `reviewNotes[]` flagging what needs manual verification.
- **Validation as a gate.** Every generated item runs through `validation.ts` before output. Catches missing fields, invalid flag paths, mismatched IDs.
- **Both standard and custom conditions in statuses[].** All conditions (including custom ones like dazed) get `statuses[]` entries for icon display. Custom conditions additionally get chris-premades + convenient-effects flags.
- **Pre-generated IDs.** Effect and activity IDs are generated before building either, so activities can reference effects by ID.
- **Attack+save combo pattern.** For abilities with both attack and save (like Agonizing Touch), both activities reference effects — attack gets plain refs (no `onSave`), save gets refs with `onSave: false`. The attack activity gets full damage parts; the save activity gets type-only damage parts (null dice, type preserved, `scaling.number: 1`).

## Module Compatibility Details

Generated output follows these verified module conventions:

### MidiQOL
- Item-level flags at `flags['midi-qol']`: only `onUseMacroName`, `effectActivation`, `forceWorkflow`, `noDamSave`, `rollOtherDamage`, `saveDamage`, `otherSaveDamage`, `syntheticItem` (see `VALID_MIDI_ITEM_FLAGS` in constants.ts)
- Active Effect changes use CUSTOM mode (0) for midi-qol flag paths like `flags.midi-qol.disadvantage.attack.all`
- `midiProperties` block on every activity (~20 fields, defaults in `MIDI_PROPERTIES_DEFAULTS`)
- 28 macro passes from `settings.ts:1187-1216` (preTargeting through all)
- Effect-level flag: `flags['midi-qol'].effectActivation = 'failedSave'`

### DAE
- `flags.dae.stackable` -- 6 valid values: noneName, noneNameOnly, none, multi, count, countDeleteDecrement
- `flags.dae.specialDuration` -- 6 values: turnStart, turnEnd, turnStartSource, turnEndSource, combatEnd, joinCombat
- `flags.dae.macroRepeat` -- 7 values: none, startEveryTurn, endEveryTurn, startEndEveryTurn, startEveryTurnAny, endEveryTurnAny, startEndEveryTurnAny
- `flags.dae.transfer` -- boolean

### Chris Premades
- `flags['chris-premades'].info` -- name, version
- `flags['chris-premades'].medkit` -- enable, autoApply, itemHint (auto-generated description)
- `flags['chris-premades'].condition` -- for custom conditions on effects

### Gambit's Premades
- `flags['gambits-premades'].gpsUuid` -- placeholder for reaction automation UUID (set after Foundry import)
- `flags['gambits-premades'].reactionTrigger` -- from parsed activation condition

### Convenient Effects
- `flags['convenient-effects'].isCustom` -- true for custom conditions
- `flags['convenient-effects'].description` -- human-readable condition description

## Foundry VTT D&D5e 4.x Activity Schema

Activities are stored at `item.system.activities` as a keyed object where keys are 16-char IDs.

Each activity has:
- `_id`, `type` (attack/save/damage/heal/utility/check)
- `activation` -- type (action/bonus/reaction/legendary/lair), value, condition
- `consumption`, `duration`, `range`, `target` (template + affects)
- `effects[]` -- array of `{_id, level, onSave?}` referencing the item's effects
- `damage.parts[]` -- each part: `{number, denomination, bonus, types[], custom: {enabled, formula}, scaling: {mode, number, formula}}`
- `midiProperties` -- ~20 fields controlling midi-qol behavior
- `macroData` -- `{name, command}` for inline macros
- `ignoreTraits` -- `{idi, idr, idv, ida, idm}` booleans
- `overTimeProperties` -- `{saveRemoves, preRemoveConditionText, postRemoveConditionText}`
- Attack-specific: `attack.type.value` (melee/ranged), `attack.type.classification` (weapon/spell), `attack.bonus`, `attack.flat`
- Save-specific: `save.ability` (string array), `save.dc.calculation`, `save.dc.formula`, `damage.onSave` (half/none/full)

## Standard Condition Changes (effect-builder.ts)

The effect builder maps standard D&D 5e conditions to midi-qol flag changes:
- **Prone**: grants advantage melee attacks, grants disadvantage ranged attacks, disadvantage on own attacks
- **Grappled**: movement speed 0 (OVERRIDE mode)
- **Restrained**: speed 0, disadvantage attacks, grants advantage attacks, disadvantage dex saves
- **Blinded**: disadvantage attacks, grants advantage attacks
- **Frightened**: disadvantage attacks, disadvantage ability checks
- **Paralyzed**: auto-fail str/dex saves, grants advantage attacks, grants crits within 5ft
- **Stunned**: auto-fail str/dex saves, grants advantage attacks
- **Poisoned**: disadvantage attacks, disadvantage ability checks
- **Invisible**: advantage on attacks, grants disadvantage on attacks
- **Petrified**: grants advantage attacks, auto-fail str/dex saves
- **Charmed/Deafened/Exhaustion/Unconscious/Incapacitated**: handled by Foundry system natively

## Reference Files

- **Gold standard item**: `fvtt-Item-agonizing-touch-EL0z1OFJwnKDnCig.json` (local, manually verified in Foundry -- has attack+save activities, dazed effect, complete midiProperties, DAE flags)
- midi-qol flags: `reference/midi-qol/FLAGS.md` (1596 lines)
- midi-qol macros: `reference/midi-qol/MACROS.md`
- midi-qol passes: `reference/midi-qol/src/module/settings.ts:1187-1216`
- DAE values: `reference/dae/src/dae.ts:69-86`, `reference/dae/src/globals.ts:73`
- Real items: `reference/midi-item-showcase-community/packData/` (Dagger of Venom, Flame Tongue, Deflect Missiles, Tasha's Mind Whip)
- Chris premades items: `reference/chris-premades/packData/`

## Testing Status

- **CLI demo**: 4/4 test abilities convert successfully (Flame Sword, Lightning Bolt, Dragon Slayer, Bless)
- **`npm start`**: 3 inline test cases pass (Flame Sword, Lightning Bolt, Bear Hug)
- **Creature converter**: Tested with MCDM Owlbear stat block, all 6 abilities convert
- **Validation**: All generated items pass `validation.ts` with zero errors
- **No Jest test suite yet** -- only manual testing via demos and CLI commands

## Legacy Docs (may be outdated)

These markdown files in the project root were written before the v3.0 rewrite and reference the old Phase 2 pipeline that no longer exists. They may contain useful background on Foundry VTT concepts but their code references are stale:
- `PHASE2_INTEGRATION_LOG.md`, `PHASE2_VALIDATION_REPORT.md` -- Phase 2 system that was deleted
- `system_architecture_implementation.md` -- references old 8-subsystem pipeline
- `RESUME_NOTES.md`, `daily_session_log.md` -- session notes from before the rewrite
- `midiqol_flags_reference.md`, `active_effects_guide.md`, `item_data_structure.md`, `automation_examples.md`, `macro_integration_guide.md` -- reference material, partially still relevant but now superseded by constants.ts and the reference repos
- `repository_reference_guide.md`, `quick_start_implementation.md`, `foundry_automation_overview.md` -- background docs

## Notes

- TypeScript strict mode is enabled. All source is in `src/`, output in `dist/`.
- Foundry IDs are 16-char alphanumeric strings (generated by `generateFoundryId()` in constants.ts).
- The `reference/` directory (gitignored) holds cloned source repos for studying patterns. Clone script: `setup-reference-repos.sh`.
- `creature-converter.ts` has its own `generateFoundryId()` function (duplicate of the one in constants.ts).
