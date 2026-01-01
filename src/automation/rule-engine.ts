import { 
  ParsedAbility, 
  AutomationResult, 
  FoundryItemData, 
  ActiveEffectData,
  MacroData,
  AbilityType,
  AutomationComplexity 
} from '../types';
import { FlagGenerator } from './flag-generator';
import { EffectGenerator } from './effect-generator';
// UUID import removed - using generateFoundryId() for 16-char alphanumeric IDs

/**
 * Core automation rule engine that converts parsed abilities into Foundry automation
 * Based on analysis of successful automation modules
 */
export class RuleEngine {
  private flagGenerator: FlagGenerator;
  private effectGenerator: EffectGenerator;

  constructor() {
    this.flagGenerator = new FlagGenerator();
    this.effectGenerator = new EffectGenerator();
  }

  /**
   * Generate complete automation for a parsed ability
   */
  public generateAutomation(ability: ParsedAbility): AutomationResult {
    // Generate effect IDs first so they can be shared between effects and activities
    const effectIds = this.generateEffectIds(ability);

    const effects = this.generateEffects(ability, effectIds);
    const item = this.generateItemData(ability, effectIds);
    const macros = this.generateMacros(ability);
    const flags = this.generateFlags(ability);

    return {
      item,
      effects,
      macros,
      flags,
      complexity: ability.complexity
    };
  }

  /**
   * Pre-generate effect IDs for conditions so they can be shared between effects and activities
   */
  private generateEffectIds(ability: ParsedAbility): string[] {
    return ability.conditions.map(() => this.generateFoundryId());
  }

  private generateItemData(ability: ParsedAbility, effectIds: string[]): FoundryItemData {
    const itemType = this.determineItemType(ability.type);

    const baseItem: FoundryItemData = {
      _id: this.generateFoundryId(),
      name: ability.name,
      type: itemType,
      img: this.getIconPath(ability.type),
      system: this.generateSystemData(ability, itemType, effectIds),
      effects: [], // Will be populated later
      flags: {}, // Will be populated later
      folder: null,
      sort: 0,
      ownership: { default: 0 }
    };

    return baseItem;
  }

  /**
   * Generate a 16-character alphanumeric ID compatible with Foundry VTT
   */
  private generateFoundryId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 16; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  private determineItemType(abilityType: AbilityType): FoundryItemData['type'] {
    switch (abilityType) {
      case AbilityType.WEAPON_ATTACK:
        return 'weapon';
      // Spell attacks and save abilities work better as 'feat' in D&D5e 4.x
      // because they use the activities system for attack/save configuration
      case AbilityType.SPELL_ATTACK:
      case AbilityType.SAVE_ABILITY:
      case AbilityType.PASSIVE:
      case AbilityType.UTILITY:
      case AbilityType.HEALING:
      case AbilityType.REACTION:
      default:
        return 'feat';
    }
  }

  /**
   * Generate D&D5e 4.x system data with activities structure
   */
  private generateSystemData(ability: ParsedAbility, itemType: string, effectIds: string[]): any {
    // Build description from ability text
    const description = this.generateDescription(ability);

    // D&D5e 4.x uses activities instead of actionType, damage, save at item level
    const baseSystem: any = {
      description: {
        value: description,
        chat: ""
      },
      uses: {
        max: "",
        spent: 0,
        recovery: []
      },
      requirements: "",
      activities: this.generateActivities(ability, effectIds),
      advancement: [],
      identifier: "",
      source: {
        revision: 1,
        rules: "2024"
      },
      crewed: false,
      enchant: {},
      prerequisites: {
        items: [],
        repeatable: false
      },
      properties: [],
      type: {
        value: "",
        subtype: ""
      }
    };

    // Add type-specific data
    if (itemType === 'weapon') {
      return {
        ...baseSystem,
        quantity: 1,
        weight: { value: 0, units: "lb" },
        price: { value: 0, denomination: "gp" },
        rarity: "common",
        identified: true,
        equipped: false,
        proficient: true,
        weaponType: "simpleM",
        baseItem: ""
      };
    }

    // Default feat/feature structure
    return baseSystem;
  }

