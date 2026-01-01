import { ParsedAbility, ActiveEffectData, ChangeData, EffectData, AbilityType } from '../types';

// Generate 16-character alphanumeric ID for Foundry VTT
function generateFoundryId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Generates Active Effects for parsed abilities
 * Based on patterns from DAE and successful automation modules
 */
export class EffectGenerator {

  /**
   * Generate Active Effects for a parsed ability
   * @param ability - The parsed ability data
   * @param effectIds - Optional pre-generated IDs for condition effects (to match activity references)
   */
  public generateActiveEffects(ability: ParsedAbility, effectIds?: string[]): ActiveEffectData[] {
    const effects: ActiveEffectData[] = [];

    // Generate effects for each parsed effect
    ability.effects.forEach(effect => {
      const activeEffect = this.createActiveEffect(effect, ability);
      if (activeEffect) {
        effects.push(activeEffect);
      }
    });

    // Generate condition effects using provided IDs if available
    ability.conditions.forEach((condition, idx) => {
      const effectId = effectIds && effectIds[idx] ? effectIds[idx] : generateFoundryId();
      const conditionEffect = this.createConditionEffect(ability, effectId, idx);
      if (conditionEffect) {
        effects.push(conditionEffect);
      }
    });

    // Set transfer flags for passive abilities
    if (ability.type === AbilityType.PASSIVE) {
      effects.forEach(effect => {
        effect.transfer = true;
        effect.flags = effect.flags || {};
        effect.flags.dae = effect.flags.dae || {};
        effect.flags.dae.transfer = true;
      });
    }

    return effects;
  }

  private createActiveEffect(effect: EffectData, ability: ParsedAbility): ActiveEffectData | null {
    const changes = this.generateChanges(effect);
    
    if (changes.length === 0) {
      return null;
    }

    const activeEffect: ActiveEffectData = {
      _id: generateFoundryId(),
      name: effect.name || `${ability.name} Effect`,
      img: this.getEffectIcon(effect.type),
      changes: changes,
      duration: this.convertDuration(ability),
      flags: this.generateEffectFlags(effect, ability),
      statuses: this.mapStatusEffects(effect),
      transfer: ability.type === AbilityType.PASSIVE,
      disabled: false
    };

    return activeEffect;
  }

  private generateChanges(effect: EffectData): ChangeData[] {
    const changes: ChangeData[] = [];

    switch (effect.type) {
      case 'ac_bonus':
        if (effect.value !== undefined) {
          changes.push({
            key: "system.attributes.ac.bonus",
            mode: 2, // ADD mode
            value: effect.value.toString(),
            priority: 20
          });
        }
        break;

      case 'ability_modifier':
        if (effect.ability && effect.value !== undefined) {
          changes.push({
            key: `system.abilities.${effect.ability}.value`,
            mode: 2, // ADD mode
            value: effect.value.toString(),
            priority: 20
          });
        }
        break;

      case 'damage_resistance':
        if (effect.damageTypes) {
          effect.damageTypes.forEach(damageType => {
            if (effect.amount === 0) {
              // Immunity
              changes.push({
                key: "system.traits.di.value",
                mode: 0, // CUSTOM mode
                value: damageType,
                priority: 20
              });
            } else {
              // Resistance
              changes.push({
                key: "system.traits.dr.value", 
                mode: 0, // CUSTOM mode
                value: damageType,
                priority: 20
              });
            }
          });
        }
        break;

      case 'advantage':
        // Advantage effects are typically handled via MidiQOL flags
        // But we can add ATL (Advanced Token Lighting) effects for visual indicators
        changes.push({
          key: "ATL.light.color",
          mode: 5, // OVERRIDE mode
          value: "#00ff00", // Green light for advantage
          priority: 20
        });
        break;

      case 'disadvantage':
        // Similar to advantage, mostly handled by flags
        changes.push({
          key: "ATL.light.color",
          mode: 5, // OVERRIDE mode  
          value: "#ff0000", // Red light for disadvantage
          priority: 20
        });
        break;

      case 'condition':
        // Status conditions are handled via the statuses array
        // No changes needed here
        break;
    }

    return changes;
  }

