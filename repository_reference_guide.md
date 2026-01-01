# Repository Reference Guide

## Essential Repositories to Clone

Clone these repositories into a `reference/` folder to access the actual source code and implementation patterns used by the major automation modules.

## Repository Setup Commands

```bash
mkdir reference
cd reference

# Core automation engine
git clone https://gitlab.com/tposney/midi-qol.git
git clone https://gitlab.com/tposney/dae.git

# Major automation content modules  
git clone https://github.com/chrisk123999/chris-premades.git
git clone https://github.com/gambit07/gambits-premades.git

# Community automation examples
git clone https://github.com/txm3278/midi-item-showcase-community.git
git clone https://github.com/thatlonelybugbear/FoundryMacros.git
git clone https://github.com/JamesBrandts/DnD5eAutomatedSpells.git

# Additional useful references
git clone https://github.com/foundryvtt/dnd5e.git
git clone https://github.com/kaelad02/adv-reminder.git
```

## Key Files to Examine by Repository

### MidiQOL (`reference/midi-qol/`)

**Essential Files:**
- `src/module/patching.js` - How MidiQOL hooks into Foundry's core systems
- `src/module/item-sheet.js` - Item sheet modifications and MidiQOL-specific fields
- `src/module/Workflow.js` - The core workflow engine that processes automation
- `src/module/utils.js` - Utility functions for common automation tasks
- `src/sample-items/` - Example automated items with different complexity levels

**Key Patterns to Study:**
```javascript
// Look for flag processing patterns
// How workflow timing is managed
// Attack/damage/save automation sequences
// Effect application logic
```

**Focus Areas:**
- Flag definitions and processing (`flags.midi-qol.*`)
- Workflow execution phases and timing
- How macros are called and passed data
- Integration with Active Effects
- Template and targeting systems

### Chris Premades (`reference/chris-premades/`)

**Essential Files:**
- `scripts/macros/` - Individual spell/feature automation macros
- `scripts/helpers/` - Shared utility functions and helpers
- `scripts/lib/` - Core library functions for automation
- `scripts/extensions/` - Module integrations and extensions
- `packs/` - Compendium data showing item structure

**Key Examples to Study:**
```
scripts/macros/spells/fireball.js
scripts/macros/classFeatures/actionSurge.js  
scripts/macros/raceFeatures/dragonBornBreathWeapon.js
scripts/macros/monsters/mindflayerMindBlast.js
```

**Focus Areas:**
- Macro organization and naming conventions
- Helper function usage patterns
- How complex spells are broken down into manageable automation
- Integration with animation modules
- Resource consumption patterns

### Gambit's Premades (`reference/gambits-premades/`)

**Essential Files:**
- `scripts/automations/` - Individual automation implementations
- `scripts/lib/` - Shared library functions
- `scripts/helpers/` - Utility functions specific to GPS
- `module/gps.js` - Main module logic and registration

**Key Examples to Study:**
```
scripts/automations/spells/counterspell.js
scripts/automations/features/opportunityAttack.js
scripts/automations/features/silveryBarbs.js
scripts/automations/items/staffOfWithering.js
```

**Focus Areas:**
- Reaction automation patterns
- Third-party reaction systems
- Dialog creation and user interaction
- Region-based automation
- Complex conditional logic

### DAE (`reference/dae/`)

**Essential Files:**
- `src/module/dae.js` - Core DAE functionality
- `src/module/DAEActiveEffects.js` - Enhanced Active Effects implementation
- `src/module/daeMacros.js` - Macro execution within effects
- `src/module/utils.js` - DAE utility functions

**Focus Areas:**
- Active Effect enhancement patterns
- Transfer mechanics for equipment
- Special duration handling
- Macro integration with effects

## Source Code Analysis Priorities

### 1. Item Structure Analysis

**Extract from Chris Premades compendiums:**
```bash
# Look at actual item data structure
find reference/chris-premades/packs -name "*.db" | head -5
```

**Key Questions:**
- How are complex spells structured in the item data?
- What flags are commonly used?
- How are Active Effects organized?
- What naming conventions are followed?

### 2. Macro Pattern Analysis

**Study macro templates in:**
- `reference/chris-premades/scripts/macros/`
- `reference/gambits-premades/scripts/automations/`
- `reference/midi-item-showcase-community/`

**Key Patterns to Extract:**
- Common macro structure and organization
- Error handling patterns
- User interaction (dialogs, prompts)
- Resource consumption logic
- Target selection and validation
- Effect application and removal

### 3. Flag Usage Analysis

**Search for flag patterns:**
```bash
grep -r "flags.midi-qol" reference/chris-premades/scripts/ | head -10
grep -r "flags.dae" reference/chris-premades/scripts/ | head -10
```

**Document:**
- Most commonly used flags
- Conditional flag usage patterns
- Flag combinations that work well together
- Timing-specific flag applications

