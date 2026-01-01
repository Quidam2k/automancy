# Macro Development and Integration Guide

## Overview

Macros provide the complex logic layer for automations that can't be achieved through flags and Active Effects alone. They integrate with MidiQOL's workflow system to handle sophisticated behaviors, conditional logic, and multi-step processes.

## Macro Types and Integration Points

### 1. OnUse Macros (Item Sheet)
Execute during the MidiQOL workflow at specific timing points.

```javascript
// Set on item's Details tab, Midi QOL section
"OnUse Macro": "MacroName,postDamageRoll"
```

### 2. Item Macros
Stored as part of the item data, called by reference.

```javascript
// In Active Effect or OnUse field
"ItemMacro" // Uses the item's own macro
"ItemMacro.SpellName" // Uses macro from named spell
```

### 3. Damage Bonus Macros  
Called whenever the actor rolls damage, regardless of item used.

```javascript
// Set in actor effects or class features
{
  key: "flags.midi-qol.damageBonusMacro",
  mode: 5,
  value: "SneakAttackDamage"
}
```

### 4. Effect Macros (DAE)
Triggered when effects are applied or removed.

```javascript
{
  key: "macro.execute", 
  mode: 0,
  value: "MyMacroName"
}
```

## Macro Execution Timing

### OnUse Macro Passes
- **preItemRoll** - Before item is rolled
- **templatePlaced** - After template placement
- **preambleComplete** - After targeting complete
- **preAttackRoll** - Before attack roll
- **preCheckHits** - After attack, before hit determination
- **postAttackRoll** - After hit determination
- **preDamageRoll** - Before damage roll
- **postDamageRoll** - After damage roll
- **preSave** - Before saves
- **postSave** - After saves  
- **damageBonus** - When calculating bonus damage
- **preDamageApplication** - Before applying damage
- **preActiveEffects** - Before applying effects
- **postActiveEffects** - After applying effects
- **all** - Called at each pass (check `args[0].macroPass`)

## Macro Arguments Structure

### Standard Arguments Object (args[0])
```javascript
{
  // Basic Data
  actor: ActorDocument,        // Acting actor
  actorUuid: "uuid-string",   
  token: TokenDocument,        // Acting token
  tokenUuid: "uuid-string",
  item: ItemDocument,          // Item being used
  itemUuid: "uuid-string",
  
  // Workflow Data  
  workflow: Workflow,          // MidiQOL workflow object
  targets: [TokenDocument],    // All targeted tokens
  targetUuids: ["uuid"],
  hitTargets: [TokenDocument], // Successfully hit targets
  hitTargetUuids: ["uuid"],
  
  // Roll Results
  attackRoll: Roll,            // Attack roll object
  attackTotal: 15,             // Attack roll total
  damageRoll: Roll,           // Damage roll object  
  damageTotal: 8,             // Total damage
  damageDetail: [             // Damage breakdown
    {type: "slashing", damage: 6},
    {type: "fire", damage: 2}
  ],
  
  // Save Results
  saves: [TokenDocument],      // Tokens that saved
  saveUuids: ["uuid"],
  failedSaves: [TokenDocument], // Tokens that failed
  failedSaveUuids: ["uuid"],
  
  // Status Flags
  isCritical: false,          // Was a critical hit
  isFumble: false,            // Was a fumble
  spellLevel: 3,              // Spell level used
  
  // Metadata
  tag: "OnUse",               // "OnUse" or "DamageBonus"  
  macroPass: "postDamageRoll", // Current execution pass
  itemCardId: "chat-id",      // Chat message ID
  templateId: "template-id",   // Placed template ID
  uuid: "workflow-uuid"       // Unique workflow ID
}
```

### Effect Macro Arguments
```javascript
args[0] // "on" when applied, "off" when removed
args[1] // Source actor ID (for auras)
lastArg // Contains: {actor, token, effect, origin, etc.}
```

## Common Macro Patterns

