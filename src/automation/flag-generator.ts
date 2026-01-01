import { ParsedAbility, AutomationComplexity, AbilityType } from '../types';

/**
 * Generates MidiQOL flags based on parsed ability data
 * Uses patterns extracted from successful automation modules
 */
export class FlagGenerator {

  /**
   * Generate MidiQOL flags for a parsed ability
   */
  public generateMidiQOLFlags(ability: ParsedAbility): Record<string, any> {
    const flags: Record<string, any> = {};

    // Add core MidiQOL flags
    this.addAdvantageFlags(flags, ability);
    this.addDisadvantageFlags(flags, ability);
    this.addDamageFlags(flags, ability);
    this.addSaveFlags(flags, ability);
    this.addMacroFlags(flags, ability);
    this.addConditionalFlags(flags, ability);

    // Wrap in midi-qol namespace
    return {
      "midi-qol": flags
    };
  }

  private addAdvantageFlags(flags: Record<string, any>, ability: ParsedAbility): void {
    ability.conditions.forEach(condition => {
      if (condition.type === 'advantage') {
        const target = condition.value;
        
        if (target === 'all' || target === 'attack') {
          flags["advantage.attack.all"] = true;
        } else if (target === 'saves' || target === 'save') {
          flags["advantage.ability.save.all"] = true;
        } else if (target === 'checks' || target === 'check') {
          flags["advantage.ability.check.all"] = true;
        } else {
          // Specific ability advantage (e.g., 'strength')
          const abilityCode = this.getAbilityCode(target);
          if (abilityCode) {
            flags[`advantage.ability.check.${abilityCode}`] = true;
            flags[`advantage.ability.save.${abilityCode}`] = true;
          } else {
            // Try skill advantage
            const skillCode = this.getSkillCode(target);
            if (skillCode) {
              flags[`advantage.skill.${skillCode}`] = true;
            }
          }
        }
      }
    });
  }

  private addDisadvantageFlags(flags: Record<string, any>, ability: ParsedAbility): void {
    ability.conditions.forEach(condition => {
      if (condition.type === 'disadvantage') {
        const target = condition.value;
        
        if (target === 'all' || target === 'attack') {
          flags["disadvantage.attack.all"] = true;
        } else if (target === 'saves' || target === 'save') {
          flags["disadvantage.ability.save.all"] = true;
        } else if (target === 'checks' || target === 'check') {
          flags["disadvantage.ability.check.all"] = true;
        } else {
          // Specific ability disadvantage
          const abilityCode = this.getAbilityCode(target);
          if (abilityCode) {
            flags[`disadvantage.ability.check.${abilityCode}`] = true;
            flags[`disadvantage.ability.save.${abilityCode}`] = true;
          } else {
            // Try skill disadvantage
            const skillCode = this.getSkillCode(target);
            if (skillCode) {
              flags[`disadvantage.skill.${skillCode}`] = true;
            }
          }
        }
      }
    });
  }

  private addDamageFlags(flags: Record<string, any>, ability: ParsedAbility): void {
    // Add damage resistance flags
    ability.effects.forEach(effect => {
      if (effect.type === 'damage_resistance' && effect.damageTypes) {
        effect.damageTypes.forEach(damageType => {
          const amount = effect.amount ?? 0.5; // Default to half damage
          if (amount === 0) {
            // Immunity
            flags[`DI.${damageType}`] = true;
          } else if (amount < 1) {
            // Resistance
            flags[`DR.${damageType}`] = amount;
          }
        });
      }
    });

    // NOTE: Conditional damage bonuses would require custom macros in Foundry.
    // We don't generate onUseMacroName here since the macros don't exist.
    // If conditional damage logic is needed, macros must be created manually.
  }

  private addSaveFlags(flags: Record<string, any>, ability: ParsedAbility): void {
    // Add save-related flags based on ability type
    if (ability.type === AbilityType.SAVE_ABILITY && ability.saves.length > 0) {
      const save = ability.saves[0];
      
      // Set save DC if it's a flat value
      if (save.scaling === 'flat' && save.dc !== null) {
        flags["saveDC"] = save.dc;
      }
      
      // Add save scaling flags if needed
      if (save.scaling !== 'flat') {
        flags[`save.${save.ability}.scaling`] = save.scaling;
      }
    }
  }

  private addMacroFlags(flags: Record<string, any>, ability: ParsedAbility): void {
    // NOTE: We don't generate onUseMacroName flags because the macros would need to be
    // created separately in Foundry. Instead, we use MidiQOL's built-in workflow flags.

    // Add effect activation for abilities with conditions/effects
    if (ability.effects.length > 0 || ability.conditions.length > 0) {
      flags["effectActivation"] = true;
    }

    // For attack+save combos (like Agonizing Touch), configure workflow correctly
    const hasAttack = ability.type === AbilityType.SPELL_ATTACK || ability.type === AbilityType.WEAPON_ATTACK;
    const hasSave = ability.saves.length > 0;
    const hasCondition = ability.conditions.length > 0;

    if (hasAttack && hasSave) {
      // Force workflow processing
      flags["forceWorkflow"] = true;

      if (hasCondition && ability.damage.length > 0) {
        // Attack does damage, save applies condition only (no save damage)
        flags["noDamSave"] = true;
        flags["saveDamage"] = "nodam";
        flags["otherSaveDamage"] = "nodam";
        flags["rollOtherDamage"] = "none";
      }
    }
  }

