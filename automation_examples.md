# Automation Examples and Patterns

## Overview

This guide provides concrete examples of how different types of abilities are automated using the MidiQOL ecosystem. These patterns serve as templates for generating automation from homebrew ability descriptions.

## Basic Attack Patterns

### Simple Weapon Attack
**Description**: "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage."

```javascript
{
  name: "Shortsword",
  type: "weapon",
  system: {
    weaponType: "martialM",
    actionType: "mwak",
    attackBonus: "2", // +5 total with +3 mod
    damage: {
      parts: [["1d6 + @mod", "slashing"]]
    },
    range: {value: 5, units: "ft"},
    target: {value: 1, type: "creature"}
  }
}
```

### Ranged Attack with Range
**Description**: "Ranged Weapon Attack: +4 to hit, range 150/600 ft., one target. Hit: 5 (1d6 + 2) piercing damage."

```javascript
{
  name: "Longbow",
  type: "weapon", 
  system: {
    weaponType: "martialR",
    actionType: "rwak",
    attackBonus: "2",
    damage: {
      parts: [["1d6 + @mod", "piercing"]]
    },
    range: {value: 150, long: 600, units: "ft"},
    properties: {amm: true, hvy: true, two: true}
  }
}
```

### Spell Attack
**Description**: "Ranged Spell Attack: +6 to hit, range 120 ft., one creature. Hit: 10 (3d6) fire damage."

```javascript
{
  name: "Fire Bolt",
  type: "spell",
  system: {
    level: 0,
    school: "evo",
    actionType: "rsak", 
    damage: {
      parts: [["3d6", "fire"]]
    },
    range: {value: 120, units: "ft"},
    target: {value: 1, type: "creature"},
    scaling: {mode: "cantrip", formula: "1d6"}
  }
}
```

## Save-Based Abilities

### Basic Save for Damage
**Description**: "Each creature in a 20-foot radius must make a DC 15 Dexterity saving throw. A creature takes 28 (8d6) fire damage on failed save, or half as much on success."

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
      dc: 15,
      scaling: "flat"
    },
    target: {
      value: 20,
      units: "ft",
      type: "sphere"
    }
  }
}
```

### Save with Condition
**Description**: "DC 14 Constitution save or be poisoned for 1 minute. Can repeat save at end of each turn."

```javascript
{
  name: "Poison Sting",
  type: "feat",
  system: {
    actionType: "save",
    save: {
      ability: "con", 
      dc: 14,
      scaling: "flat"
    }
  },
  effects: [
    {
      name: "Poisoned",
      duration: {rounds: 10},
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
          value: "turn=end,saveAbility=con,saveDC=14,saveRemove=true,label=Poisoned"
        }
      ],
      statuses: ["poisoned"]
    }
  ]
}
```

### No Damage on Save
**Description**: "DC 16 Wisdom save or be charmed for 1 hour. No damage."

```javascript
{
  name: "Charm Person",
  type: "spell",
  system: {
    level: 1,
    actionType: "save",
    save: {
      ability: "wis",
      dc: null, // Uses spellcasting DC
      scaling: "spell"
    },
    duration: {value: 1, units: "hour"}
  },
  effects: [
    {
      name: "Charmed",
      duration: {seconds: 3600},
      changes: [
        {
          key: "flags.midi-qol.grants.advantage.attack.all",
          mode: 5,
          value: "1"
        }
      ],
      statuses: ["charmed"]
    }
  ],
  flags: {
    "midi-qol": {
      "effectCondition": "['humanoid'].includes('@raceOrType')"
    }
  }
}
```

## Conditional Abilities

### Damage vs Specific Type
**Description**: "Deals an extra 2d6 damage to undead and fiends."

```javascript
{
  name: "Radiant Strike",
  type: "feat",
  system: {
    actionType: "other",
    damage: {
      parts: [["2d6", "radiant"]]
    }
  },
  flags: {
    "midi-qol": {
      "onUseMacroName": "RadiantStrike,damageBonus",
      "itemCondition": "['undead', 'fiend'].includes('@target.details.type.value')"
    }
  }
}
```

**Macro (RadiantStrike):**
```javascript
if (args[0].tag !== "DamageBonus") return;

const targetType = args[0].hitTargets[0]?.actor?.system?.details?.type?.value;
if (!['undead', 'fiend'].includes(targetType)) return;

