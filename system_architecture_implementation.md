# Homebrew Automation Converter - System Architecture & Implementation

## Overview

This document outlines the complete architecture for building a system that converts homebrew D&D ability descriptions into fully automated Foundry VTT items compatible with MidiQOL, Chris Premades, and Gambit's Premades.

## System Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Input Parser      │───▶│   Automation       │───▶│   Output Generator  │
│                     │    │   Engine           │    │                     │
│ • Text Analysis     │    │                    │    │ • Foundry JSON      │
│ • Pattern Matching │    │ • Rule Engine      │    │ • Compendium Files  │
│ • Entity Extraction│    │ • Effect Generator │    │ • Import Scripts    │
└─────────────────────┘    │ • Macro Creation   │    └─────────────────────┘
                           │ • Validation       │
                           └─────────────────────┘
                                     │
                           ┌─────────────────────┐
                           │   Knowledge Base    │
                           │                     │
                           │ • Automation        │
                           │   Patterns          │
                           │ • Flag Reference    │
                           │ • Macro Templates   │
                           └─────────────────────┘
```

## Core Components

### 1. Input Parser Module

**Purpose**: Parse and analyze homebrew ability text to extract structured information.

#### Text Analysis Engine
```typescript
interface AbilityDescription {
  raw: string;
  parsed: {
    name: string;
    type: AbilityType;
    activation: ActivationData;
    target: TargetData;
    damage: DamageData[];
    saves: SaveData[];
    effects: EffectData[];
    conditions: ConditionData[];
    resources: ResourceData;
    duration: DurationData;
    range: RangeData;
  };
}

enum AbilityType {
  WEAPON_ATTACK = "weapon_attack",
  SPELL_ATTACK = "spell_attack", 
  SAVE_ABILITY = "save_ability",
  HEALING = "healing",
  UTILITY = "utility",
  PASSIVE = "passive",
  REACTION = "reaction"
}
```

#### Pattern Recognition System
```typescript
const PARSING_PATTERNS = {
  // Attack patterns
  WEAPON_ATTACK: /(?:Melee|Ranged) Weapon Attack: \+(\d+) to hit/i,
  SPELL_ATTACK: /(?:Melee|Ranged) Spell Attack: \+(\d+) to hit/i,
  
  // Damage patterns  
  DAMAGE: /(\d+) \((\d+d\d+(?:\s*\+\s*\d+)?)\) (\w+) damage/gi,
  DAMAGE_SIMPLE: /(\d+d\d+(?:\s*[\+\-]\s*\d+)?)\s+(\w+)\s+damage/gi,
  
  // Save patterns
  SAVE_DC: /DC (\d+) (\w+) (?:saving throw|save)/gi,
  SAVE_EFFECT: /on (?:a )?(?:failed save|failure).*?([^.]+)/gi,
  
  // Duration patterns
  DURATION_ROUNDS: /(?:for|lasts?) (\d+) rounds?/i,
  DURATION_MINUTES: /(?:for|lasts?) (\d+) minutes?/i,
  DURATION_HOURS: /(?:for|lasts?) (\d+) hours?/i,
  
  // Resource patterns
  RECHARGE: /(?:Recharge|recharges on) (\d+)(?:-(\d+))?/i,
  USES_PER_DAY: /(\d+)\/day/i,
  USES_PER_REST: /(\d+)\/(short|long) rest/i,
  
  // Range/Area patterns
  RANGE: /range (\d+)(?:\/(\d+))? (?:ft|feet)/i,
  AREA_RADIUS: /(\d+)(?:-|\s)(?:foot|ft\.?)\s+radius/i,
  AREA_CONE: /(\d+)(?:-|\s)(?:foot|ft\.?)\s+cone/i,
  AREA_LINE: /(\d+)(?:-|\s)(?:foot|ft\.?)\s+line/i,
  
  // Condition patterns
  ADVANTAGE: /advantage on (?:attack rolls?|saving throws?|ability checks?)/i,
  DISADVANTAGE: /disadvantage on (?:attack rolls?|saving throws?|ability checks?)/i,
  RESISTANCE: /(?:resistant?|resistance) to (\w+(?:,\s*\w+)*) damage/i,
  IMMUNITY: /(?:immune|immunity) to (\w+(?:,\s*\w+)*) damage/i
};
```

### 2. Automation Engine

**Purpose**: Convert parsed data into automation rules and generate appropriate Foundry structures.

#### Rule Engine
```typescript
class AutomationEngine {
  private rulesets: Map<AbilityType, AutomationRuleset>;
  private flagGenerator: FlagGenerator;
  private effectGenerator: EffectGenerator;
  private macroGenerator: MacroGenerator;
  