  /**
   * Generate HTML description from parsed ability
   */
  private generateDescription(ability: ParsedAbility): string {
    const parts: string[] = [];

    // Attack line
    if (ability.attackType) {
      const attackTypeLabel = ability.attackType === 'msak' ? 'Melee Spell Attack' :
                              ability.attackType === 'rsak' ? 'Ranged Spell Attack' :
                              ability.attackType === 'mwak' ? 'Melee Weapon Attack' :
                              ability.attackType === 'rwak' ? 'Ranged Weapon Attack' : 'Attack';
      const attackBonus = ability.attackBonus ? `+${ability.attackBonus}` : '+X';
      const range = ability.range.value ? `reach ${ability.range.value} ft.` : 'reach 5 ft.';
      parts.push(`<p><strong>${attackTypeLabel}:</strong> ${attackBonus} to hit, ${range}, one ${ability.target.type || 'creature'}.</p>`);
    }

    // Damage line
    if (ability.damage.length > 0) {
      const dmgParts = ability.damage.map(d => `${d.formula} ${d.type} damage`).join(' plus ');
      parts.push(`<p><strong>Hit:</strong> ${dmgParts}.</p>`);
    }

    // Save and condition
    if (ability.saves.length > 0 && ability.conditions.length > 0) {
      const save = ability.saves[0];
      const cond = ability.conditions[0];
      const abilityName = save.ability.toUpperCase();
      parts.push(`<p>The target must succeed on a DC ${save.dc} ${abilityName} saving throw or be <strong>${cond.name}</strong>${cond.saveEnds ? ' (save ends at end of turn)' : ''}.</p>`);
    } else if (ability.saves.length > 0) {
      const save = ability.saves[0];
      parts.push(`<p>DC ${save.dc} ${save.ability.toUpperCase()} saving throw.</p>`);
    }

    // Condition descriptions
    for (const cond of ability.conditions) {
      if (cond.name === 'dazed') {
        parts.push(`<p><strong>Dazed:</strong> A dazed creature can only take an action, a bonus action, OR move on their turn - not all three.</p>`);
      }
    }

    return parts.length > 0 ? parts.join('\n') : `<p>${ability.name}</p>`;
  }

  /**
   * Generate D&D5e 4.x activities object
   */
  private generateActivities(ability: ParsedAbility, effectIds: string[]): Record<string, any> {
    const activities: Record<string, any> = {};
    const hasAttack = ability.type === AbilityType.SPELL_ATTACK || ability.type === AbilityType.WEAPON_ATTACK;
    const hasSave = ability.saves.length > 0;
    const hasCondition = ability.conditions.length > 0;

    // Attack activity (handles damage)
    if (hasAttack) {
      activities['dnd5eactivity000'] = this.generateAttackActivity(ability, effectIds);
    }

    // Save activity (handles condition application)
    if (hasSave) {
      // For attack+save combos, the save is condition-only (no damage)
      const isConditionOnly = hasAttack && hasCondition;
      activities['dnd5eactivity100'] = this.generateSaveActivity(ability, isConditionOnly, effectIds);
    }

    return activities;
  }