return [{
  damageRoll: "2d6[radiant]",
  flavor: "radiant"
}];
```

### Advantage in Certain Conditions
**Description**: "Has advantage on attack rolls against prone targets."

```javascript
{
  name: "Prone Fighter",
  type: "feat",
  effects: [
    {
      name: "Prone Fighter",
      changes: [
        {
          key: "flags.midi-qol.advantage.attack.all",
          mode: 5,
          value: "@target.statuses.includes('prone')"
        }
      ],
      flags: {
        "dae": {"transfer": true}
      }
    }
  ]
}
```

## Resource-Based Abilities

### Limited Uses per Rest
**Description**: "Regain use on short or long rest. 3 uses."

```javascript
{
  name: "Second Wind",
  type: "feat",
  system: {
    activation: {type: "bonus", cost: 1},
    uses: {
      value: 3,
      max: "3", 
      per: "sr"
    },
    formula: "1d10 + @classes.fighter.levels",
    actionType: "heal"
  }
}
```

### Recharge Ability
**Description**: "Recharge 5-6. Breath weapon."

```javascript
{
  name: "Fire Breath",
  type: "feat",
  system: {
    activation: {type: "action", cost: 1},
    recharge: {
      value: 5,
      charged: true
    },
    actionType: "save",
    damage: {
      parts: [["3d6", "fire"]]
    },
    save: {
      ability: "dex",
      dc: 13,
      scaling: "flat"
    },
    target: {
      value: 15,
      units: "ft", 
      type: "cone"
    }
  }
}
```

### Charges System
**Description**: "Has 7 charges, regains 1d6+1 at dawn."

```javascript
{
  name: "Staff of Power",
  type: "equipment",
  system: {
    uses: {
      value: 7,
      max: "7",
      per: "charges"
    },
    consume: {
      type: "charges",
      amount: 1
    }
  },
  flags: {
    "midi-qol": {
      "onUseMacroName": "StaffOfPower,preItemRoll"
    }
  }
}
```

## Area Effect Abilities

### Aura Effect
**Description**: "All allies within 10 feet gain +1 to AC."

```javascript
{
  name: "Protective Aura",
  type: "feat",
  effects: [
    {
      name: "Protective Aura Source",
      changes: [
        {
          key: "flags.aura-effects.aura.Protective.type",
          mode: 5,
          value: "ally"
        },
        {
          key: "flags.aura-effects.aura.Protective.radius",
          mode: 5,
          value: "10"
        },
        {
          key: "flags.aura-effects.aura.Protective.effect",
          mode: 5,
          value: "Protective Aura Effect"
        }
      ],
      flags: {
        "dae": {"transfer": true}
      }
    },
    {
      name: "Protective Aura Effect",
      changes: [
        {
          key: "system.attributes.ac.bonus",
          mode: 2,
          value: "1"
        }
      ]
    }
  ]
}
```

### Template-Based Area
**Description**: "20-foot radius sphere, difficult terrain."

```javascript
{
  name: "Entangle",
  type: "spell",
  system: {
    level: 1,
    actionType: "save",
    save: {
      ability: "str",
      dc: null,
      scaling: "spell"
    },
    target: {
      value: 20,
      units: "ft",
      type: "sphere"
    },
    duration: {value: 10, units: "minute"}
  },
  flags: {
    "midi-qol": {
      "onUseMacroName": "Entangle,templatePlaced"
    }
  }
}
```

## Reaction Abilities

### Defensive Reaction
**Description**: "When hit by an attack, can use reaction to halve damage."

```javascript
{
  name: "Uncanny Dodge",
  type: "feat",
  system: {
    activation: {type: "reaction", cost: 1},
    uses: {
      value: 1,
      max: "1",
      per: "turn"
    }
  },
  flags: {
    "midi-qol": {
      "reactionCondition": "isDamaged"
    }
  }
}
```

**Actor Effect:**
```javascript
{
  name: "Uncanny Dodge Available",
  changes: [
    {
      key: "flags.midi-qol.uncanny-dodge",
      mode: 5,
      value: "1"
    }
  ],
  flags: {
    "dae": {"transfer": true}
  }
}
```

### Counter-Attack Reaction
**Description**: "When missed by melee attack, can make opportunity attack."

```javascript
{
  name: "Riposte",
  type: "feat",
  system: {
    activation: {type: "reaction", cost: 1}
  },
  flags: {
    "midi-qol": {
      "onUseMacroName": "Riposte,postAttackRoll"
    }
  }
}
```

**Macro (Riposte):**
```javascript
if (args[0].macroPass !== "postAttackRoll") return;
if (args[0].hitTargets.length > 0) return; // Only if missed

const attacker = canvas.tokens.get(args[0].workflow.token.id);
const target = canvas.tokens.get(args[0].targets[0].id);

// Check if attacker is within reach
const distance = canvas.grid.measureDistance(target, attacker);
if (distance > 5) return;