  generateAutomation(ability: AbilityDescription): AutomationResult {
    const ruleset = this.rulesets.get(ability.parsed.type);
    if (!ruleset) throw new Error(`No ruleset for type: ${ability.parsed.type}`);
    
    return {
      item: this.generateItemData(ability, ruleset),
      effects: this.generateEffects(ability, ruleset),
      macros: this.generateMacros(ability, ruleset),
      flags: this.generateFlags(ability, ruleset)
    };
  }
}
```

#### Complexity Assessment
```typescript
enum AutomationComplexity {
  SIMPLE = 1,      // Basic flags and effects only
  MODERATE = 2,    // Simple macros, conditional effects  
  COMPLEX = 3,     // Advanced macros, multi-step workflows
  REACTION = 4     // Real-time reactions, cross-actor effects
}

function assessComplexity(ability: AbilityDescription): AutomationComplexity {
  let score = 1;
  
  // Conditional logic increases complexity
  if (ability.parsed.conditions.length > 0) score++;
  
  // Multiple damage types or complex calculations
  if (ability.parsed.damage.length > 1) score++;
  
  // Reactions require advanced handling
  if (ability.parsed.activation.type === "reaction") score = 4;
  
  // Multi-step effects (save + condition + damage over time)
  if (ability.parsed.effects.length > 1) score++;
  
  return Math.min(score, 4) as AutomationComplexity;
}
```

### 3. Flag Generation System

```typescript
class FlagGenerator {
  generateMidiQOLFlags(ability: AbilityDescription): Record<string, any> {
    const flags: Record<string, any> = {};
    
    // Advantage/Disadvantage conditions
    ability.parsed.conditions.forEach(condition => {
      switch(condition.type) {
        case "advantage_attack":
          flags["flags.midi-qol.advantage.attack.all"] = condition.value;
          break;
        case "damage_resistance":
          condition.damageTypes.forEach(type => {
            flags[`flags.midi-qol.DR.${type}`] = condition.amount;
          });
          break;
        case "conditional_bonus":
          flags[`flags.midi-qol.optional.${condition.name}.attack.all`] = condition.formula;
          flags[`flags.midi-qol.optional.${condition.name}.label`] = condition.description;
          break;
      }
    });
    
    // OnUse macro assignment
    if (ability.complexity >= AutomationComplexity.MODERATE) {
      flags["flags.midi-qol.onUseMacroName"] = `${ability.parsed.name.replace(/\s+/g, "")},${this.determineExecutionPoint(ability)}`;
    }
    
    return flags;
  }
  
  private determineExecutionPoint(ability: AbilityDescription): string {
    if (ability.parsed.type === AbilityType.SAVE_ABILITY) return "postSave";
    if (ability.parsed.damage.length > 0) return "postDamageRoll";
    if (ability.parsed.effects.length > 0) return "preActiveEffects";
    return "postItemRoll";
  }
}
```

### 4. Effect Generation System

```typescript
class EffectGenerator {
  generateActiveEffects(ability: AbilityDescription): ActiveEffectData[] {
    const effects: ActiveEffectData[] = [];
    
    ability.parsed.effects.forEach(effect => {
      const effectData: ActiveEffectData = {
        name: effect.name || ability.parsed.name,
        duration: this.convertDuration(ability.parsed.duration),
        changes: this.generateChanges(effect),
        flags: this.generateEffectFlags(effect, ability),
        statuses: this.mapStatusEffects(effect)
      };
      
      effects.push(effectData);
    });
    
    // Transfer effects for passive abilities
    if (ability.parsed.type === AbilityType.PASSIVE) {
      effects.forEach(effect => {
        effect.flags = effect.flags || {};
        effect.flags.dae = effect.flags.dae || {};
        effect.flags.dae.transfer = true;
      });
    }
    
    return effects;
  }
  