### 1. Conditional Damage Bonus
```javascript
// Sneak Attack - only if advantage or flanking
if (args[0].tag !== "DamageBonus") return;

const workflow = MidiQOL.Workflow.getWorkflow(args[0].uuid);
if (!workflow) return;

// Check for advantage or flanking
const hasAdvantage = workflow.attackRoll?.hasAdvantage;
const rogueLevel = args[0].actor.classes?.rogue?.system?.levels || 0;

if (hasAdvantage && rogueLevel > 0) {
  const sneakDice = Math.ceil(rogueLevel / 2);
  return [{
    damageRoll: `${sneakDice}d6[sneak attack]`,
    flavor: "sneak attack"
  }];
}
```

### 2. Target Selection Dialog
```javascript
// Choose secondary target for Green-Flame Blade
const nearbyEnemies = canvas.tokens.placeables.filter(t => {
  if (t === token) return false; // Not self
  if (t.disposition === token.disposition) return false; // Not ally
  
  const distance = canvas.grid.measureDistance(
    args[0].hitTargets[0], t, {gridSpaces: true}
  );
  return distance <= 5;
});

if (nearbyEnemies.length === 0) return;

let selectedTarget;
if (nearbyEnemies.length === 1) {
  selectedTarget = nearbyEnemies[0];
} else {
  // Show selection dialog
  const buttons = nearbyEnemies.reduce((acc, enemy) => {
    acc[enemy.id] = {
      label: enemy.name,
      callback: () => selectedTarget = enemy
    };
    return acc;
  }, {});
  
  await new Promise(resolve => {
    new Dialog({
      title: "Choose Secondary Target",
      buttons: {
        ...buttons,
        cancel: {
          label: "Cancel",
          callback: () => selectedTarget = null
        }
      },
      close: resolve
    }).render(true);
  });
}

if (!selectedTarget) return;

// Apply damage to selected target
const damageRoll = await new Roll("1d8").roll({async: true});
new MidiQOL.DamageOnlyWorkflow(
  actor, token, damageRoll.total, "fire", 
  [selectedTarget], damageRoll, 
  {flavor: "Green-Flame Blade Secondary"}
);
```

### 3. Resource Consumption
```javascript
// Bardic Inspiration usage tracking
if (args[0].macroPass !== "preAttackRoll") return;

const inspiration = actor.system.resources.primary;
if (inspiration.value <= 0) {
  ui.notifications.warn("No Bardic Inspiration remaining!");
  return false; // Abort workflow
}

// Consume resource
await actor.update({
  "system.resources.primary.value": inspiration.value - 1
});

// Apply inspiration die bonus
const workflow = MidiQOL.Workflow.getWorkflow(args[0].uuid);
const inspireDie = `1d${inspiration.die || 6}`;
const roll = await new Roll(inspireDie).roll({async: true});

workflow.attackRoll.terms.push("+", roll);
workflow.attackRoll._total += roll.total;
```

### 4. Effect Application with Conditions
```javascript
// Apply frightened only to creatures that can see caster
if (args[0].macroPass !== "postSave") return;

for (let target of args[0].failedSaves) {
  // Check line of sight
  const canSee = canvas.sight.testVisibility(
    token.center, target.center, {tolerance: 0}
  );
  
  if (!canSee) continue;
  
  // Check creature type
  const creatureType = target.actor.system.details.type?.value;
  if (creatureType === "undead" || creatureType === "construct") continue;
  
  // Apply frightened condition
  const effectData = {
    name: "Frightened",
    img: "systems/dnd5e/icons/conditions/frightened.svg",
    duration: {rounds: 1},
    changes: [
      {
        key: "flags.midi-qol.disadvantage.attack.all",
        mode: 5,
        value: "1"
      }
    ],
    statuses: ["frightened"]
  };
  
  await target.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
}
```

### 5. Multi-Step Workflow
```javascript
// Complex spell with multiple phases
const macroPass = args[0].macroPass;

switch(macroPass) {
  case "preItemRoll":
    // Phase 1: Initial setup and validation
    if (!game.combat?.started) {
      ui.notifications.warn("This ability requires combat!");
      return false;
    }
    break;
    
  case "templatePlaced":
    // Phase 2: Modify targeting based on template
    const template = canvas.templates.get(args[0].templateId);
    // Custom targeting logic here
    break;
    
  case "postSave":
    // Phase 3: Apply different effects based on save results
    await applyFailureEffects(args[0].failedSaves);
    await applySuccessEffects(args[0].saves);
    break;
    
  case "postActiveEffects":
    // Phase 4: Cleanup and secondary effects
    await createFollowUpEffects();
    break;
}

async function applyFailureEffects(targets) {
  // Implementation
}
```