// Prompt for riposte
const useRiposte = await new Promise(resolve => {
  new Dialog({
    title: "Riposte",
    content: "Use reaction for riposte?",
    buttons: {
      yes: {label: "Yes", callback: () => resolve(true)},
      no: {label: "No", callback: () => resolve(false)}
    }
  }).render(true);
});

if (!useRiposte) return;

// Make weapon attack
const weapons = target.actor.items.filter(i => 
  i.type === "weapon" && i.system.equipped
);

if (weapons.length > 0) {
  await weapons[0].use({
    targetUuids: [attacker.document.uuid]
  });
}
```

## Complex Multi-Step Abilities

### Spell with Multiple Effects
**Description**: "Target must save or be restrained. On subsequent turns, can use action to attempt escape (Athletics vs spell DC)."

```javascript
{
  name: "Web",
  type: "spell",
  system: {
    level: 2,
    actionType: "save",
    save: {
      ability: "dex",
      dc: null,
      scaling: "spell"
    },
    target: {
      value: 20,
      units: "ft", 
      type: "cube"
    },
    duration: {value: 1, units: "hour"}
  },
  effects: [
    {
      name: "Webbed",
      duration: {seconds: 3600},
      changes: [
        {
          key: "system.attributes.movement.all",
          mode: 5,
          value: "0"
        },
        {
          key: "flags.midi-qol.disadvantage.attack.all",
          mode: 5,
          value: "1"
        },
        {
          key: "flags.midi-qol.grants.advantage.attack.all",
          mode: 5,
          value: "1"
        },
        {
          key: "flags.midi-qol.OverTime",
          mode: 5,
          value: "turn=start,actionSave=true,saveAbility=ath|acr,saveDC=@attributes.spelldc,saveRemove=true,label=Escape Web"
        }
      ],
      statuses: ["restrained"]
    }
  ]
}
```

### Transformation Ability
**Description**: "Transform into bear form for 1 hour. Gain new stat block."

```javascript
{
  name: "Wild Shape (Bear)",
  type: "feat",
  system: {
    activation: {type: "action", cost: 1},
    uses: {
      value: 2,
      max: "2",
      per: "sr"
    },
    duration: {value: 1, units: "hour"}
  },
  flags: {
    "midi-qol": {
      "onUseMacroName": "WildShapeBear,preItemRoll"
    }
  }
}
```

**Macro (WildShapeBear):**
```javascript
if (args[0].macroPass !== "preItemRoll") return;

const bearData = {
  "system.attributes.hp.value": 34,
  "system.attributes.hp.max": 34,
  "system.attributes.ac.value": 11,
  "system.abilities.str.value": 19,
  "system.abilities.dex.value": 10,
  "system.abilities.con.value": 16
};

// Store original form
await actor.setFlag("world", "wildShapeOriginal", {
  hp: actor.system.attributes.hp.value,
  maxHp: actor.system.attributes.hp.max,
  ac: actor.system.attributes.ac.value,
  str: actor.system.abilities.str.value,
  dex: actor.system.abilities.dex.value,
  con: actor.system.abilities.con.value
});

// Transform
await actor.update(bearData);

// Add revert effect
const revertEffect = {
  name: "Wild Shape (Bear)",
  duration: {seconds: 3600},
  changes: [],
  flags: {
    "dae": {
      "specialDuration": ["zeroHP"]
    }
  }
};

await actor.createEmbeddedDocuments("ActiveEffect", [revertEffect]);
```

## Pattern Recognition for Converter

### Ability Text Patterns
1. **"Melee/Ranged Weapon Attack: +X to hit"** → Weapon with attack bonus
2. **"DC X [Ability] saving throw"** → Save-based ability  
3. **"[Number] ([Dice]) [Type] damage"** → Damage formula
4. **"Recharge [Number]"** → Recharge system
5. **"[Number]/Day" or "per rest"** → Limited uses
6. **"within [Number] feet"** → Aura or area effect
7. **"as a reaction"** → Reaction trigger
8. **"advantage/disadvantage"** → Flag-based modification
9. **"resistant/immune to"** → Damage resistance
10. **"concentration"** → Concentration spell

### Automation Complexity Decision Tree
```
Simple damage/healing → Basic item with damage parts
Save or condition → Item + Active Effect
Conditional effects → Add flags or simple macro
Resource consumption → Uses system
Multi-step process → Complex macro
Area effects → Template + macro
Reactions → Reaction flags + macro
Transformations → Complex macro with data storage
```

This pattern library provides templates for generating automated items from natural language ability descriptions.
