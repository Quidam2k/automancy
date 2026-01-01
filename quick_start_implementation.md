# Quick Start Implementation Guide

## Project Overview

Build a system that converts natural language D&D homebrew ability descriptions into fully automated Foundry VTT items compatible with MidiQOL, Chris Premades, and Gambit's Premades automation modules.

## Key Files Reference

1. **01-foundry-automation-overview.md** - Understanding the ecosystem
2. **02-midiqol-flags-reference.md** - Complete flag system documentation  
3. **03-active-effects-structure.md** - Effect creation and management
4. **04-macro-development-integration.md** - Complex automation via macros
5. **05-foundry-item-data-structure.md** - Foundry item schema and formatting
6. **06-automation-examples-patterns.md** - Real-world automation examples
7. **07-system-architecture-implementation.md** - Complete system design

## Minimum Viable Product (MVP)

### Input
Natural language ability descriptions like:
```
"Flame Sword: Melee Weapon Attack: +7 to hit, reach 5 ft., one target. 
Hit: 8 (1d8 + 4) slashing damage plus 4 (1d4) fire damage."
```

### Output
Complete Foundry VTT item JSON with:
- Proper item structure
- MidiQOL automation flags
- Active Effects for persistent changes
- Macros for complex logic (when needed)

## Core Implementation Steps

### Step 1: Text Parser
Create regex patterns for common ability components:

```typescript
const PATTERNS = {
  ATTACK: /(?:Melee|Ranged) (?:Weapon|Spell) Attack: \+(\d+) to hit/i,
  DAMAGE: /(\d+) \((\d+d\d+(?:\s*\+\s*\d+)?)\) (\w+) damage/gi,
  SAVE: /DC (\d+) (\w+) (?:saving throw|save)/gi,
  RANGE: /range (\d+)(?:\/(\d+))? (?:ft|feet)/i,
  // Add more patterns from documentation
};
```

### Step 2: Automation Rules Engine
Map parsed components to Foundry structures:

```typescript
function generateAutomation(parsed: ParsedAbility): FoundryItem {
  const item = createBaseItem(parsed);
  
  // Add attack data
  if (parsed.attack) {
    item.system.actionType = parsed.attack.type; // "mwak", "rwak", etc.
    item.system.attackBonus = parsed.attack.bonus;
  }
  
  // Add damage data
  if (parsed.damage.length > 0) {
    item.system.damage.parts = parsed.damage.map(d => [d.formula, d.type]);
  }
  
  // Add saves
  if (parsed.save) {
    item.system.save = {
      ability: parsed.save.ability,
      dc: parsed.save.dc,
      scaling: "flat"
    };
  }
  
  return item;
}
```

### Step 3: Flag Generation
Apply appropriate MidiQOL flags:

```typescript
function generateFlags(parsed: ParsedAbility): Record<string, any> {
  const flags: Record<string, any> = {};
  
  // Conditional damage
  if (parsed.conditions.includes("vs_undead")) {
    flags["flags.midi-qol.itemCondition"] = "['undead'].includes('@target.details.type.value')";
  }
  
  // Advantage conditions
  if (parsed.conditions.includes("advantage_stealth")) {
    flags["flags.midi-qol.advantage.skill.ste"] = "1";
  }
  
  return flags;
}
```

### Step 4: Effect Generation
Create Active Effects for persistent changes:

```typescript
function generateEffects(parsed: ParsedAbility): ActiveEffect[] {
  const effects: ActiveEffect[] = [];
  
  // AC bonuses
  if (parsed.effects.acBonus) {
    effects.push({
      name: `${parsed.name} AC Bonus`,
      changes: [{
        key: "system.attributes.ac.bonus",
        mode: 2, // ADD
        value: parsed.effects.acBonus.toString()
      }]
    });
  }
  
  // Status conditions
  if (parsed.effects.conditions.length > 0) {
    parsed.effects.conditions.forEach(condition => {
      effects.push(createConditionEffect(condition, parsed.duration));
    });
  }
  
  return effects;
}
```

### Step 5: Output Generation
Format as importable Foundry data:

```typescript
function generateFoundryItem(automation: AutomationResult): FoundryItemData {
  return {
    _id: foundry.utils.randomID(),
    name: automation.name,
    type: automation.type,
    img: getAppropriateIcon(automation.type),
    system: automation.systemData,
    effects: automation.effects,
    flags: automation.flags,
    folder: null,
    sort: 0,
    ownership: { default: 0 }
  };
}
```

## Priority Implementation Order

### Phase 1: Basic Automation (Week 1)
- [ ] Attack roll parsing (+X to hit)
- [ ] Damage parsing (XdY + Z damage)
- [ ] Basic item creation (weapon, spell, feat)
- [ ] Simple MidiQOL flags (advantage, disadvantage)
- [ ] Export as JSON

### Phase 2: Intermediate Features (Week 2)
- [ ] Save-based abilities (DC X Save)
- [ ] Active Effects generation
- [ ] Condition application (poisoned, charmed, etc.)
- [ ] Duration parsing (rounds, minutes, hours)
- [ ] Resource consumption (uses per rest)

### Phase 3: Advanced Automation (Week 3)
- [ ] Conditional effects ("vs undead", "if bloodied")
- [ ] Area of effect abilities
- [ ] Simple macro generation
- [ ] Aura effects
- [ ] Multi-step abilities

### Phase 4: Complex Systems (Week 4)
- [ ] Reaction-based abilities
- [ ] Complex macro logic
- [ ] Resource management
- [ ] Integration with existing modules
- [ ] Batch processing

## Test Cases for Validation

### Simple Attack
```
Input: "Longsword: Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage."
Expected: Weapon item with +5 attack, 1d8+4 slashing damage
```

### Save-Based Spell
```
Input: "Lightning Bolt: DC 15 Dex save, 60-foot line. 28 (8d6) lightning damage, half on save."
Expected: Spell with save, damage, and area template
```

### Conditional Ability
```
Input: "Dragon Slayer: +1 attack and damage rolls. Against dragons, +3d6 extra damage."
Expected: Weapon with conditional bonus vs dragons
```

### Buff/Debuff
```
Input: "Bless: Target gains +1d4 to attack rolls and saves for 1 minute."
Expected: Spell that applies beneficial effect
```

## Quick Integration with Existing Modules

### MidiQOL Compatibility
- Use established flag patterns from `02-midiqol-flags-reference.md`
- Follow timing conventions (preAttackRoll, postDamageRoll, etc.)
- Handle workflow integration properly

### Chris Premades Integration
- Generate items compatible with "Medkit" system
- Use standard naming conventions
- Include appropriate descriptions and metadata

### Gambit's Premades Compatibility
- Support reaction triggers
- Use compatible effect structures
- Handle timing conflicts gracefully

## Success Metrics

1. **Accuracy**: Generated items work as intended in Foundry
2. **Compatibility**: No conflicts with major automation modules  
3. **Coverage**: Handles 80%+ of common homebrew patterns
4. **Usability**: Non-technical users can generate working automation
5. **Performance**: Processes abilities in <5 seconds

## Development Tools & Testing

### Required Software
- Node.js + TypeScript development environment
- Foundry VTT test instance
- MidiQOL, DAE, Chris Premades modules installed

### Testing Approach
1. **Unit tests** for each parsing pattern
2. **Integration tests** with real Foundry data
3. **User acceptance tests** with actual homebrew content
4. **Compatibility tests** with module combinations

### Debug Tools
- JSON validator for Foundry schema
- MidiQOL flag validator
- Effect change mode validator
- Macro syntax checker

## Getting Started Checklist

- [ ] Set up development environment
- [ ] Install test Foundry instance with automation modules
- [ ] Create basic parser for attack patterns
- [ ] Implement simple item generation
- [ ] Test with basic weapon attack
- [ ] Iterate and expand patterns
- [ ] Add Active Effects support
- [ ] Implement macro generation for complex cases
- [ ] Build validation and export system
- [ ] Create user interface (CLI or web)

This quick start guide provides the essential roadmap for implementing a functional homebrew automation converter. Refer to the detailed documentation files for specific implementation patterns and examples.
