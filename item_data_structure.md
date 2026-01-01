# Foundry VTT Item Data Structure Guide

## Overview

Foundry VTT items use a specific JSON schema that integrates with the D&D 5e system and automation modules. Understanding this structure is crucial for generating compatible automated items.

## Base Item Structure

```javascript
{
  _id: "unique-item-id",
  name: "Item Name",
  type: "spell", // feat, weapon, equipment, etc.
  img: "path/to/icon.png",
  system: {
    // D&D 5e specific data
  },
  effects: [
    // Active Effects array
  ],
  flags: {
    // Module-specific data
  },
  folder: null,
  sort: 0,
  ownership: {
    default: 0
  }
}
```

## Item Types

### Common Item Types
- **weapon** - Weapons and natural attacks
- **spell** - Spells and cantrips
- **feat** - Class features, racial traits, feats
- **equipment** - Armor, shields, items
- **consumable** - Potions, scrolls, ammunition
- **tool** - Tools and instruments
- **loot** - Generic items and treasure
- **class** - Class definitions
- **subclass** - Subclass definitions
- **race** - Race definitions

## System Data by Item Type

### Spell System Data
```javascript
{
  type: "spell",
  system: {
    description: {
      value: "<p>Spell description HTML</p>",
      chat: "<p>Chat description</p>",
      unidentified: ""
    },
    source: "Player's Handbook",
    activation: {
      type: "action",        // action, bonus, reaction, minute, hour
      cost: 1,              // Number of activation units
      condition: ""         // Special activation conditions
    },
    duration: {
      value: 10,           // Duration amount
      units: "minute"      // inst, round, minute, hour, day
    },
    target: {
      value: 1,           // Number of targets
      width: null,        // Area width
      units: "",          // ft, mi, self, touch
      type: "creature"    // creature, object, space, radius, sphere, etc.
    },
    range: {
      value: 120,         // Range in feet
      long: null,         // Long range (weapons)
      units: "ft"         // self, touch, ft, mi
    },
    uses: {
      value: null,        // Uses per rest
      max: "",           // Max uses formula
      per: null,         // sr, lr, charges
      recovery: ""       // Recovery formula
    },
    consume: {
      type: "",          // ammo, attribute, hitDie, material, charges
      target: "",        // Target resource path
      amount: null       // Amount consumed
    },
    ability: "",         // Spellcasting ability
    actionType: "save",  // mwak, rwak, msak, rsak, save, heal, abil, util
    attackBonus: "",     // Attack bonus formula
    chatFlavor: "",      // Additional chat text
    critical: {
      threshold: null,   // Critical threshold
      damage: ""         // Extra critical damage
    },
    damage: {
      parts: [           // Damage parts array
        ["2d6", "fire"], // [formula, type]
        ["1d4", "force"]
      ],
      versatile: ""      // Versatile damage formula
    },
    formula: "",         // Other formula (healing, etc.)
    save: {
      ability: "dex",    // Save ability
      dc: null,          // Save DC (null = spellcasting DC)
      scaling: "spell"   // spell, flat
    },
    school: "evo",       // Magic school abbreviation
    components: {
      value: "",         // Components string
      vocal: true,       // Verbal component
      somatic: false,    // Somatic component  
      material: true,    // Material component
      ritual: false,     // Can be cast as ritual
      concentration: false // Requires concentration
    },
    materials: {
      value: "A small crystal bead",
      consumed: false,   // Material consumed
      cost: 0,          // GP cost
      supply: 0         // Supply count
    },
    preparation: {
      mode: "prepared",  // prepared, pact, always, atwill, innate
      prepared: false    // Currently prepared
    },
    scaling: {
      mode: "spell",     // spell, cantrip, level
      formula: "1d6"     // Additional damage per level
    },
    level: 3,            // Spell level
    properties: []       // Additional properties
  }
}
```