  /**
   * Generate attack activity for D&D5e 4.x
   */
  private generateAttackActivity(ability: ParsedAbility, effectIds: string[]): any {
    const isSpell = ability.type === AbilityType.SPELL_ATTACK;
    const isMelee = ability.attackType === 'msak' || ability.attackType === 'mwak';

    // Use the shared effect IDs
    const effectRefs = effectIds.map(id => ({
      _id: id,
      level: {}
    }));

    return {
      _id: "dnd5eactivity000",
      type: "attack",
      activation: {
        type: ability.activation.type || "action",
        value: ability.activation.cost || 1,
        condition: "",
        override: false
      },
      consumption: {
        targets: [],
        scaling: { allowed: false, max: "" },
        spellSlot: true
      },
      description: { chatFlavor: "" },
      duration: {
        concentration: ability.duration.concentration || false,
        units: ability.duration.units || "inst",
        special: "",
        override: false
      },
      effects: effectRefs,
      range: {
        units: isMelee ? "touch" : (ability.range.units || "ft"),
        special: "",
        override: false
      },
      target: {
        template: {
          count: "",
          contiguous: false,
          type: "",
          size: "",
          width: "",
          height: "",
          units: "any"
        },
        affects: {
          count: String(ability.target.value || 1),
          type: ability.target.type || "creature",
          choice: false,
          special: ""
        },
        prompt: true,
        override: false
      },
      uses: { spent: 0, max: "", recovery: [] },
      attack: {
        ability: "",
        bonus: ability.attackBonus ? String(ability.attackBonus) : "",
        critical: { threshold: null },
        flat: !!ability.attackBonus,
        type: {
          value: isMelee ? "melee" : "ranged",
          classification: isSpell ? "spell" : "weapon"
        }
      },
      damage: {
        critical: { bonus: "" },
        includeBase: true,
        parts: this.generateActivityDamageParts(ability)
      },
      sort: 0,
      flags: {},
      ...this.generateMidiActivityProperties()
    };
  }

  /**
   * Generate save activity for D&D5e 4.x
   * @param isConditionOnly - If true, this save applies a condition only, no damage
   */
  private generateSaveActivity(ability: ParsedAbility, isConditionOnly: boolean, effectIds: string[]): any {
    const save = ability.saves[0];
    const isMelee = ability.attackType === 'msak' || ability.attackType === 'mwak';

    // Use the shared effect IDs - for save activities, effects apply on failed save
    const effectRefs = effectIds.map(id => ({
      _id: id,
      onSave: false, // Effect does NOT apply on successful save
      level: { min: null, max: null }
    }));

    return {
      _id: "dnd5eactivity100",
      type: "save",
      activation: {
        type: ability.activation.type || "action",
        value: ability.activation.cost || 1,
        condition: "",
        override: false
      },
      consumption: {
        targets: [],
        scaling: { allowed: false, max: "" },
        spellSlot: true
      },
      description: { chatFlavor: "" },
      duration: {
        concentration: ability.duration.concentration || false,
        units: ability.duration.units || "inst",
        special: "",
        override: false
      },
      effects: effectRefs,
      range: {
        units: isMelee ? "touch" : (ability.range.units || "ft"),
        special: "",
        override: false
      },
      target: {
        template: {
          count: "",
          contiguous: false,
          type: "",
          size: "",
          width: "",
          height: "",
          units: "any"
        },
        affects: {
          count: String(ability.target.value || 1),
          type: ability.target.type || "creature",
          choice: false,
          special: ""
        },
        prompt: true,
        override: false
      },
      uses: { spent: 0, max: "", recovery: [] },
      damage: {
        // KEY FIX: For condition-only saves, onSave must be "none" to prevent double damage
        onSave: isConditionOnly ? "none" : "half",
        parts: isConditionOnly ? [{
          custom: { enabled: false, formula: "" },
          number: null,
          denomination: null,
          bonus: "",
          types: ability.damage.length > 0 ? [ability.damage[0].type] : [],
          scaling: { number: 1 }
        }] : this.generateActivityDamageParts(ability),
        critical: { allow: false }
      },
      save: {
        ability: [save.ability],
        dc: {
          calculation: "",
          formula: String(save.dc)
        }
      },
      sort: 0,
      flags: {},
      visibility: {
        level: { min: null, max: null },
        requireAttunement: false,
        requireIdentification: false,
        requireMagic: false,
        identifier: ""
      },
      ...this.generateMidiActivityProperties(),
      friendlySave: "default",
      name: ""
    };
  }

