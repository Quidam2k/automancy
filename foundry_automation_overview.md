# Foundry VTT Automation Architecture Overview

## System Architecture

The Foundry VTT automation ecosystem for D&D 5e consists of several interconnected modules that work together to provide comprehensive combat and spell automation:

### Core Components

1. **MidiQOL** - The automation engine
   - Handles workflow automation (attack → hit → damage → effects)
   - Provides extensive flag system for conditional behaviors
   - Manages timing and sequencing of automated actions
   - Integrates with Active Effects system

2. **Dynamic Active Effects (DAE)** - Enhanced effects system
   - Extends Foundry's base Active Effects
   - Provides transfer mechanisms for effects
   - Handles macro execution within effects
   - Manages effect duration and expiry

3. **Automation Modules (Chris Premades, Gambit's Premades)**
   - Pre-built automated items and spells
   - Complex macro libraries
   - Integration utilities ("Medkit" system)
   - Advanced reaction handling

## Data Flow Architecture

```
Input (Homebrew Stats) 
    ↓
Parser & Analyzer
    ↓
Automation Generator
    ↓
Foundry Item Data Structure
    ↓
MidiQOL Integration
    ↓
Active Effects & Macros
    ↓
Exportable JSON/DB File
```

## Key Automation Patterns

### 1. Flag-Based Automation
MidiQOL uses a comprehensive flag system for conditional behaviors:
- `flags.midi-qol.advantage.attack.all` - Always attack with advantage
- `flags.midi-qol.DR.fire` - Fire damage reduction
- `flags.midi-qol.optional.Name.damage.mwak` - Optional damage bonus

### 2. Active Effects Structure
Effects use a standardized change array:
```javascript
{
  key: "system.attributes.ac.bonus",
  mode: 2, // ADD mode
  value: "2",
  priority: 20
}
```

### 3. Macro Integration Points
- **OnUse Macros** - Execute during item workflow
- **Item Macros** - Stored with item, called by reference
- **Effect Macros** - Triggered by effect application/removal
- **Damage Bonus Macros** - Add conditional damage

### 4. Timing and Triggers
Multiple execution points in the workflow:
- `preItemRoll`
- `preAttackRoll` 
- `preCheckHits`
- `preDamageRoll`
- `postDamageRoll`
- `preActiveEffects`

## Automation Complexity Levels

### Level 1: Basic Automation
- Simple damage/healing
- Basic saves and conditions
- Static bonuses/penalties
- Uses flags and simple Active Effects

### Level 2: Conditional Automation  
- Situational bonuses (advantage vs specific creature types)
- Resource consumption
- Multiple effect applications
- Basic macro integration

### Level 3: Complex Automation
- Multi-step workflows
- Interactive dialogs
- Dynamic effect creation
- Advanced macro logic

### Level 4: Reaction-Based Automation
- Third-party reactions (Counterspell, Opportunity Attacks)
- Real-time condition monitoring
- Cross-actor effect management
- Advanced timing control

## Integration Requirements

### Essential Modules
- **MidiQOL** - Core automation engine
- **DAE** - Enhanced Active Effects
- **libWrapper** - Module compatibility
- **socketlib** - Client synchronization

### Recommended Modules  
- **Times Up** - Effect duration management
- **Convenient Effects** - Predefined status effects
- **Warp Gate** - Token/actor manipulation
- **Sequencer** - Animation coordination

## File Structure Standards

### Item Data Structure
Foundry items follow a specific schema:
- `system` - Core 5e system data
- `effects` - Active Effects array
- `flags` - Module-specific data
- `ownership` - Permission settings

### Export Format
Automation modules typically export as:
- **JSON files** - For individual items
- **Compendium packs** - For collections
- **Adventure files** - For complete packages

## Automation Principles

1. **Modularity** - Each automation should be self-contained
2. **Compatibility** - Follow established flag/effect patterns
3. **Performance** - Minimize macro complexity where possible
4. **Reliability** - Handle edge cases and error conditions
5. **User Experience** - Provide clear feedback and options

## Next Steps

The following guides will detail:
- MidiQOL flag system and usage patterns
- Active Effects structure and implementation
- Macro development and integration
- Complex automation examples
- Export and packaging formats
