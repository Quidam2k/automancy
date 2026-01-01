# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Foundry VTT D&D 5e automation system** focused on converting homebrew ability descriptions into fully automated items compatible with MidiQOL, Chris Premades, and Gambit's Premades. The project contains documentation and implementation guides for building a parser that converts natural language homebrew abilities into working Foundry VTT automation.

## Architecture

The system follows a three-phase architecture:

```
Input Parser → Automation Engine → Output Generator
```

- **Input Parser**: Analyzes homebrew text using regex patterns to extract structured data (attacks, damage, saves, conditions, etc.)
- **Automation Engine**: Maps parsed data to Foundry structures using complexity assessment and rule-based generation
- **Output Generator**: Creates complete Foundry JSON items with MidiQOL flags, Active Effects, and macros

## Key Files and Their Purpose

### Core Documentation Files
- `system_architecture_implementation.md` - Complete system design with TypeScript interfaces and implementation patterns
- `foundry_automation_overview.md` - Understanding the Foundry VTT automation ecosystem
- `quick_start_implementation.md` - MVP implementation guide with test cases
- `macro_integration_guide.md` - Advanced macro development patterns for complex automation
- `repository_reference_guide.md` - Instructions for cloning and studying reference repositories

### Reference Documentation
- `midiqol_flags_reference.md` - Complete MidiQOL flag system documentation
- `active_effects_guide.md` - Active Effects structure and implementation
- `item_data_structure.md` - Foundry item schema and formatting requirements
- `automation_examples.md` - Real-world automation examples and patterns

## Development Approach

### Implementation Phases
1. **Phase 1 (MVP)**: Basic text parsing, simple automation flags, JSON export
2. **Phase 2**: Active Effects, conditions, duration parsing, resource consumption  
3. **Phase 3**: Conditional effects, area abilities, macro generation
4. **Phase 4**: Reactions, complex macros, module integration

### Complexity Assessment
The system uses a 4-level complexity assessment:
- **Level 1**: Flag-based automation only (basic attacks, simple bonuses)
- **Level 2**: Simple macros and conditional effects
- **Level 3**: Advanced macros with multi-step workflows
- **Level 4**: Reaction-based automation with real-time triggers

## Key Patterns to Follow

### Text Parsing Patterns
```typescript
const PATTERNS = {
  WEAPON_ATTACK: /(?:Melee|Ranged) Weapon Attack: \+(\d+) to hit/i,
  DAMAGE: /(\d+) \((\d+d\d+(?:\s*\+\s*\d+)?)\) (\w+) damage/gi,
  SAVE_DC: /DC (\d+) (\w+) (?:saving throw|save)/gi,
  DURATION_ROUNDS: /(?:for|lasts?) (\d+) rounds?/i
};
```

### Automation Generation
- Use MidiQOL flags for simple behaviors (`flags.midi-qol.advantage.attack.all`)
- Generate Active Effects for persistent changes (AC bonuses, ability modifiers)
- Create macros only for Level 2+ complexity (conditional logic, resource consumption)
- Follow established timing conventions (preAttackRoll, postDamageRoll, etc.)

### Module Compatibility
- **MidiQOL**: Core automation engine - use established flag patterns
- **DAE**: Enhanced Active Effects - follow transfer and duration patterns  
- **Chris Premades**: Use compatible naming conventions and "Medkit" integration
- **Gambit's Premades**: Support reaction triggers and timing systems

## Testing and Validation

### Required Test Environment
- Foundry VTT instance with D&D 5e system
- MidiQOL, DAE, Chris Premades, Gambit's Premades modules installed
- Test world with sample actors and items

### Validation Checklist
- Generated JSON validates against Foundry schema
- MidiQOL flags follow established patterns
- Active Effects use correct modes and priorities
- Macros handle errors gracefully
- Items integrate with existing automation modules

## Reference Repositories

The project references these external repositories for implementation patterns:
- `reference/midi-qol/` - Core automation engine source
- `reference/chris-premades/` - Professional automation examples
- `reference/gambits-premades/` - Advanced reaction systems
- `reference/dae/` - Enhanced Active Effects implementation

## Development Notes

- This is a **documentation and design project** - no executable code exists yet
- Implementation should be in TypeScript for type safety
- Focus on compatibility with existing automation ecosystem
- Prioritize accuracy and reliability over feature completeness
- Use established patterns from successful automation modules

## Common Automation Examples

### Basic Weapon Attack
```
Input: "Longsword: Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage."
Output: Weapon item with +5 attack bonus, 1d8+4 slashing damage
```

### Save-Based Spell  
```
Input: "Lightning Bolt: DC 15 Dex save, 60-foot line. 28 (8d6) lightning damage, half on save."
Output: Spell with save DC, damage, area template, and half-damage on success
```

### Conditional Ability
```
Input: "Dragon Slayer: +1 attack and damage rolls. Against dragons, +3d6 extra damage."
Output: Weapon with conditional bonus flags targeting dragon creature type
```

The system aims to handle 80%+ of common homebrew patterns while maintaining compatibility with the established Foundry VTT automation ecosystem.