  /**
   * Generate damage parts in D&D5e 4.x activity format
   */
  private generateActivityDamageParts(ability: ParsedAbility): any[] {
    return ability.damage.map(dmg => {
      // Parse formula like "4d6" or "2d8+3"
      const match = dmg.formula.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
      if (match) {
        return {
          number: parseInt(match[1]),
          denomination: parseInt(match[2]),
          bonus: match[3] || "",
          types: [dmg.type],
          custom: { enabled: false, formula: "" },
          scaling: { mode: "", number: null, formula: "" }
        };
      }
      // Fallback for non-standard formulas
      return {
        number: null,
        denomination: null,
        bonus: "",
        types: [dmg.type],
        custom: { enabled: true, formula: dmg.formula },
        scaling: { mode: "", number: null, formula: "" }
      };
    });
  }

  /**
   * Generate MidiQOL activity properties
   */
  private generateMidiActivityProperties(): any {
    return {
      useConditionText: "",
      useConditionReason: "",
      effectConditionText: "",
      macroData: { name: "", command: "" },
      ignoreTraits: {
        idi: false, idr: false, idv: false, ida: false, idm: false
      },
      midiProperties: {
        ignoreTraits: [],
        triggeredActivityId: "none",
        triggeredActivityConditionText: "",
        triggeredActivityTargets: "targets",
        triggeredActivityRollAs: "self",
        autoConsume: false,
        forceConsumeDialog: "default",
        forceRollDialog: "default",
        forceDamageDialog: "default",
        confirmTargets: "default",
        autoTargetType: "any",
        autoTargetAction: "default",
        automationOnly: false,
        otherActivityCompatible: true,
        otherActivityAsParentType: true,
        identifier: "",
        displayActivityName: false,
        rollMode: "default",
        chooseEffects: false,
        toggleEffect: false,
        ignoreFullCover: false,
        removeChatButtons: "default",
        magicEffect: false,
        magicDamage: false,
        noConcentrationCheck: false,
        autoCEEffects: "default"
      },
      isOverTimeFlag: false,
      overTimeProperties: {
        saveRemoves: true,
        preRemoveConditionText: "",
        postRemoveConditionText: ""
      },
      otherActivityId: "",
      otherActivityAsParentType: true
    };
  }

  private determineActionType(ability: ParsedAbility): string {
    // Use parsed attackType if available
    if (ability.attackType) {
      return ability.attackType;
    }
    switch (ability.type) {
      case AbilityType.WEAPON_ATTACK:
        return 'mwak'; // Default to melee weapon attack
      case AbilityType.SPELL_ATTACK:
        return 'rsak'; // Default to ranged spell attack
      case AbilityType.SAVE_ABILITY:
        return 'save';
      case AbilityType.HEALING:
        return 'heal';
      case AbilityType.UTILITY:
        return 'util';
      default:
        return 'other';
    }
  }

  private getAttackBonus(ability: ParsedAbility): string {
    // This would need to be extracted from parsing in a real implementation
    // For now, return empty string to use default calculations
    return "";
  }

  private generateDamageParts(ability: ParsedAbility): [string, string][] {
    return ability.damage.map(damage => [
      damage.formula,
      damage.type
    ]);
  }

  private generateSaveData(ability: ParsedAbility): any {
    if (ability.saves.length === 0) {
      return {
        ability: "",
        dc: null,
        scaling: "spell"
      };
    }

    const save = ability.saves[0]; // Use first save for now
    return {
      ability: save.ability,
      dc: save.dc,
      scaling: save.scaling
    };
  }

  private generateUsesData(ability: ParsedAbility): any {
    if (!ability.resources.consumesResource) {
      return {
        value: null,
        max: "",
        per: null,
        recovery: ""
      };
    }

    switch (ability.resources.type) {
      case 'per_day':
        return {
          value: ability.resources.amount,
          max: ability.resources.amount?.toString() || "",
          per: "day",
          recovery: ""
        };
      case 'per_rest':
        return {
          value: ability.resources.amount,
          max: ability.resources.amount?.toString() || "",
          per: "lr", // Assume long rest, could be refined
          recovery: ""
        };
      case 'recharge':
        return {
          value: null,
          max: "",
          per: null,
          recovery: ""
        };
      default:
        return {
          value: null,
          max: "",
          per: null,
          recovery: ""
        };
    }
  }