## Advanced Techniques

### Workflow Modification
```javascript
// Modify damage mid-workflow
const workflow = MidiQOL.Workflow.getWorkflow(args[0].uuid);

// Change damage type
workflow.damageDetail.forEach(d => {
  if (d.type === "fire") d.type = "radiant";
});

// Add extra damage
const extraRoll = await new Roll("1d6").roll({async: true});
workflow.damageRoll.terms.push("+", extraRoll);
workflow.damageTotal += extraRoll.total;
```

### Custom Damage Application
```javascript
// Apply damage with special rules
const workflow = MidiQOL.Workflow.getWorkflow(args[0].uuid);

for (let target of workflow.hitTargets) {
  let damage = workflow.damageTotal;
  
  // Custom resistance logic
  if (target.actor.system.traits.dr.value.includes("magical")) {
    damage = Math.floor(damage / 2);
  }
  
  // Apply damage
  await target.actor.applyDamage(damage, {
    multiplier: 1,
    ignore: ["immunity", "resistance"]
  });
}
```

### Token Manipulation
```javascript
// Move token and apply effect
const target = args[0].hitTargets[0];
if (!target) return;

// Calculate push direction
const ray = new Ray(token.center, target.center);
const distance = 10; // feet

const newX = target.x + (Math.cos(ray.angle) * distance * canvas.grid.size / 5);
const newY = target.y + (Math.sin(ray.angle) * distance * canvas.grid.size / 5);

// Animate movement
await target.document.update({x: newX, y: newY}, {animate: true});

// Apply prone condition
const effectData = {
  name: "Prone",
  img: "systems/dnd5e/icons/conditions/prone.svg",
  changes: [
    {key: "flags.midi-qol.disadvantage.attack.all", mode: 5, value: "1"},
    {key: "flags.midi-qol.grants.advantage.attack.mwak", mode: 5, value: "1"}
  ],
  statuses: ["prone"]
};

await target.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
```

## Error Handling and Debugging

### Robust Error Handling
```javascript
try {
  const workflow = MidiQOL.Workflow.getWorkflow(args[0].uuid);
  if (!workflow) {
    console.warn("No workflow found for macro");
    return;
  }
  
  // Macro logic here
  
} catch (error) {
  console.error("Macro error:", error);
  ui.notifications.error(`Macro ${args[0].item.name} failed: ${error.message}`);
}
```

### Debug Logging
```javascript
// Conditional debug output
const DEBUG = game.settings.get("world", "debugMacros") || false;

function debugLog(message, data = null) {
  if (!DEBUG) return;
  console.log(`[${args[0].item.name}] ${message}`, data);
}

debugLog("Macro started", {pass: args[0].macroPass, actor: actor.name});
```

## Integration with Homebrew Converter

### Macro Generation Patterns
1. **Identify complexity level** from ability description
2. **Choose appropriate macro type** (OnUse, DamageBonus, etc.)
3. **Generate template code** based on patterns
4. **Insert ability-specific logic** 
5. **Add error handling** and validation
6. **Reference shared utility functions**

### Utility Function Library
Create reusable functions for common patterns:
```javascript
// Shared utility functions
window.AutomationUtils = {
  async selectTarget(candidates, title = "Select Target") {
    // Target selection implementation
  },
  
  async applyCondition(target, condition, duration) {
    // Condition application implementation  
  },
  
  checkLineOfSight(source, target) {
    // LOS checking implementation
  },
  
  // More utilities...
};
```

## Best Practices

1. **Always check workflow exists** before accessing it
2. **Handle null/undefined gracefully** 
3. **Use async/await** for database operations
4. **Provide user feedback** for failures
5. **Clean up temporary effects** and tokens
6. **Test edge cases** thoroughly
7. **Document complex logic** with comments
8. **Follow consistent naming** conventions