### Weapon System Data
```javascript
{
  type: "weapon",
  system: {
    description: { /* same as spell */ },
    source: "",
    quantity: 1,
    weight: 3,
    price: {
      value: 15,
      denomination: "gp"
    },
    attunement: 0,       // 0=none, 1=required, 2=attuned
    equipped: false,
    rarity: "",
    identified: true,
    activation: {
      type: "action",
      cost: 1,
      condition: ""
    },
    duration: {
      value: null,
      units: "inst"
    },
    target: {
      value: 1,
      width: null,
      units: "",
      type: "creature"
    },
    range: {
      value: 5,          // Reach for melee
      long: null,
      units: "ft"
    },
    uses: { /* same as spell */ },
    consume: { /* same as spell */ },
    ability: "str",      // Attack ability
    actionType: "mwak",  // mwak, rwak
    attackBonus: "",
    chatFlavor: "",
    critical: {
      threshold: null,
      damage: ""
    },
    damage: {
      parts: [["1d8 + @mod", "slashing"]],
      versatile: "1d10 + @mod"
    },
    formula: "",
    save: { /* same as spell */ },
    armor: {
      value: 10,         // AC value
      type: "light",     // light, medium, heavy, shield
      dex: null          // Max dex bonus
    },
    hp: {
      value: 0,          // Current HP
      max: 0,            // Max HP
      dt: null,          // Damage threshold
      conditions: ""     // HP conditions
    },
    speed: {
      value: null,       // Speed modifier
      conditions: ""     // Speed conditions
    },
    strength: 0,         // Required strength
    stealth: false,      // Stealth disadvantage
    proficient: true,    // Proficiency
    weaponType: "simpleM", // simpleM, martialM, simpleR, martialR
    baseItem: "",        // Base weapon type
    properties: {        // Weapon properties
      amm: false,        // Ammunition
      fin: false,        // Finesse
      fir: false,        // Firearm
      foc: false,        // Focus
      hvy: false,        // Heavy
      lgt: false,        // Light
      lod: false,        // Loading
      rch: false,        // Reach
      rel: false,        // Reload
      ret: false,        // Returning
      spc: false,        // Special
      thr: false,        // Thrown
      two: false,        // Two-handed
      ver: false         // Versatile
    }
  }
}
```

### Feat System Data
```javascript
{
  type: "feat",
  system: {
    description: { /* same as spell */ },
    source: "",
    activation: { /* same as spell */ },
    duration: { /* same as spell */ },
    target: { /* same as spell */ },
    range: { /* same as spell */ },
    uses: { /* same as spell */ },
    consume: { /* same as spell */ },
    ability: null,
    actionType: "",
    attackBonus: "",
    chatFlavor: "",
    critical: { /* same as spell */ },
    damage: { /* same as spell */ },
    formula: "",
    save: { /* same as spell */ },
    requirements: "Dexterity 13 or higher",
    recharge: {
      value: null,       // Recharge on d6 roll
      charged: true      // Currently charged
    },
    featType: "feat",    // feat, class, race, background
    properties: []
  }
}
```

## MidiQOL Integration Flags

### Item-Level MidiQOL Flags
```javascript
{
  flags: {
    "midi-qol": {
      // OnUse macro configuration
      "onUseMacroName": "MacroName,postDamageRoll",
      
      // Roll options
      "rollAttackPerTarget": "default", // default, never, always
      "itemCondition": "",              // Conditional usage
      "effectCondition": "",            // Effect application condition
      
      // Damage options  
      "noProvokeReaction": true,        // Don't trigger reactions
      "autoFailFriendly": false,        // Allies auto-fail saves
      "autoSaveFriendly": false,        // Allies auto-save
      "rollOtherDamage": "ifSave",      // off, ifSave, activation
      "otherCondition": "",             // Other damage condition
      
      // Animation options
      "hideItemDetails": "default",     // Hide item description
      "animationTime": 0,               // Animation delay
      
      // Reaction settings
      "reactionCondition": "",          // Reaction trigger condition
      "reactionMacro": "",             // Reaction macro name
      
      // Confirmation prompts
      "confirmTargets": "default",      // Confirm targeting
      
      // AoE options
      "templateCondition": "",          // Template placement condition
      
      // Concentration
      "concentration": false            // Override concentration
    }
  }
}
```

### Weapon-Specific Properties
```javascript
{
  flags: {
    "midi-qol": {
      // Additional weapon properties
      "magical": true,                  // Counts as magical
      "critOther": false,              // Other damage crits
      "saveDamage": "default"          // Save damage behavior
    }
  }
}
```

## Active Effects Integration