  private generateEffects(ability: ParsedAbility, effectIds: string[]): ActiveEffectData[] {
    return this.effectGenerator.generateActiveEffects(ability, effectIds);
  }

  private generateMacros(ability: ParsedAbility): MacroData[] {
    const macros: MacroData[] = [];

    // Only generate macros for moderate+ complexity
    if (ability.complexity >= AutomationComplexity.MODERATE) {
      const macro = this.generateBasicMacro(ability);
      if (macro) {
        macros.push(macro);
      }
    }

    return macros;
  }

  private generateBasicMacro(ability: ParsedAbility): MacroData | null {
    // Generate basic macro template for complex abilities
    const macroName = ability.name.replace(/\s+/g, "");
    
    let macroCode = `// Generated macro for ${ability.name}\n`;
    macroCode += `// Complexity Level: ${ability.complexity}\n\n`;
    
    macroCode += `const workflow = MidiQOL.Workflow.getWorkflow(args[0].uuid);\n`;
    macroCode += `if (!workflow) return;\n\n`;

    // Add ability-specific logic based on type
    if (ability.type === AbilityType.SAVE_ABILITY && ability.effects.length > 0) {
      macroCode += this.generateSaveWithEffectsMacro(ability);
    } else if (ability.conditions.length > 0) {
      macroCode += this.generateConditionalLogic(ability);
    } else if (ability.resources.consumesResource) {
      macroCode += this.generateResourceConsumption(ability);
    } else {
      // Basic macro template
      macroCode += `console.log("${ability.name} macro executed");\n`;
    }

    return {
      name: macroName,
      type: 'script',
      scope: 'global',
      command: macroCode,
      img: this.getIconPath(ability.type)
    };
  }

  private generateSaveWithEffectsMacro(ability: ParsedAbility): string {
    let code = `// Apply effects based on save results\n`;
    code += `if (args[0].macroPass !== "postSave") return;\n\n`;
    code += `for (let target of args[0].failedSaves) {\n`;
    code += `  // Apply failure effects to target\n`;
    code += `  console.log("Applying effects to", target.name);\n`;
    code += `  // TODO: Apply specific effects based on ability\n`;
    code += `}\n\n`;
    return code;
  }

  private generateConditionalLogic(ability: ParsedAbility): string {
    let code = `// Handle conditional effects\n`;
    code += `const conditions = ${JSON.stringify(ability.conditions, null, 2)};\n`;
    code += `// TODO: Implement condition-specific logic\n\n`;
    return code;
  }

  private generateResourceConsumption(ability: ParsedAbility): string {
    let code = `// Handle resource consumption\n`;
    code += `if (args[0].macroPass !== "preItemRoll") return;\n\n`;
    code += `const actor = args[0].actor;\n`;
    code += `// TODO: Check and consume resources\n\n`;
    return code;
  }

  private generateFlags(ability: ParsedAbility): Record<string, any> {
    return this.flagGenerator.generateMidiQOLFlags(ability);
  }

  private getIconPath(abilityType: AbilityType): string {
    // Use core Foundry SVG icons for maximum compatibility
    const iconMap = {
      [AbilityType.WEAPON_ATTACK]: "icons/svg/sword.svg",
      [AbilityType.SPELL_ATTACK]: "icons/svg/lightning.svg",
      [AbilityType.SAVE_ABILITY]: "icons/svg/shield.svg",
      [AbilityType.HEALING]: "icons/svg/heal.svg",
      [AbilityType.UTILITY]: "icons/svg/cog.svg",
      [AbilityType.PASSIVE]: "icons/svg/eye.svg",
      [AbilityType.REACTION]: "icons/svg/clockwork.svg"
    };

    return iconMap[abilityType] || "icons/svg/mystery-man.svg";
  }
}