  private generateChanges(effect: EffectData): ChangeData[] {
    const changes: ChangeData[] = [];
    
    switch(effect.type) {
      case "ac_bonus":
        changes.push({
          key: "system.attributes.ac.bonus",
          mode: 2, // ADD
          value: effect.value.toString(),
          priority: 20
        });
        break;
        
      case "ability_modifier":
        changes.push({
          key: `system.abilities.${effect.ability}.value`,
          mode: 2,
          value: effect.value.toString(),
          priority: 20
        });
        break;
        
      case "damage_resistance":
        effect.damageTypes.forEach(type => {
          changes.push({
            key: `flags.midi-qol.DR.${type}`,
            mode: 5, // OVERRIDE
            value: effect.amount.toString(),
            priority: 20
          });
        });
        break;
    }
    
    return changes;
  }
}
```

### 5. Macro Generation System

```typescript
class MacroGenerator {
  generateMacro(ability: AbilityDescription): MacroData | null {
    if (ability.complexity < AutomationComplexity.MODERATE) return null;
    
    const template = this.selectTemplate(ability);
    const macroCode = this.generateCode(ability, template);
    
    return {
      name: ability.parsed.name.replace(/\s+/g, ""),
      type: "script",
      scope: "global",
      command: macroCode,
      img: this.getIconPath(ability.parsed.type)
    };
  }
  
  private selectTemplate(ability: AbilityDescription): MacroTemplate {
    const patterns = [
      {
        condition: (a: AbilityDescription) => a.parsed.type === AbilityType.SAVE_ABILITY && a.parsed.effects.length > 0,
        template: "save-with-condition"
      },
      {
        condition: (a: AbilityDescription) => a.parsed.damage.some(d => d.conditional),
        template: "conditional-damage"
      },
      {
        condition: (a: AbilityDescription) => a.parsed.type === AbilityType.REACTION,
        template: "reaction-trigger"
      },
      {
        condition: (a: AbilityDescription) => a.parsed.resources.consumesResource,
        template: "resource-consumption"
      }
    ];
    
    const match = patterns.find(p => p.condition(ability));
    return this.templates.get(match?.template || "basic");
  }
  
  private generateCode(ability: AbilityDescription, template: MacroTemplate): string {
    let code = template.baseCode;
    
    // Replace template variables
    code = code.replace(/{{ABILITY_NAME}}/g, ability.parsed.name);
    code = code.replace(/{{EXECUTION_POINT}}/g, this.getExecutionPoint(ability));
    
    // Add specific logic based on ability features
    if (ability.parsed.conditions.length > 0) {
      code += this.generateConditionalLogic(ability.parsed.conditions);
    }
    
    if (ability.parsed.resources.consumesResource) {
      code += this.generateResourceConsumption(ability.parsed.resources);
    }
    
    return code;
  }
}
```

### 6. Output Generator

```typescript
class OutputGenerator {
  generateFoundryItem(automation: AutomationResult): FoundryItemData {
    const item: FoundryItemData = {
      _id: foundry.utils.randomID(),
      name: automation.item.name,
      type: automation.item.type,
      img: this.getIconPath(automation.item.type),
      system: automation.item.system,
      effects: automation.effects,
      flags: {
        ...automation.flags,
        "homebrew-automation": {
          generated: true,
          version: "1.0.0",
          source: "homebrew-converter"
        }
      },
      folder: null,
      sort: 0,
      ownership: { default: 0 }
    };
    
    return item;
  }
  
  generateCompendiumPack(items: FoundryItemData[]): CompendiumData {
    return {
      name: "homebrew-automation",
      label: "Homebrew Automation Items",
      type: "Item",
      system: "dnd5e",
      package: "world",
      private: false,
      flags: {},
      entries: items.map(item => ({
        _id: item._id,
        name: item.name,
        type: item.type,
        data: item
      }))
    };
  }
  
