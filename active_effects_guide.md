# Active Effects Structure and Implementation

## Overview

Active Effects are the core mechanism for applying temporary or permanent modifications to actors in Foundry VTT. They work in conjunction with MidiQOL flags to create sophisticated automation behaviors.

## Active Effect Data Structure

```javascript
{
  _id: "unique-id-string",
  name: "Effect Name",
  img: "path/to/icon.png",
  origin: "uuid-of-source-item", 
  disabled: false,
  duration: {
    startTime: null,
    seconds: null,
    rounds: 10,
    turns: null,
    startRound: null,
    startTurn: null
  },
  changes: [
    {
      key: "system.attributes.ac.bonus",
      mode: 2,
      value: "2",
      priority: 20
    }
  ],
  flags: {
    "dae": {
      "specialDuration": ["turnStart", "turnEnd"],
      "transfer": false,
      "stackable": "noneName"
    },
    "midi-qol": {
      "OverTime": "turn=start,damageRoll=1d4"
    }
  },
  tint: "#ff0000",
  transfer: true,
  statuses: ["poisoned"]
}
```

## Change Modes

Active Effect changes use numbered modes that determine how values are applied:

### Mode Values
- **0 (CUSTOM)** - Apply custom logic, often used for flags
- **1 (MULTIPLY)** - Multiply existing value 
- **2 (ADD)** - Add to existing value
- **3 (DOWNGRADE)** - Keep lower value
- **4 (UPGRADE)** - Keep higher value  
- **5 (OVERRIDE)** - Replace existing value

### Common Usage Patterns
```javascript
// Add to AC
{ key: "system.attributes.ac.bonus", mode: 2, value: "2" }

// Override ability score
{ key: "system.abilities.str.value", mode: 5, value: "18" }

// Set flag (always use CUSTOM or OVERRIDE)
{ key: "flags.midi-qol.advantage.attack.all", mode: 5, value: "1" }

// Multiply speed
{ key: "system.attributes.movement.walk", mode: 1, value: "2" }
```

## System Data Paths

### Ability Scores
- `system.abilities.str.value` - Strength score
- `system.abilities.str.mod` - Strength modifier (calculated)
- `system.abilities.str.save` - Strength save bonus
- `system.abilities.str.dc` - Strength-based spell DC

### Armor Class
- `system.attributes.ac.value` - Total AC (calculated)
- `system.attributes.ac.bonus` - AC bonus
- `system.attributes.ac.flat` - Flat AC override

### Hit Points
- `system.attributes.hp.value` - Current HP
- `system.attributes.hp.max` - Maximum HP  
- `system.attributes.hp.temp` - Temporary HP
- `system.attributes.hp.bonus` - HP bonus per level

### Movement
- `system.attributes.movement.walk` - Walking speed
- `system.attributes.movement.fly` - Flying speed
- `system.attributes.movement.swim` - Swimming speed
- `system.attributes.movement.climb` - Climbing speed

### Skills
- `system.skills.per.value` - Perception modifier
- `system.skills.per.proficient` - Proficiency level (0,0.5,1,2)
- `system.skills.ste.bonus` - Stealth bonus

### Proficiency and Bonuses
- `system.attributes.prof` - Proficiency bonus
- `system.bonuses.mwak.attack` - Melee weapon attack bonus
- `system.bonuses.rwak.damage` - Ranged weapon damage bonus
- `system.bonuses.spell.dc` - Spell DC bonus

## DAE-Specific Flags

Dynamic Active Effects adds additional functionality:

### Transfer Settings
```javascript
flags: {
  "dae": {
    "transfer": true,  // Apply to actor when item equipped
    "stackable": "noneName"  // Stacking behavior
  }
}
```

### Transfer Values
- **true** - Effect transfers to actor when item equipped
- **false** - Effect stays on item only

### Stackable Values  
- **"noneName"** - Effects with same name don't stack
- **"multi"** - Multiple instances stack
- **"count"** - Track stack count

### Special Durations
```javascript
flags: {
  "dae": {
    "specialDuration": [
      "turnStart",     // Expires at start of turn
      "turnEnd",       // Expires at end of turn  
      "1Attack",       // Expires after one attack
      "1Action",       // Expires after one action
      "1Hit",          // Expires after being hit
      "isAttacked",    // Expires when attacked
      "isSave",        // Expires after making save
      "isDamaged"      // Expires when taking damage
    ]
  }
}
```

## Macro Integration

Active Effects can trigger macros at application and removal:

### Macro Execute
```javascript
{
  key: "macro.execute",
  mode: 0,
  value: "MyMacroName"
}
```

### Item Macro
```javascript  
{
  key: "macro.itemMacro",
  mode: 0,
  value: ""  // Uses macro from source item
}
```

### Macro Arguments
When executed, macros receive:
- `args[0]` - "on" when applied, "off" when removed
- `lastArg` - Contains actor, token, and effect data

## Status Effect Integration

