# MidiQOL Flags Reference Guide

## Overview

MidiQOL uses a comprehensive flag system to implement conditional behaviors and automation. These flags are set via Active Effects and control various aspects of combat automation.

## Flag Syntax

Flags follow the pattern: `flags.midi-qol.category.subcategory.type`

**Important**: Flags must be set using **CUSTOM** or **OVERRIDE** mode in Active Effects. Core Foundry ignores ADD mode for undefined values, and flags are undefined until first set.

## Advantage/Disadvantage Flags

### Universal Advantage
- `flags.midi-qol.advantage.all` - Advantage on everything
- `flags.midi-qol.disadvantage.all` - Disadvantage on everything

### Attack Roll Advantage
- `flags.midi-qol.advantage.attack.all` - All attack types
- `flags.midi-qol.advantage.attack.mwak` - Melee weapon attacks
- `flags.midi-qol.advantage.attack.rwak` - Ranged weapon attacks  
- `flags.midi-qol.advantage.attack.msak` - Melee spell attacks
- `flags.midi-qol.advantage.attack.rsak` - Ranged spell attacks

### Ability-Based Attack Advantage
- `flags.midi-qol.advantage.attack.str` - STR-based attacks
- `flags.midi-qol.advantage.attack.dex` - DEX-based attacks
- Similar for `wis`, `int`, `cha`, `con`

### Ability Checks and Saves
- `flags.midi-qol.advantage.ability.all` - All saves, checks, skills
- `flags.midi-qol.advantage.ability.check.all` - All ability checks
- `flags.midi-qol.advantage.ability.save.all` - All saving throws
- `flags.midi-qol.advantage.ability.save.dex` - Dexterity saves
- `flags.midi-qol.advantage.ability.check.str` - Strength checks

### Skills
- `flags.midi-qol.advantage.skill.all` - All skills
- `flags.midi-qol.advantage.skill.per` - Perception
- `flags.midi-qol.advantage.skill.ste` - Stealth
- `flags.midi-qol.advantage.skill.ath` - Athletics
- Standard 3-letter skill abbreviations

### Special Cases
- `flags.midi-qol.advantage.deathSave` - Death saving throws
- `flags.midi-qol.advantage.concentration` - Concentration saves

## Auto-Fail Flags

Force automatic failures on rolls:
- `flags.midi-qol.fail.all` - Fail everything
- `flags.midi-qol.fail.ability.all` - Fail all ability rolls
- `flags.midi-qol.fail.spell.all` - Fail all spell casting
- `flags.midi-qol.fail.spell.vocal` - Fail spells with verbal components
- `flags.midi-qol.fail.spell.somatic` - Fail spells with somatic components

## Critical Hit Flags

### Automatic Criticals
- `flags.midi-qol.critical.all` - All attacks crit
- `flags.midi-qol.critical.mwak` - Melee weapon crits
- `flags.midi-qol.critical.rwak` - Ranged weapon crits

### Critical Immunity
- `flags.midi-qol.noCritical.all` - Immune to critical hits
- `flags.midi-qol.fail.critical.all` - Attacker cannot crit (Adamantine Armor)

### Grants Critical (When Targeted)
- `flags.midi-qol.grants.critical.all` - Attacks against this actor crit
- `flags.midi-qol.grants.criticalThreshold` - Changes crit threshold (value)

## Damage Reduction Flags

### General Damage Reduction
- `flags.midi-qol.DR.all` - Reduce all damage by value
- `flags.midi-qol.DR.fire` - Fire damage reduction
- `flags.midi-qol.DR.cold` - Cold damage reduction
- `flags.midi-qol.DR.non-magical` - Non-magical B/P/S reduction

### Attack Type Reduction
- `flags.midi-qol.DR.mwak` - Melee weapon attack reduction
- `flags.midi-qol.DR.rwak` - Ranged weapon attack reduction

Example: `flags.midi-qol.DR.fire CUSTOM 5` = 5 points fire damage reduction

## Damage Absorption Flags

Convert damage to healing:
- `flags.midi-qol.absorption.fire` - Fire damage becomes healing
- `flags.midi-qol.absorption.cold OVERRIDE 0.5` - Cold damage becomes 50% healing

## Grants Flags (Affecting Attackers)

### Attack Bonuses (When Targeted)
- `flags.midi-qol.grants.advantage.attack.all` - Attackers have advantage
- `flags.midi-qol.grants.attack.bonus.all` - Numeric bonus to hit
- `flags.midi-qol.grants.attack.success.all` - Attacks auto-succeed