  private createConditionEffect(ability: ParsedAbility, effectId: string, conditionIndex: number): ActiveEffectData | null {
    const condition = ability.conditions[conditionIndex];
    if (!condition) return null;

    const statusEffects: string[] = [];
    const changes: ChangeData[] = [];

    // Handle advantage/disadvantage differently
    if (condition.type === 'advantage' || condition.type === 'disadvantage') {
      // These are handled by MidiQOL flags, skip creating effects
      return null;
    }

    // Try to map to standard 5e or MCDM conditions
    const status = this.mapConditionToStatus(condition.type);
    if (status) {
      statusEffects.push(status);
      // Add appropriate changes for the condition
      const conditionChanges = this.getConditionChanges(status);
      changes.push(...conditionChanges);
    }

    if (statusEffects.length === 0 && changes.length === 0) {
      return null;
    }

    // Build proper flags based on condition type
    const flags: Record<string, any> = {
      dae: {
        stackable: "noneName",
        specialDuration: condition.saveEnds && condition.saveEndsTiming === 'end_of_turn'
          ? ["turnEndSource"]
          : condition.saveEnds ? ["turnStart"] : [],
        macroRepeat: condition.saveEnds ? "endEveryTurn" : "none"
      }
    };

    // Add MCDM condition flags
    if (status && ['dazed', 'bleeding', 'weakened', 'slowed'].includes(status)) {
      flags["chris-premades"] = {
        condition: true,
        conditionType: status,
        customCondition: true
      };
      flags["convenient-effects"] = {
        isCustom: true,
        description: this.getConditionDescription(status)
      };
      flags["automancy"] = {
        generated: true,
        mcdmCondition: true,
        conditionType: status,
        saveEnds: condition.saveEnds,
        saveEndsTiming: condition.saveEndsTiming,
        saveDC: ability.saves.length > 0 ? ability.saves[0].dc : null,
        saveType: ability.saves.length > 0 ? ability.saves[0].ability : null,
        description: this.getConditionDescription(status)
      };
    }

    // Build duration based on save-ends or parsed duration
    const duration: ActiveEffectData['duration'] = condition.saveEnds
      ? { rounds: 100, turns: 0 }  // Long duration, removed by save
      : this.convertDuration(ability);

    return {
      _id: effectId,
      name: `${ability.name} - ${this.formatConditionName(condition.name || condition.type)}`,
      img: this.getConditionIcon(statusEffects[0]),
      changes: changes,
      duration: duration,
      flags: flags,
      statuses: statusEffects,
      transfer: false,
      disabled: false
    };
  }

  private getConditionDescription(conditionType: string): string {
    const descriptions: Record<string, string> = {
      'dazed': "Can only take an action, bonus action, OR move - not all three.",
      'bleeding': "Takes ongoing damage at the start of each turn.",
      'weakened': "Deals half damage with attacks.",
      'slowed': "Movement speed is halved."
    };
    return descriptions[conditionType] || "";
  }