Link to D&D 5e status conditions:

```javascript
{
  statuses: ["poisoned", "charmed", "frightened"],
  img: "systems/dnd5e/icons/conditions/poisoned.svg"
}
```

### Standard Status IDs
- `blinded`, `charmed`, `deafened`, `frightened`
- `grappled`, `incapacitated`, `invisible`, `paralyzed`
- `petrified`, `poisoned`, `prone`, `restrained`
- `stunned`, `unconscious`, `exhaustion`

## Complex Effect Examples

### Rage (Barbarian)
```javascript
{
  name: "Rage",
  duration: { rounds: 10 },
  changes: [
    {
      key: "flags.midi-qol.advantage.ability.check.str",
      mode: 5,
      value: "1"
    },
    {
      key: "flags.midi-qol.advantage.ability.save.str", 
      mode: 5,
      value: "1"
    },
    {
      key: "flags.midi-qol.DR.bludgeoning",
      mode: 5,
      value: "2"
    },
    {
      key: "flags.midi-qol.DR.piercing",
      mode: 5, 
      value: "2"
    },
    {
      key: "flags.midi-qol.DR.slashing",
      mode: 5,
      value: "2"
    },
    {
      key: "system.bonuses.mwak.damage",
      mode: 2,
      value: "2"
    }
  ],
  flags: {
    "dae": {
      "specialDuration": ["zeroHP"]
    }
  }
}
```

### Shield Spell
```javascript
{
  name: "Shield",
  duration: { rounds: 1 },
  changes: [
    {
      key: "system.attributes.ac.bonus",
      mode: 2,
      value: "5"
    }
  ],
  flags: {
    "dae": {
      "specialDuration": ["turnStart"]
    }
  }
}
```

### Poison (Damage Over Time)
```javascript
{
  name: "Poisoned",
  changes: [
    {
      key: "flags.midi-qol.disadvantage.attack.all",
      mode: 5,
      value: "1"
    },
    {
      key: "flags.midi-qol.disadvantage.ability.check.all",
      mode: 5,
      value: "1"  
    },
    {
      key: "flags.midi-qol.OverTime",
      mode: 5,
      value: "turn=start,damageRoll=1d4,damageType=poison,saveDC=13,saveAbility=con,saveRemove=true"
    }
  ],
  statuses: ["poisoned"]
}
```

### Hunter's Mark (Target Tracking)
```javascript
{
  name: "Hunter's Mark",
  duration: { seconds: 3600 }, // 1 hour
  changes: [
    {
      key: "flags.midi-qol.huntersMarkTarget",
      mode: 5,
      value: "@target" // Set during casting
    },
    {
      key: "macro.execute", 
      mode: 0,
      value: "HuntersMarkDamage"
    }
  ],
  flags: {
    "dae": {
      "transfer": false
    }
  }
}
```

## Effect Priorities

When multiple effects modify the same property, priority determines order:

### Priority Guidelines
- **10** - Equipment bonuses
- **20** - Spell effects  
- **30** - Class features
- **40** - Temporary effects
- **50** - Critical overrides

### Example with Priorities
```javascript
// Base armor (+2, priority 10)
{ key: "system.attributes.ac.bonus", mode: 2, value: "2", priority: 10 }

// Shield spell (+5, priority 20) 
{ key: "system.attributes.ac.bonus", mode: 2, value: "5", priority: 20 }

// Total AC bonus: +7
```

## Conditional Effects

Use conditional logic in effect values:

### Simple Conditionals
```javascript
{
  key: "system.bonuses.mwak.damage",
  mode: 2,
  value: "@abilities.str.mod > 3 ? 4 : 2"
}
```

### Target-Based Conditionals  
```javascript
{
  key: "flags.midi-qol.DR.all",
  mode: 5,
  value: "@target.details.type.value === 'undead' ? 5 : 0"
}
```

## Best Practices

### Organization
1. **Group related changes** in single effects when possible
2. **Use descriptive names** that match the source ability
3. **Set appropriate duration** and special duration
4. **Include status effects** for visual feedback

### Performance
1. **Avoid complex calculations** in effect values
2. **Use macros** for complex logic instead of inline expressions
3. **Set proper priorities** to avoid conflicts
4. **Test stacking behavior** thoroughly

### Compatibility
1. **Follow standard naming** conventions
2. **Use established flag patterns** from major modules
3. **Document custom flags** and their purpose
4. **Test with common module combinations**

### Debugging
1. **Enable effect debugging** in DAE settings
2. **Check console** for calculation errors
3. **Use browser dev tools** to inspect actor data
4. **Test effect application/removal** cycles

## Integration with Homebrew Converter

When building the homebrew converter:

1. **Parse ability descriptions** to identify effects
2. **Map to appropriate system paths** and flags
3. **Generate proper duration** and special duration
4. **Create consistent naming** patterns
5. **Handle edge cases** and conflicts
6. **Validate effect structure** before export