### Defense Modifiers
- `flags.midi-qol.grants.disadvantage.attack.all` - Attackers have disadvantage

## Save Multiplier Flags

### Enhanced Saving
- `flags.midi-qol.superSaver.all` - Take 0.5/0 damage on fail/save
- `flags.midi-qol.superSaver.dex` - Enhanced Dex saves (Evasion)

### Magic Resistance
- `flags.midi-qol.magicResistance.all` - Advantage vs magic effects
- `flags.midi-qol.magicResistance.str` - Advantage on STR saves vs magic

## Optional Flags (Interactive Bonuses)

Optional flags prompt the user when applicable:

### Structure
- `flags.midi-qol.optional.Name.attack.all` - Attack roll bonus
- `flags.midi-qol.optional.Name.damage.mwak` - Damage bonus  
- `flags.midi-qol.optional.Name.save.dex` - Save bonus
- `flags.midi-qol.optional.Name.label` - Dialog text
- `flags.midi-qol.optional.Name.count` - Usage tracking

### Count Values
- `every` - Use every time
- `reaction` - Uses reaction  
- `turn` - Once per turn
- `3` - Numeric uses remaining
- `@resources.primary.value` - Resource consumption

### Bonus Values
- `1d4` - Dice expression
- `5` - Flat bonus
- `reroll` - Reroll the die
- `success` - Automatic success

## Concentration Flags

- `flags.midi-qol.concentrationSaveBonus` - Bonus to concentration saves
- `flags.midi-qol.advantage.concentration` - Advantage on concentration

## Min/Max Roll Flags

Force minimum/maximum die results:
- `flags.midi-qol.min.ability.save.all OVERRIDE 10` - Min 10 on saves
- `flags.midi-qol.max.ability.check.str OVERRIDE 15` - Max 15 on STR checks

## Special Combat Flags

### Movement and Positioning
- `flags.midi-qol.ignoreNearbyFoes` - Ignore ranged disadvantage
- `flags.midi-qol.sharpShooter` - Ignore long range disadvantage

### Defensive Abilities
- `flags.midi-qol.uncanny-dodge` - Halve damage when set
- `flags.midi-qol.potentCantrip` - Cantrips do half damage on save

## Conditional Flag Values

Many flags accept conditional expressions instead of just true/false:

```javascript
// Advantage vs dragons
"flags.midi-qol.advantage.attack.all": "target.details.type.value.includes('dragon')"

// Damage reduction vs undead
"flags.midi-qol.DR.all": "target.details.type.value === 'undead' ? 5 : 0"
```

### Available Variables
- `@target` - Target actor data
- `@actor` - Source actor data  
- `@item` - Item being used
- `@workflow` - Current workflow data

## Sculpt/Careful Spell Flags

### Evocation School Features
- `flags.midi-qol.sculptSpell` - Sculpt Spell (Evocation Wizard)
- `flags.midi-qol.carefulSpell` - Careful Spell (Sorcerer)

Targeted allies automatically save and take no damage (sculpt) or half damage (careful).

## Overtime Effects Flag

For damage over time or recurring effects:
```
flags.midi-qol.OverTime OVERRIDE "turn=start,damageRoll=1d4,damageType=poison,saveDC=15,saveAbility=con"
```

### Overtime Parameters
- `turn=start/end` - When to trigger
- `damageRoll=1d6` - Damage dice
- `damageType=poison` - Damage type
- `saveDC=15` - Save difficulty
- `saveAbility=con` - Save ability
- `saveRemove=true` - Remove on successful save
- `label=Poisoned` - Display name

## Usage Examples

### Barbarian Rage
```javascript
{
  key: "flags.midi-qol.advantage.ability.check.str",
  mode: 5, // OVERRIDE
  value: "1"
},
{
  key: "flags.midi-qol.DR.bludgeoning", 
  mode: 5,
  value: "floor(@classes.barbarian.levels/2) + 2"
}
```

### Magic Weapon (+1)
```javascript
{
  key: "system.attack.bonus",
  mode: 2, // ADD
  value: "1"
},
{
  key: "system.damage.parts.0.0",
  mode: 5, // OVERRIDE  
  value: "1d8 + @mod + 1"
}
```

### Adamantine Armor
```javascript
{
  key: "flags.midi-qol.fail.critical.all",
  mode: 5, // OVERRIDE
  value: "1"
}
```

## Best Practices

1. **Use OVERRIDE or CUSTOM** modes for flags
2. **Test conditional expressions** thoroughly
3. **Combine related flags** in single effects when possible
4. **Document complex expressions** with comments
5. **Consider performance** of complex conditionals
6. **Handle edge cases** gracefully