  private formatConditionName(name: string): string {
    // Capitalize first letter of each word
    return name.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private convertDuration(ability: ParsedAbility): ActiveEffectData['duration'] {
    const duration = ability.duration;
    
    const durationData: ActiveEffectData['duration'] = {};

    if (duration.units === 'inst') {
      // Instantaneous effects don't need duration
      return durationData;
    }

    if (duration.value === null) {
      // Permanent effects
      return durationData;
    }

    switch (duration.units) {
      case 'round':
        durationData.rounds = duration.value;
        break;
      case 'turn':
        durationData.turns = duration.value;
        break;
      case 'minute':
        durationData.seconds = duration.value * 60;
        break;
      case 'hour':
        durationData.seconds = duration.value * 3600;
        break;
      case 'day':
        durationData.seconds = duration.value * 86400;
        break;
    }

    return durationData;
  }

  private generateEffectFlags(effect: EffectData, ability: ParsedAbility): Record<string, any> {
    const flags: Record<string, any> = {
      dae: {}
    };

    // Set stackable behavior
    if (effect.type === 'ac_bonus' || effect.type === 'ability_modifier') {
      flags.dae.stackable = "multi";
    } else {
      flags.dae.stackable = "noneName";
    }

    // Set transfer behavior
    if (ability.type === AbilityType.PASSIVE) {
      flags.dae.transfer = true;
    }

    // Add special duration handling
    if (ability.duration.concentration) {
      flags.dae.specialDuration = ["isConcentration"];
    }

    // Add our system identifier
    flags.automancy = {
      effectType: effect.type,
      generated: true
    };

    return flags;
  }

  private mapStatusEffects(effect: EffectData): string[] {
    const statuses: string[] = [];

    switch (effect.type) {
      case 'condition':
        // Map specific conditions to status effects
        const status = this.mapConditionToStatus(effect.condition || '');
        if (status) {
          statuses.push(status);
        }
        break;
    }

    return statuses;
  }

  private mapConditionToStatus(conditionName: string): string | null {
    const conditionMap: Record<string, string> = {
      // Standard D&D 5e conditions
      'blinded': 'blinded',
      'charmed': 'charmed',
      'deafened': 'deafened',
      'frightened': 'frightened',
      'grappled': 'grappled',
      'incapacitated': 'incapacitated',
      'invisible': 'invisible',
      'paralyzed': 'paralyzed',
      'petrified': 'petrified',
      'poisoned': 'poisoned',
      'prone': 'prone',
      'restrained': 'restrained',
      'stunned': 'stunned',
      'unconscious': 'unconscious',
      'exhaustion': 'exhaustion',
      // MCDM custom conditions
      'dazed': 'dazed',
      'bleeding': 'bleeding',
      'weakened': 'weakened',
      'slowed': 'slowed'
    };

    return conditionMap[conditionName.toLowerCase()] || null;
  }

  private getConditionChanges(status: string): ChangeData[] {
    const changes: ChangeData[] = [];

    // Add mechanical effects for conditions
    switch (status) {
      case 'blinded':
        changes.push({
          key: "flags.midi-qol.disadvantage.attack.all",
          mode: 5, // OVERRIDE
          value: "1",
          priority: 20
        });
        changes.push({
          key: "flags.midi-qol.grants.advantage.attack.all",
          mode: 5, // OVERRIDE
          value: "1",
          priority: 20
        });
        break;

      case 'prone':
        changes.push({
          key: "flags.midi-qol.disadvantage.attack.all",
          mode: 5, // OVERRIDE
          value: "1",
          priority: 20
        });
        changes.push({
          key: "flags.midi-qol.grants.advantage.attack.mwak",
          mode: 5, // OVERRIDE
          value: "1",
          priority: 20
        });
        break;

      case 'restrained':
        changes.push({
          key: "flags.midi-qol.disadvantage.attack.all",
          mode: 5, // OVERRIDE
          value: "1",
          priority: 20
        });
        changes.push({
          key: "flags.midi-qol.disadvantage.ability.save.dex",
          mode: 5, // OVERRIDE
          value: "1",
          priority: 20
        });
        changes.push({
          key: "flags.midi-qol.grants.advantage.attack.all",
          mode: 5, // OVERRIDE
          value: "1",
          priority: 20
        });
        break;

      // MCDM Dazed: Can only take action, bonus action, OR move - not all three
      case 'dazed':
        changes.push({
          key: "flags.midi-qol.dazed",
          mode: 5, // OVERRIDE
          value: "1",
          priority: 20
        });
        changes.push({
          key: "macro.tokenMagic",
          mode: 0, // CUSTOM
          value: "blur",
          priority: 20
        });
        break;

      // Add more condition effects as needed
    }

    return changes;
  }

  private getEffectIcon(effectType: string): string {
    const iconMap: Record<string, string> = {
      'ac_bonus': "systems/dnd5e/icons/spells/protect-blue-3.jpg",
      'ability_modifier': "systems/dnd5e/icons/spells/enchant-utility-4.jpg",
      'damage_resistance': "systems/dnd5e/icons/spells/protect-cyan-2.jpg",
      'advantage': "systems/dnd5e/icons/spells/enchant-blue-3.jpg",
      'disadvantage': "systems/dnd5e/icons/spells/debuff-red-2.jpg",
      'condition': "systems/dnd5e/icons/spells/debuff-red-1.jpg"
    };

    return iconMap[effectType] || "systems/dnd5e/icons/spells/enchant-utility-4.jpg";
  }

  private getConditionIcon(status: string): string {
    const iconMap: Record<string, string> = {
      // Standard D&D 5e conditions
      'blinded': "systems/dnd5e/icons/conditions/blinded.svg",
      'charmed': "systems/dnd5e/icons/conditions/charmed.svg",
      'deafened': "systems/dnd5e/icons/conditions/deafened.svg",
      'frightened': "systems/dnd5e/icons/conditions/frightened.svg",
      'grappled': "systems/dnd5e/icons/conditions/grappled.svg",
      'incapacitated': "systems/dnd5e/icons/conditions/incapacitated.svg",
      'invisible': "systems/dnd5e/icons/conditions/invisible.svg",
      'paralyzed': "systems/dnd5e/icons/conditions/paralyzed.svg",
      'petrified': "systems/dnd5e/icons/conditions/petrified.svg",
      'poisoned': "systems/dnd5e/icons/conditions/poisoned.svg",
      'prone': "systems/dnd5e/icons/conditions/prone.svg",
      'restrained': "systems/dnd5e/icons/conditions/restrained.svg",
      'stunned': "systems/dnd5e/icons/conditions/stunned.svg",
      'unconscious': "systems/dnd5e/icons/conditions/unconscious.svg",
      // MCDM custom conditions - use core SVG icons
      'dazed': "icons/svg/daze.svg",
      'bleeding': "icons/svg/blood.svg",
      'weakened': "icons/svg/downgrade.svg",
      'slowed': "icons/svg/frozen.svg"
    };

    return iconMap[status] || "systems/dnd5e/icons/spells/debuff-red-1.jpg";
  }
}