  private addConditionalFlags(flags: Record<string, any>, ability: ParsedAbility): void {
    // Add item condition flags for conditional abilities
    if (ability.conditions.some(c => c.condition)) {
      const conditions = ability.conditions
        .filter(c => c.condition)
        .map(c => c.condition);
      
      if (conditions.length > 0) {
        flags["itemCondition"] = conditions.join(" && ");
      }
    }

    // Add target-specific conditions
    if (ability.target.type === 'creature') {
      // Could add creature type restrictions, alignment restrictions, etc.
      // This would be expanded based on more sophisticated text analysis
    }

    // Add range-based conditions
    if (ability.range.value && ability.range.value > 5) {
      // Long-range abilities might need special targeting
      flags["checkRange"] = true;
    }
  }

  private determineExecutionPoint(ability: ParsedAbility): string {
    // Choose appropriate execution point based on ability characteristics
    if (ability.type === AbilityType.SAVE_ABILITY) {
      return "postSave";
    }
    
    if (ability.damage.length > 0) {
      return "postDamageRoll";
    }
    
    if (ability.effects.length > 0) {
      return "preActiveEffects";
    }
    
    if (ability.resources.consumesResource) {
      return "preItemRoll";
    }
    
    return "postItemRoll";
  }

  private getAbilityCode(abilityName: string): string | null {
    const abilityMap: Record<string, string> = {
      'strength': 'str',
      'str': 'str',
      'dexterity': 'dex', 
      'dex': 'dex',
      'constitution': 'con',
      'con': 'con',
      'intelligence': 'int',
      'int': 'int',
      'wisdom': 'wis',
      'wis': 'wis',
      'charisma': 'cha',
      'cha': 'cha'
    };
    
    return abilityMap[abilityName.toLowerCase()] || null;
  }

  private getSkillCode(skillName: string): string | null {
    const skillMap: Record<string, string> = {
      'acrobatics': 'acr',
      'animal handling': 'ani',
      'arcana': 'arc',
      'athletics': 'ath',
      'deception': 'dec',
      'history': 'his',
      'insight': 'ins',
      'intimidation': 'inti',
      'investigation': 'inv',
      'medicine': 'med',
      'nature': 'nat',
      'perception': 'prc',
      'performance': 'per',
      'persuasion': 'pers',
      'religion': 'rel',
      'sleight of hand': 'slt',
      'stealth': 'ste',
      'survival': 'sur'
    };
    
    return skillMap[skillName.toLowerCase()] || null;
  }

  /**
   * Generate DAE (Dynamic Active Effects) flags
   */
  public generateDAEFlags(ability: ParsedAbility): Record<string, any> {
    const flags: Record<string, any> = {};

    // Add transfer flags for passive abilities
    if (ability.type === AbilityType.PASSIVE) {
      flags["transfer"] = true;
    }

    // Add stackable flags based on effect type
    if (ability.effects.length > 0) {
      const hasStackableEffects = ability.effects.some(
        effect => effect.type === 'ac_bonus' || effect.type === 'ability_modifier'
      );
      
      if (hasStackableEffects) {
        flags["stackable"] = "multi";
      } else {
        flags["stackable"] = "noneName";
      }
    }

    // Add special duration handling
    if (ability.duration.concentration) {
      flags["specialDuration"] = ["isConcentration"];
    }

    return {
      "dae": flags
    };
  }

  /**
   * Generate Chris Premades compatible flags  
   */
  public generateChrisPremadeFlags(ability: ParsedAbility): Record<string, any> {
    const flags: Record<string, any> = {};

    // Mark as generated by our system
    flags["identifier"] = `automancy-${ability.name.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Add complexity level for debugging
    flags["complexity"] = ability.complexity;
    
    // Add automation type
    flags["automationType"] = ability.type;

    return {
      "chris-premades": flags
    };
  }

  /**
   * Generate all module flags at once
   */
  public generateAllFlags(ability: ParsedAbility): Record<string, any> {
    return {
      ...this.generateMidiQOLFlags(ability),
      ...this.generateDAEFlags(ability),
      ...this.generateChrisPremadeFlags(ability),
      // Add marker for our system
      "automancy": {
        generated: true,
        version: "0.1.0",
        complexity: ability.complexity,
        sourceType: ability.type
      }
    };
  }
}