  generateImportScript(items: FoundryItemData[]): string {
    return `
// Automated import script for homebrew items
// Generated by Homebrew Automation Converter

const items = ${JSON.stringify(items, null, 2)};

async function importHomebrewItems() {
  ui.notifications.info("Importing homebrew automation items...");
  
  for (const itemData of items) {
    try {
      // Check if item already exists
      const existing = game.items.find(i => i.name === itemData.name);
      if (existing) {
        console.log(\`Item \${itemData.name} already exists, skipping...\`);
        continue;
      }
      
      // Create the item
      await Item.create(itemData);
      console.log(\`Created item: \${itemData.name}\`);
      
    } catch (error) {
      console.error(\`Failed to create item \${itemData.name}:\`, error);
    }
  }
  
  ui.notifications.info(\`Import complete! Created \${items.length} items.\`);
}

// Execute import
importHomebrewItems();
`;
  }
}
```

## Implementation Strategy

### Phase 1: Core Parser (MVP)
1. **Basic text pattern recognition**
   - Attack roll patterns
   - Damage patterns  
   - Save patterns
   - Simple conditions

2. **Simple automation generation**
   - Basic item creation
   - Simple Active Effects
   - Flag-based automation only

3. **Validation system**
   - JSON schema validation
   - Foundry compatibility checks
   - Error reporting

### Phase 2: Advanced Features
1. **Complex pattern recognition**
   - Multi-step abilities
   - Conditional effects
   - Resource consumption
   - Area effects

2. **Macro generation**
   - Template-based generation
   - Conditional logic insertion
   - Error handling

3. **Integration utilities**
   - Compendium generation
   - Import scripts
   - Module compatibility

### Phase 3: AI Enhancement
1. **Natural language processing**
   - Context understanding
   - Ambiguity resolution
   - Intent recognition

2. **Learning system**
   - Pattern refinement
   - User feedback integration
   - Automation optimization

### Phase 4: UI/UX
1. **Web interface**
   - Drag-and-drop text input
   - Real-time preview
   - Automation customization

2. **Foundry integration**
   - Module packaging
   - In-app processing
   - Direct item creation

## Development Guidelines

### Code Organization
```
src/
├── parser/
│   ├── text-analyzer.ts
│   ├── pattern-matcher.ts
│   └── entity-extractor.ts
├── automation/
│   ├── rule-engine.ts
│   ├── flag-generator.ts
│   ├── effect-generator.ts
│   └── macro-generator.ts
├── output/
│   ├── foundry-converter.ts
│   ├── compendium-builder.ts
│   └── script-generator.ts
├── templates/
│   ├── macros/
│   ├── effects/
│   └── items/
└── validation/
    ├── schema-validator.ts
    └── compatibility-checker.ts
```

### Testing Strategy
1. **Unit tests** for each parser pattern
2. **Integration tests** for complete workflows
3. **Compatibility tests** with real Foundry instances
4. **Regression tests** for edge cases

### Performance Considerations
1. **Lazy loading** of pattern libraries
2. **Caching** of generated templates  
3. **Batch processing** for multiple items
4. **Memory management** for large inputs

## Quality Assurance

### Validation Checklist
- [ ] Generated JSON validates against Foundry schema
- [ ] MidiQOL flags follow established patterns
- [ ] Active Effects use correct modes and priorities
- [ ] Macros handle errors gracefully
- [ ] Items integrate with existing automation modules
- [ ] Generated content performs as expected in test scenarios

### Compatibility Matrix
| Module | Version | Status | Notes |
|--------|---------|--------|-------|
| MidiQOL | 12.4+ | ✅ | Core dependency |
| DAE | 12.0+ | ✅ | Required for effects |
| Chris Premades | 5.0+ | ✅ | Compatible patterns |
| Gambit's Premades | 3.0+ | ✅ | Reaction compatibility |
| Convenient Effects | Any | ✅ | Status integration |

This architecture provides a robust foundation for converting homebrew content into professional-quality Foundry VTT automation compatible with the established ecosystem.