### Effect Data Structure
```javascript
{
  effects: [
    {
      _id: "effect-id",
      name: "Effect Name", 
      img: "path/to/icon.png",
      origin: "Item.uuid",             // Source item UUID
      disabled: false,
      duration: {
        startTime: null,
        seconds: null,
        rounds: null,
        turns: null,
        startRound: null,
        startTurn: null
      },
      changes: [
        {
          key: "system.attributes.ac.bonus",
          mode: 2,                     // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "2",
          priority: 20
        }
      ],
      flags: {
        "dae": {
          "transfer": true,            // Transfer to actor when equipped
          "stackable": "noneName",     // Stacking behavior
          "specialDuration": ["turnStart"],
          "macroRepeat": "none"        // Macro repetition
        },
        "midi-qol": {
          "OverTime": "turn=start,damageRoll=1d4,damageType=poison"
        },
        "convenientDescription": "This effect provides +2 AC"
      },
      tint: null,
      transfer: true,                  // Legacy transfer flag
      statuses: ["blessed"]            // Status effect IDs
    }
  ]
}
```

## Common Automation Patterns

### Basic Attack Spell
```javascript
{
  name: "Fire Bolt",
  type: "spell",
  system: {
    level: 0,
    school: "evo", 
    actionType: "rsak",
    damage: {
      parts: [["1d10", "fire"]]
    },
    scaling: {
      mode: "cantrip",
      formula: "1d10"
    },
    range: {value: 120, units: "ft"},
    target: {value: 1, type: "creature"}
  }
}
```

### Save-Based Spell
```javascript
{
  name: "Fireball",
  type: "spell", 
  system: {
    level: 3,
    school: "evo",
    actionType: "save",
    damage: {
      parts: [["8d6", "fire"]]
    },
    save: {
      ability: "dex",
      dc: null,
      scaling: "spell"
    },
    target: {
      value: 20,
      units: "ft", 
      type: "sphere"
    },
    scaling: {
      mode: "spell",
      formula: "1d6"
    }
  },
  flags: {
    "midi-qol": {
      "onUseMacroName": "Fireball,postSave"
    }
  }
}
```

### Magic Weapon
```javascript
{
  name: "Flame Tongue",
  type: "weapon",
  system: {
    weaponType: "martialM",
    baseItem: "longsword",
    damage: {
      parts: [
        ["1d8 + @mod", "slashing"],
        ["2d6", "fire"]
      ]
    },
    properties: {
      ver: true,
      mgc: true
    },
    attackBonus: "1"
  },
  effects: [
    {
      name: "Flame Tongue Enhancement",
      changes: [
        {
          key: "system.bonuses.mwak.attack",
          mode: 2,
          value: "1"
        }
      ],
      flags: {
        "dae": {"transfer": true}
      }
    }
  ]
}
```

### Class Feature with Resources
```javascript
{
  name: "Action Surge",
  type: "feat",
  system: {
    featType: "class",
    activation: {
      type: "bonus",
      cost: 1
    },
    uses: {
      value: 1,
      max: "1",
      per: "sr"
    },
    consume: {
      type: "charges"
    }
  },
  flags: {
    "midi-qol": {
      "onUseMacroName": "ActionSurge,preItemRoll"
    }
  }
}
```

## Validation and Best Practices

### Required Fields
- `name` - Must be unique within actor
- `type` - Must be valid item type
- `system` - Must contain type-appropriate data
- `img` - Should be valid image path

### Data Validation
```javascript
function validateItemData(itemData) {
  const errors = [];
  
  if (!itemData.name) errors.push("Missing name");
  if (!itemData.type) errors.push("Missing type");
  if (!itemData.system) errors.push("Missing system data");
  
  // Type-specific validation
  if (itemData.type === "spell") {
    if (typeof itemData.system.level !== "number") {
      errors.push("Spell level must be number");
    }
  }
  
  return errors;
}
```

### Compatibility Guidelines
1. **Use standard field names** from D&D 5e system
2. **Follow automation module conventions** for flags
3. **Validate data types** before export
4. **Test with target modules** (MidiQOL, DAE, etc.)
5. **Handle missing/optional fields** gracefully
6. **Use appropriate defaults** for unspecified values

## Export Formats

### Single Item JSON
```javascript
{
  "name": "Export Item Name",
  "items": [itemData],
  "folders": [],
  "flags": {}
}
```

### Compendium Format
```javascript
{
  "name": "Custom Compendium",
  "label": "Custom Items",
  "type": "Item",
  "system": "dnd5e",
  "package": "world",
  "path": "./packs/custom-items.db",
  "private": false,
  "flags": {}
}
```

This structure provides the foundation for generating properly formatted Foundry VTT items that integrate seamlessly with the automation ecosystem.