### 4. Helper Function Analysis

**Study shared utilities:**
- `reference/chris-premades/scripts/helpers/`
- `reference/gambits-premades/scripts/lib/`

**Key Functions to Understand:**
- Target selection helpers
- Distance calculation utilities
- Condition application helpers
- Animation integration functions
- Resource manipulation utilities

## Implementation Reference Patterns

### Basic Item Creation Pattern

**From Chris Premades:**
```javascript
// Look for patterns like this in the source
const itemData = {
    name: "Spell Name",
    type: "spell",
    system: {
        // Standard 5e data
    },
    effects: [
        // Active Effects array
    ],
    flags: {
        "midi-qol": {
            // MidiQOL specific flags
        }
    }
};
```

### Macro Integration Pattern

**From Gambit's Premades:**
```javascript
// Common macro structure
if (args[0].macroPass !== "expectedPass") return;

const workflow = MidiQOL.Workflow.getWorkflow(args[0].uuid);
if (!workflow) return;

// Automation logic here
```

### Effect Application Pattern

**From DAE examples:**
```javascript
const effectData = {
    name: "Effect Name",
    changes: [
        {
            key: "system.path.to.property",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: "value"
        }
    ],
    flags: {
        "dae": {
            "transfer": true,
            "stackable": "noneName"
        }
    }
};
```

## Specific Files to Study for Common Patterns

### Attack Automation
- `reference/chris-premades/scripts/macros/classFeatures/extraAttack.js`
- `reference/midi-qol/src/sample-items/` (weapon examples)

### Save-Based Spells  
- `reference/chris-premades/scripts/macros/spells/fireball.js`
- `reference/chris-premades/scripts/macros/spells/holdPerson.js`

### Conditional Damage
- `reference/chris-premades/scripts/macros/spells/huntersmark.js`
- `reference/gambits-premades/scripts/automations/features/sneakAttack.js`

### Resource Management
- `reference/chris-premades/scripts/macros/classFeatures/actionSurge.js`
- `reference/gambits-premades/scripts/automations/features/strokeOfLuck.js`

### Reactions
- `reference/gambits-premades/scripts/automations/spells/counterspell.js`
- `reference/gambits-premades/scripts/automations/features/opportunityAttack.js`

### Area Effects
- `reference/chris-premades/scripts/macros/spells/entangle.js`
- `reference/chris-premades/scripts/macros/spells/cloudOfDaggers.js`

## Code Analysis Tools

### Useful Search Patterns

```bash
# Find all instances of specific flags
grep -r "flags\.midi-qol\.advantage" reference/

# Find macro timing patterns  
grep -r "macroPass.*===" reference/

# Find effect creation patterns
grep -r "createEmbeddedDocuments.*ActiveEffect" reference/

# Find resource consumption patterns
grep -r "system\.resources\." reference/

# Find conditional logic patterns
grep -r "target\.details\.type" reference/
```

### Pattern Extraction Scripts

Create helper scripts to extract common patterns:

```bash
# Extract all unique MidiQOL flags used
find reference/ -name "*.js" -exec grep -h "flags\.midi-qol\." {} \; | sort -u

# Extract all Active Effect key paths
find reference/ -name "*.js" -exec grep -h "key.*system\." {} \; | sort -u

# Extract all macro timing points
find reference/ -name "*.js" -exec grep -h "macroPass.*===" {} \; | sort -u
```

## Integration Testing Reference

### Test Against Real Implementations

When building your automation converter:

1. **Compare your output** against equivalent items in Chris Premades
2. **Test compatibility** with Gambit's Premades patterns
3. **Validate flag usage** against MidiQOL source code
4. **Check effect structure** against DAE requirements

### Version Compatibility

**Note the versions when cloning:**
- Document which version you're referencing
- Check for breaking changes in newer versions
- Test against multiple module versions if possible

## Best Practices from Source Analysis

### Code Organization (from Chris Premades)
- Separate macros by category (spells, features, items)
- Use consistent naming conventions
- Implement error handling patterns
- Document complex logic with comments

### Performance Patterns (from Gambit's Premades)
- Cache frequently accessed data
- Minimize database queries
- Use efficient target selection
- Implement proper cleanup

### Compatibility Patterns (from MidiQOL)
- Follow established timing conventions
- Use standard flag patterns
- Handle edge cases gracefully
- Provide fallback behaviors

## Update Strategy

**Regularly update your reference repositories:**
```bash
cd reference
for dir in */; do
    echo "Updating $dir"
    cd "$dir"
    git pull
    cd ..
done
```

This ensures you're working with the latest patterns and implementations from the community.

By studying these repositories, you'll have access to thousands of real-world automation examples and can extract the exact patterns used by the most successful automation modules in the Foundry ecosystem.
