# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Automancy** is a TypeScript converter that transforms natural language D&D 5e homebrew ability descriptions into fully automated Foundry VTT items. Output is compatible with MidiQOL, DAE, Chris Premades, and Gambit's Premades modules.

**Current status**: v3.0 output layer rewrite complete. Parser unchanged; output layer rebuilt from scratch using verified patterns from midi-qol, DAE, chris-premades, and midi-item-showcase-community reference repos. All output passes structural validation against real Foundry items.

## Build & Run Commands

```bash
npm run build          # Compile TypeScript (tsc)
npm run dev            # Watch mode - recompile on changes
npm run clean          # Remove dist/
npm start              # Run demo (dist/index.js)
npm run cli demo       # CLI demo with 4 test cases
npm run cli convert "ability text" [name] [--output file.json]
npm run cli batch input.txt [--output output.json]
npm run cli creature statblock.txt [--output creature.json]
npm run cli capabilities   # Show supported patterns
npm run lint           # ESLint
npm test               # Jest (no test files exist yet)
```

Always `npm run build` before running - the CLI runs from `dist/`.

## Architecture

```
Text Input → TextAnalyzer (parsing) → AutomationEngine (orchestration) → Foundry JSON Output
```

### Pipeline Flow

1. **TextAnalyzer** (`src/parser/text-analyzer.ts`) parses raw text into a `ParsedAbility` struct using **PatternMatcher** (`src/parser/pattern-matcher.ts`) which has 20+ regex patterns for D&D text formats.

2. **AutomationEngine** (`src/automation/automation-engine.ts`) orchestrates the output pipeline:
   - Pre-generates IDs for effects and activities
   - Builds effects via `effect-builder.ts` (conditions, advantages, duration)
   - Builds activities via `activity-builder.ts` (attack, save, damage, heal, utility)
   - Builds flags via `flag-builder.ts` (midi-qol, DAE, chris-premades, gambits-premades)
   - Validates output via `validation.ts` (checks against allowlists from constants.ts)
   - Handles recharge, AoE templates, and conditional damage

### Module Structure (src/automation/)

```
constants.ts          -- Validated flag names, macro passes, DAE values (the allowlists)
foundry-schema.ts     -- Factory functions for complete, valid Foundry JSON templates
activity-builder.ts   -- Builds D&D5e 4.x activities (attack, save, damage, utility)
effect-builder.ts     -- Builds Active Effects with correct DAE/midi-qol flags
flag-builder.ts       -- Builds item-level flags (only real values)
macro-builder.ts      -- Builds macros for Level 2+ complexity
automation-engine.ts  -- Single orchestrator: ParsedAbility -> AutomationResult
validation.ts         -- Validates output against known-good schema
```

### Entry Points

- `AutomancyConverter` (`src/index.ts`) - Public API. Delegates to AutomationEngine.
- `AutomancyCLI` (`src/cli.ts`) - CLI interface with convert/batch/creature/demo commands.
- `CreatureConverter` (`src/creature-converter.ts`) - Full stat block -> Foundry actor conversion.

### Key Types

All in `src/types/index.ts`:
- `ParsedAbility` - Structured representation of a parsed ability
- `FoundryItemData` - Complete Foundry item schema
- `ActiveEffectData` / `ChangeData` - Effect structures
- `AbilityType` enum - weapon_attack, spell_attack, save_ability, healing, utility, passive, reaction
- `AutomationComplexity` enum - SIMPLE(1), MODERATE(2), COMPLEX(3), REACTION(4)

Creature types in `src/types/creature-types.ts`.

## Key Design Decisions

- **All constants from reference repos.** Every flag path, specialDuration, macro pass, and status string comes from `constants.ts` derived from actual reference repo source code.
- **Macros live on activities.** Real items use `activity.macroData.command`. No global macro generation.
- **reviewNotes for complex cases.** Level 3-4 abilities output `reviewNotes[]` flagging what needs manual verification.
- **Validation as a gate.** Every generated item runs through `validation.ts` before output.
- **Only standard conditions in statuses[].** Custom conditions (dazed, bleeding) get changes + descriptive flags but not fake statuses in the standard set.

## Complexity Assessment

The system rates abilities 1-4 and chooses automation strategy accordingly:
- **Level 1**: Flag-based only (simple attacks, basic bonuses)
- **Level 2**: Conditions, simple macros, conditional effects
- **Level 3**: AoE templates, recharge, multi-step workflows
- **Level 4**: Reaction-based with real-time triggers

## Module Compatibility Patterns

Generated output follows these verified module conventions:
- **MidiQOL**: Active Effect flags use CUSTOM mode (0). Macro passes from `settings.ts:1187-1216`. midiProperties block on each activity.
- **DAE**: `flags.dae.stackable` (6 valid values), `specialDuration` (6 values from `dae.ts:69-76`), `macroRepeat` (7 values).
- **Chris Premades**: `flags.chris-premades.medkit` for item hints. `flags.chris-premades.condition` for custom conditions.
- **Gambit's Premades**: `flags.gambits-premades.gpsUuid` for reaction automation.
- **Convenient Effects**: `flags.convenient-effects.isCustom` + description for custom conditions.

## Reference Files

- Real item: `fvtt-Item-agonizing-touch-EL0z1OFJwnKDnCig.json` (local, manually verified in Foundry)
- midi-qol flags: `reference/midi-qol/FLAGS.md`
- midi-qol macros: `reference/midi-qol/MACROS.md`
- midi-qol passes: `reference/midi-qol/src/module/settings.ts:1187-1216`
- DAE values: `reference/dae/src/dae.ts:69-86`, `reference/dae/src/globals.ts:73`
- Real items: `reference/midi-item-showcase-community/packData/`

## Notes

- TypeScript strict mode is enabled. All source is in `src/`, output in `dist/`.
- Foundry IDs are 16-char alphanumeric strings (generated by `generateFoundryId()` in constants.ts).
- No formal Jest test suite exists yet - manual testing via demos and test scripts.
- The `reference/` directory (gitignored) holds cloned source repos for studying patterns.
