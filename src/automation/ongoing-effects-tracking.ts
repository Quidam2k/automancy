import { ParsedAbility, ActiveEffectData } from '../types';

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
 * Professional ongoing effects tracking system
 * Handles persistent effects, turn-based processing, and cleanup
 */
export class OngoingEffectsTracking {

  /**
   * Generate complete ongoing effects system
   */
  public generateOngoingSystem(ability: ParsedAbility): OngoingSystemData {
    const ongoingData = this.analyzeOngoingRequirements(ability.raw);
    
    if (!ongoingData || ongoingData.length === 0) {
      return {
        hasOngoingEffects: false,
        effects: [],
        macros: [],
        hooks: [],
        flags: {}
      };
    }

    return {
      hasOngoingEffects: true,
      ongoingEffects: ongoingData,
      effects: this.generateOngoingActiveEffects(ability, ongoingData),
      macros: this.generateOngoingMacros(ability, ongoingData),
      hooks: this.generateOngoingHooks(ability, ongoingData),
      flags: this.generateOngoingFlags(ability, ongoingData),
      cleanup: this.generateCleanupSystem(ability, ongoingData)
    };
  }

  /**
   * Generate global ongoing effects management system
   */
  public generateGlobalOngoingSystem(): GlobalOngoingSystem {
    return {
      turnTracker: this.generateTurnTracker(),
      effectManager: this.generateEffectManager(),
      cleanupSystem: this.generateGlobalCleanupSystem(),
      debugTools: this.generateDebugTools()
    };
  }

  private analyzeOngoingRequirements(text: string): OngoingEffectData[] {
    const ongoingEffects: OngoingEffectData[] = [];

    // Ongoing damage at start of turn
    const startDamageMatch = text.match(/takes? (\d+) \(([^)]+)\) (\w+) damage at the start of (?:each of )?(?:its|their) turns?/i);
    if (startDamageMatch) {
      ongoingEffects.push({
        type: 'damage',
        timing: 'start_of_turn',
        formula: startDamageMatch[2],
        damageType: startDamageMatch[3].toLowerCase(),
        duration: this.extractDuration(text),
        endCondition: this.extractEndCondition(text),
        saveToEnd: this.extractSaveToEnd(text)
      });
    }

    // Ongoing damage at end of turn
    const endDamageMatch = text.match(/takes? (\d+) \(([^)]+)\) (\w+) damage at the end of (?:its|their) turns?/i);
    if (endDamageMatch) {
      ongoingEffects.push({
        type: 'damage',
        timing: 'end_of_turn',
        formula: endDamageMatch[2],
        damageType: endDamageMatch[3].toLowerCase(),
        duration: this.extractDuration(text),
        endCondition: this.extractEndCondition(text),
        saveToEnd: this.extractSaveToEnd(text)
      });
    }

    // Ongoing healing
    const healingMatch = text.match(/(?:regains?|heals?) (\d+) \(([^)]+)\) hit points at the (?:start|end) of (?:its|their) turns?/i);
    if (healingMatch) {
      ongoingEffects.push({
        type: 'healing',
        timing: text.includes('start') ? 'start_of_turn' : 'end_of_turn',
        formula: healingMatch[2],
        duration: this.extractDuration(text),
        endCondition: this.extractEndCondition(text)
      });
    }

    // Ongoing saves/checks
    const saveMatch = text.match(/repeats? this save at the (?:start|end) of (?:its|their) turns?/i);
    if (saveMatch) {
      const saveType = this.extractSaveType(text);
      const saveDC = this.extractSaveDC(text);
      
      ongoingEffects.push({
        type: 'save',
        timing: text.includes('start') ? 'start_of_turn' : 'end_of_turn',
        saveType: saveType,
        saveDC: saveDC,
        duration: this.extractDuration(text),
        endCondition: 'successful_save'
      });
    }

    // Condition application ongoing
    if (text.includes('until this grapple ends') || text.includes('while grappled')) {
      ongoingEffects.push({
        type: 'condition_link',
        timing: 'persistent',
        linkedCondition: 'grappled',
        endCondition: 'parent_condition_ends'
      });
    }

    return ongoingEffects;
  }

  private generateOngoingActiveEffects(ability: ParsedAbility, ongoingData: OngoingEffectData[]): ActiveEffectData[] {
    const effects: ActiveEffectData[] = [];

    for (const ongoing of ongoingData) {
      if (ongoing.type === 'damage' || ongoing.type === 'healing') {
        effects.push(this.createOngoingDamageEffect(ability, ongoing));
      } else if (ongoing.type === 'save') {
        effects.push(this.createOngoingSaveEffect(ability, ongoing));
      } else if (ongoing.type === 'condition_link') {
        effects.push(this.createLinkedConditionEffect(ability, ongoing));
      }
    }

    return effects;
  }

  private createOngoingDamageEffect(ability: ParsedAbility, ongoing: OngoingEffectData): ActiveEffectData {
    return {
      _id: generateFoundryId(),
      name: `${ability.name} - Ongoing ${ongoing.type === 'damage' ? 'Damage' : 'Healing'}`,
      img: ongoing.type === 'damage' 
        ? "systems/dnd5e/icons/spells/debuff-red-1.jpg"
        : "systems/dnd5e/icons/spells/heal-sky-1.jpg",
      changes: [], // No direct stat changes, handled by macro
      duration: {
        seconds: ongoing.duration?.seconds || undefined,
        rounds: ongoing.duration?.rounds || undefined
      },
      flags: {
        dae: {
          macroRepeat: ongoing.timing === 'start_of_turn' ? 'startEveryTurn' : 'endEveryTurn',
          stackable: 'noneName',
          specialDuration: this.generateSpecialDuration(ongoing)
        },
        'chris-premades': {
          ongoingEffect: true,
          effectType: ongoing.type,
          formula: ongoing.formula,
          damageType: ongoing.damageType,
          timing: ongoing.timing
        },
        automancy: {
          generated: true,
          ongoingEffect: ongoing,
          professionalGrade: true,
          macroName: `${ability.name.replace(/\s+/g, '')}Ongoing${ongoing.type === 'damage' ? 'Damage' : 'Healing'}`
        }
      },
      transfer: false,
      disabled: false
    };
  }

  private createOngoingSaveEffect(ability: ParsedAbility, ongoing: OngoingEffectData): ActiveEffectData {
    return {
      _id: generateFoundryId(),
      name: `${ability.name} - Ongoing Save`,
      img: "systems/dnd5e/icons/spells/debuff-blue-1.jpg",
      changes: [],
      duration: {
        seconds: ongoing.duration?.seconds || undefined,
        rounds: ongoing.duration?.rounds || undefined
      },
      flags: {
        dae: {
          macroRepeat: ongoing.timing === 'start_of_turn' ? 'startEveryTurn' : 'endEveryTurn',
          stackable: 'noneName'
        },
        'chris-premades': {
          ongoingSave: true,
          saveType: ongoing.saveType,
          saveDC: ongoing.saveDC
        },
        automancy: {
          generated: true,
          ongoingEffect: ongoing,
          macroName: `${ability.name.replace(/\s+/g, '')}OngoingSave`
        }
      },
      transfer: false,
      disabled: false
    };
  }

  private createLinkedConditionEffect(ability: ParsedAbility, ongoing: OngoingEffectData): ActiveEffectData {
    return {
      _id: generateFoundryId(),
      name: `${ability.name} - Linked Effect`,
      img: "systems/dnd5e/icons/spells/buff-utility-2.jpg",
      changes: [],
      duration: {
        seconds: null // Linked to parent condition
      },
      flags: {
        dae: {
          specialDuration: [`!effect.name.includes("${ongoing.linkedCondition}")`],
          stackable: 'noneName'
        },
        automancy: {
          generated: true,
          linkedCondition: ongoing.linkedCondition,
          ongoingEffect: ongoing
        }
      },
      transfer: false,
      disabled: false
    };
  }

  private generateOngoingMacros(ability: ParsedAbility, ongoingData: OngoingEffectData[]): OngoingMacro[] {
    const macros: OngoingMacro[] = [];

    for (const ongoing of ongoingData) {
      if (ongoing.type === 'damage') {
        macros.push({
          name: `${ability.name.replace(/\s+/g, '')}OngoingDamage`,
          type: 'ongoing_damage',
          content: this.generateOngoingDamageMacro(ability, ongoing),
          executionTiming: ongoing.timing
        });
      } else if (ongoing.type === 'healing') {
        macros.push({
          name: `${ability.name.replace(/\s+/g, '')}OngoingHealing`,
          type: 'ongoing_healing',
          content: this.generateOngoingHealingMacro(ability, ongoing),
          executionTiming: ongoing.timing
        });
      } else if (ongoing.type === 'save') {
        macros.push({
          name: `${ability.name.replace(/\s+/g, '')}OngoingSave`,
          type: 'ongoing_save',
          content: this.generateOngoingSaveMacro(ability, ongoing),
          executionTiming: ongoing.timing
        });
      }
    }

    return macros;
  }

  private generateOngoingDamageMacro(ability: ParsedAbility, ongoing: OngoingEffectData): string {
    return `
// ${ability.name} Ongoing Damage Macro
// Executes ${ongoing.timing === 'start_of_turn' ? 'at start' : 'at end'} of each turn
// Professional Ongoing Effects System - Phase 2

console.log("Executing ongoing damage for ${ability.name}");

// Validate execution context
if (args[0] !== "on" && !args[0].macroPass) {
  console.log("Invalid execution context for ongoing damage");
  return;
}

const { actor, token, effect } = args[0];

if (!actor || !token) {
  console.error("Missing actor or token for ongoing damage");
  return;
}

try {
  // Check if parent effect still exists
  ${this.generateParentEffectCheck(ongoing)}

  // Check end conditions
  ${this.generateEndConditionCheck(ongoing)}

  // Roll damage
  console.log("Rolling ongoing damage: ${ongoing.formula}");
  const damageRoll = await new Roll("${ongoing.formula}").evaluate({ async: true });
  
  // Create chat message for damage roll
  const damageMessage = await damageRoll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: token.actor }),
    flavor: \`<strong>${ability.name}</strong> - Ongoing ${ongoing.damageType} Damage\`,
    rollMode: game.settings.get("core", "rollMode")
  });

  // Apply damage using MidiQOL damage workflow
  if (game.modules.get("midi-qol")?.active) {
    await new MidiQOL.DamageOnlyWorkflow(
      effect.origin?.actor || actor, // Source actor
      token, // Target token
      damageRoll.total,
      "${ongoing.damageType}",
      [token],
      damageRoll,
      {
        flavor: \`${ability.name} - Ongoing ${(ongoing.damageType || 'bludgeoning').charAt(0).toUpperCase() + (ongoing.damageType || 'bludgeoning').slice(1)} Damage\`,
        itemCardId: "ongoing-damage",
        useOther: false
      }
    );
  } else {
    // Fallback damage application
    const currentHP = actor.system.attributes.hp.value;
    const newHP = Math.max(0, currentHP - damageRoll.total);
    
    await actor.update({
      "system.attributes.hp.value": newHP
    });
    
    ui.notifications.info(\`\${token.name} takes \${damageRoll.total} ${ongoing.damageType} damage\`);
  }

  console.log(\`Applied \${damageRoll.total} ongoing ${ongoing.damageType} damage to \${token.name}\`);

  // Check for save to end (if applicable)
  ${this.generateSaveToEndLogic(ability, ongoing)}

  // Track ongoing effect statistics
  await this.updateOngoingStats(actor, "${ability.name}", "damage", damageRoll.total);

} catch (error) {
  console.error("Ongoing damage macro failed:", error);
  ui.notifications.error(\`Ongoing damage failed for \${token.name}\`);
}

// Helper function for statistics
async function updateOngoingStats(actor, abilityName, type, value) {
  const stats = actor.getFlag("automancy", "ongoingEffectStats") || {};
  const abilityStats = stats[abilityName] || { damage: 0, healing: 0, saves: 0 };
  
  abilityStats[type] += value;
  stats[abilityName] = abilityStats;
  
  await actor.setFlag("automancy", "ongoingEffectStats", stats);
}`;
  }

  private generateOngoingHealingMacro(ability: ParsedAbility, ongoing: OngoingEffectData): string {
    return `
// ${ability.name} Ongoing Healing Macro
// Executes ${ongoing.timing === 'start_of_turn' ? 'at start' : 'at end'} of each turn

console.log("Executing ongoing healing for ${ability.name}");

if (args[0] !== "on" && !args[0].macroPass) return;

const { actor, token, effect } = args[0];

if (!actor || !token) {
  console.error("Missing actor or token for ongoing healing");
  return;
}

try {
  // Check if parent effect still exists
  ${this.generateParentEffectCheck(ongoing)}

  // Check end conditions
  ${this.generateEndConditionCheck(ongoing)}

  // Check if already at max HP
  const currentHP = actor.system.attributes.hp.value;
  const maxHP = actor.system.attributes.hp.max;
  
  if (currentHP >= maxHP) {
    console.log(\`\${token.name} already at max HP, skipping healing\`);
    return;
  }

  // Roll healing
  console.log("Rolling ongoing healing: ${ongoing.formula}");
  const healingRoll = await new Roll("${ongoing.formula}").evaluate({ async: true });
  
  // Create chat message for healing roll
  await healingRoll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: token.actor }),
    flavor: \`<strong>${ability.name}</strong> - Ongoing Healing\`,
    rollMode: game.settings.get("core", "rollMode")
  });

  // Apply healing
  const healingAmount = Math.min(healingRoll.total, maxHP - currentHP);
  const newHP = currentHP + healingAmount;
  
  await actor.update({
    "system.attributes.hp.value": newHP
  });
  
  // Visual notification
  ui.notifications.info(\`\${token.name} heals for \${healingAmount} hit points\`);
  
  // Visual effect on token
  if (canvas.tokens.controlled.includes(token) || token.isOwner) {
    await token.document.update({
      "effects": token.document.effects.concat([{
        tint: "#00ff00",
        duration: 1500,
        intensity: 0.2
      }])
    });
  }

  console.log(\`Applied \${healingAmount} ongoing healing to \${token.name}\`);

  // Track statistics
  await updateOngoingStats(actor, "${ability.name}", "healing", healingAmount);

} catch (error) {
  console.error("Ongoing healing macro failed:", error);
  ui.notifications.error(\`Ongoing healing failed for \${token.name}\`);
}`;
  }

  private generateOngoingSaveMacro(ability: ParsedAbility, ongoing: OngoingEffectData): string {
    return `
// ${ability.name} Ongoing Save Macro
// Executes ${ongoing.timing === 'start_of_turn' ? 'at start' : 'at end'} of each turn

console.log("Executing ongoing save for ${ability.name}");

if (args[0] !== "on" && !args[0].macroPass) return;

const { actor, token, effect } = args[0];

if (!actor || !token) {
  console.error("Missing actor or token for ongoing save");
  return;
}

try {
  // Check if parent effect still exists
  ${this.generateParentEffectCheck(ongoing)}

  // Prepare save data
  const saveType = "${ongoing.saveType}";
  const saveDC = ${ongoing.saveDC || 15};
  
  console.log(\`Rolling \${saveType.toUpperCase()} save (DC \${saveDC}) for \${token.name}\`);

  // Roll the save
  const saveRoll = await actor.rollAbilitySave(saveType, {
    flavor: \`${ability.name} - \${saveType.toUpperCase()} Save\`,
    chatMessage: true,
    fastForward: false
  });

  const saveTotal = saveRoll.total;
  const saveSuccessful = saveTotal >= saveDC;

  // Create detailed chat message
  const resultText = saveSuccessful ? "Success!" : "Failure!";
  const resultClass = saveSuccessful ? "success" : "failure";
  
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: \`
      <div class="save-result \${resultClass}">
        <h3>${ability.name} - Ongoing Save</h3>
        <p><strong>Save:</strong> \${saveType.toUpperCase()} DC \${saveDC}</p>
        <p><strong>Roll:</strong> \${saveTotal}</p>
        <p><strong>Result:</strong> <span class="\${resultClass}">\${resultText}</span></p>
      </div>
    \`,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
  });

  if (saveSuccessful) {
    console.log(\`\${token.name} succeeded on ongoing save - ending effect\`);
    
    // Remove the ongoing effect
    const ongoingEffect = actor.effects.find(e => 
      e.name.includes("${ability.name}") && e.flags?.automancy?.ongoingEffect
    );
    
    if (ongoingEffect) {
      await ongoingEffect.delete();
      ui.notifications.info(\`\${token.name} overcame the \${ongoingEffect.name}!\`);
    }
    
    // Remove any linked effects
    await this.removeLinkedEffects(actor, "${ability.name}");
    
  } else {
    console.log(\`\${token.name} failed ongoing save - effect continues\`);
  }

  // Track statistics
  await updateOngoingStats(actor, "${ability.name}", "saves", saveSuccessful ? 1 : 0);

} catch (error) {
  console.error("Ongoing save macro failed:", error);
  ui.notifications.error(\`Ongoing save failed for \${token.name}\`);
}

// Helper function to remove linked effects
async function removeLinkedEffects(actor, abilityName) {
  const linkedEffects = actor.effects.filter(e => 
    e.name.includes(abilityName) && !e.flags?.automancy?.ongoingEffect
  );
  
  for (const effect of linkedEffects) {
    await effect.delete();
    console.log(\`Removed linked effect: \${effect.name}\`);
  }
}`;
  }

  private generateParentEffectCheck(ongoing: OngoingEffectData): string {
    if (ongoing.type === 'condition_link' && ongoing.linkedCondition) {
      return `
  // Check if parent condition still exists
  const parentEffect = actor.effects.find(e => 
    e.name.includes("${ongoing.linkedCondition}") || 
    e.statuses.has("${ongoing.linkedCondition}")
  );
  
  if (!parentEffect) {
    console.log("Parent condition ended, removing ongoing effect");
    if (effect) {
      await effect.delete();
    }
    return;
  }`;
    }

    return '// No parent effect check required';
  }

  private generateEndConditionCheck(ongoing: OngoingEffectData): string {
    if (!ongoing.endCondition) {
      return '// No end condition check required';
    }

    switch (ongoing.endCondition) {
      case 'unconscious':
        return `
  // Check if target is unconscious
  if (actor.effects.some(e => e.statuses.has("unconscious"))) {
    console.log("Target is unconscious, ending ongoing effect");
    if (effect) {
      await effect.delete();
    }
    return;
  }`;

      case 'full_hp':
        return `
  // Check if target is at full HP
  if (actor.system.attributes.hp.value >= actor.system.attributes.hp.max) {
    console.log("Target at full HP, ending ongoing healing");
    if (effect) {
      await effect.delete();
    }
    return;
  }`;

      case 'parent_condition_ends':
        return this.generateParentEffectCheck(ongoing);

      default:
        return `// Custom end condition: ${ongoing.endCondition}`;
    }
  }

  private generateSaveToEndLogic(ability: ParsedAbility, ongoing: OngoingEffectData): string {
    if (!ongoing.saveToEnd) {
      return '// No save to end this effect';
    }

    return `
  // Prompt for save to end effect
  const saveToEnd = await Dialog.confirm({
    title: "Save to End Effect",
    content: \`<p>Make a <strong>\${ongoing.saveToEnd.ability.toUpperCase()}</strong> saving throw (DC \${ongoing.saveToEnd.dc}) to end the ongoing effect?</p>\`,
    defaultYes: true
  });

  if (saveToEnd) {
    const saveRoll = await actor.rollAbilitySave(ongoing.saveToEnd.ability, {
      flavor: "Save to end ${ability.name}",
      chatMessage: true
    });

    if (saveRoll.total >= ongoing.saveToEnd.dc) {
      ui.notifications.info(\`\${token.name} saved against the ongoing effect!\`);
      
      // Remove ongoing effect
      if (effect) {
        await effect.delete();
      }
      
      console.log("Ongoing effect ended by successful save");
      return; // Exit early
    } else {
      ui.notifications.info(\`\${token.name} failed the save - ongoing effect continues\`);
    }
  }`;
  }

  private generateOngoingHooks(ability: ParsedAbility, ongoingData: OngoingEffectData[]): OngoingHook[] {
    const hooks: OngoingHook[] = [];

    // Turn start/end hooks for timing
    const hasStartEffects = ongoingData.some(e => e.timing === 'start_of_turn');
    const hasEndEffects = ongoingData.some(e => e.timing === 'end_of_turn');

    if (hasStartEffects) {
      hooks.push({
        event: 'combatTurn',
        priority: 90,
        content: this.generateTurnStartHook(ability),
        timing: 'start'
      });
    }

    if (hasEndEffects) {
      hooks.push({
        event: 'combatTurnEnd',
        priority: 90,
        content: this.generateTurnEndHook(ability),
        timing: 'end'
      });
    }

    return hooks;
  }

  private generateTurnStartHook(ability: ParsedAbility): string {
    return `
// Turn start hook for ${ability.name} ongoing effects
Hooks.on("combatTurn", async (combat, updateData, options) => {
  const currentCombatant = combat.combatant;
  if (!currentCombatant?.actor) return;

  // Find ongoing effects for this ability
  const ongoingEffects = currentCombatant.actor.effects.filter(e => 
    e.name.includes("${ability.name}") && 
    e.flags?.automancy?.ongoingEffect &&
    e.flags.automancy.ongoingEffect.timing === "start_of_turn"
  );

  for (const effect of ongoingEffects) {
    const macroName = effect.flags.automancy.macroName;
    const macro = game.macros.find(m => m.name === macroName);
    
    if (macro) {
      try {
        await macro.execute({
          actor: currentCombatant.actor,
          token: currentCombatant.token?.object,
          effect: effect
        });
      } catch (error) {
        console.error(\`Failed to execute ongoing effect macro \${macroName}:\`, error);
      }
    }
  }
});`;
  }

  private generateTurnEndHook(ability: ParsedAbility): string {
    return `
// Turn end hook for ${ability.name} ongoing effects
Hooks.on("combatTurnEnd", async (combat, updateData, options) => {
  const currentCombatant = combat.combatant;
  if (!currentCombatant?.actor) return;

  // Find ongoing effects for this ability
  const ongoingEffects = currentCombatant.actor.effects.filter(e => 
    e.name.includes("${ability.name}") && 
    e.flags?.automancy?.ongoingEffect &&
    e.flags.automancy.ongoingEffect.timing === "end_of_turn"
  );

  for (const effect of ongoingEffects) {
    const macroName = effect.flags.automancy.macroName;
    const macro = game.macros.find(m => m.name === macroName);
    
    if (macro) {
      try {
        await macro.execute({
          actor: currentCombatant.actor,
          token: currentCombatant.token?.object,
          effect: effect
        });
      } catch (error) {
        console.error(\`Failed to execute ongoing effect macro \${macroName}:\`, error);
      }
    }
  }
});`;
  }

  private generateOngoingFlags(ability: ParsedAbility, ongoingData: OngoingEffectData[]): Record<string, any> {
    return {
      'midi-qol': {
        ongoingEffects: true,
        effectCount: ongoingData.length
      },
      dae: {
        macroRepeat: this.determineMacroRepeat(ongoingData),
        ongoingTracking: true
      },
      'chris-premades': {
        hasOngoingEffects: true,
        effectTypes: ongoingData.map(e => e.type)
      },
      automancy: {
        ongoingSystem: true,
        ongoingEffects: ongoingData,
        professionalGrade: true
      }
    };
  }

  private generateCleanupSystem(ability: ParsedAbility, ongoingData: OngoingEffectData[]): string {
    return `
// Cleanup system for ${ability.name} ongoing effects
const OngoingCleanup = {
  
  // Clean up all ongoing effects for this ability
  cleanupAbilityEffects: async function(actor, abilityName) {
    const effects = actor.effects.filter(e => 
      e.name.includes(abilityName) && e.flags?.automancy?.ongoingEffect
    );
    
    for (const effect of effects) {
      await effect.delete();
      console.log(\`Cleaned up ongoing effect: \${effect.name}\`);
    }
    
    // Clear statistics
    const stats = actor.getFlag("automancy", "ongoingEffectStats") || {};
    delete stats[abilityName];
    await actor.setFlag("automancy", "ongoingEffectStats", stats);
  },
  
  // Clean up expired effects
  cleanupExpiredEffects: async function(actor) {
    const expiredEffects = actor.effects.filter(e => {
      if (!e.flags?.automancy?.ongoingEffect) return false;
      
      const duration = e.duration;
      if (duration.type === "seconds" && duration.remaining <= 0) return true;
      if (duration.type === "turns" && duration.remaining <= 0) return true;
      
      return false;
    });
    
    for (const effect of expiredEffects) {
      await effect.delete();
      console.log(\`Removed expired ongoing effect: \${effect.name}\`);
    }
  }
};

window.automancyOngoing = window.automancyOngoing || {};
Object.assign(window.automancyOngoing, OngoingCleanup);`;
  }

  // Global system generators
  private generateTurnTracker(): string {
    return `
// Global turn tracker for ongoing effects
const OngoingTurnTracker = {
  
  processTurnStart: async function(combat) {
    const currentCombatant = combat.combatant;
    if (!currentCombatant?.actor) return;
    
    console.log(\`Processing turn start ongoing effects for \${currentCombatant.actor.name}\`);
    
    const startEffects = currentCombatant.actor.effects.filter(e => 
      e.flags?.automancy?.ongoingEffect?.timing === "start_of_turn"
    );
    
    for (const effect of startEffects) {
      await this.processOngoingEffect(effect, currentCombatant);
    }
  },
  
  processTurnEnd: async function(combat) {
    const currentCombatant = combat.combatant;
    if (!currentCombatant?.actor) return;
    
    console.log(\`Processing turn end ongoing effects for \${currentCombatant.actor.name}\`);
    
    const endEffects = currentCombatant.actor.effects.filter(e => 
      e.flags?.automancy?.ongoingEffect?.timing === "end_of_turn"
    );
    
    for (const effect of endEffects) {
      await this.processOngoingEffect(effect, currentCombatant);
    }
  },
  
  processOngoingEffect: async function(effect, combatant) {
    const macroName = effect.flags.automancy.macroName;
    const macro = game.macros.find(m => m.name === macroName);
    
    if (macro) {
      try {
        await macro.execute({
          actor: combatant.actor,
          token: combatant.token?.object,
          effect: effect
        });
      } catch (error) {
        console.error(\`Failed to process ongoing effect \${effect.name}:\`, error);
      }
    }
  }
};

// Register hooks
Hooks.on("combatTurn", OngoingTurnTracker.processTurnStart);
Hooks.on("combatTurnEnd", OngoingTurnTracker.processTurnEnd);

window.automancyOngoing = window.automancyOngoing || {};
Object.assign(window.automancyOngoing, OngoingTurnTracker);`;
  }

  private generateEffectManager(): string {
    return `
// Professional ongoing effects manager
const OngoingEffectManager = {
  
  // Create ongoing effect with full automation
  createOngoingEffect: async function(actor, effectData) {
    try {
      const effect = await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
      console.log(\`Created ongoing effect: \${effectData.name}\`);
      return effect[0];
    } catch (error) {
      console.error("Failed to create ongoing effect:", error);
      return null;
    }
  },
  
  // Update ongoing effect
  updateOngoingEffect: async function(effect, updateData) {
    try {
      await effect.update(updateData);
      console.log(\`Updated ongoing effect: \${effect.name}\`);
    } catch (error) {
      console.error("Failed to update ongoing effect:", error);
    }
  },
  
  // Remove ongoing effect
  removeOngoingEffect: async function(effect, reason = "ended") {
    try {
      await effect.delete();
      console.log(\`Removed ongoing effect: \${effect.name} (\${reason})\`);
    } catch (error) {
      console.error("Failed to remove ongoing effect:", error);
    }
  },
  
  // Get all ongoing effects for actor
  getOngoingEffects: function(actor) {
    return actor.effects.filter(e => e.flags?.automancy?.ongoingEffect);
  },
  
  // Get ongoing effects by type
  getOngoingEffectsByType: function(actor, type) {
    return this.getOngoingEffects(actor).filter(e => 
      e.flags.automancy.ongoingEffect.type === type
    );
  }
};

window.automancyOngoing = window.automancyOngoing || {};
Object.assign(window.automancyOngoing, OngoingEffectManager);`;
  }

  private generateGlobalCleanupSystem(): string {
    return `
// Global cleanup system for ongoing effects
const GlobalOngoingCleanup = {
  
  // Clean up all expired ongoing effects
  cleanupAllExpired: async function() {
    console.log("Cleaning up expired ongoing effects globally");
    
    for (const actor of game.actors) {
      const expiredEffects = actor.effects.filter(e => {
        if (!e.flags?.automancy?.ongoingEffect) return false;
        
        const duration = e.duration;
        return (duration.type === "seconds" && duration.remaining <= 0) ||
               (duration.type === "turns" && duration.remaining <= 0);
      });
      
      for (const effect of expiredEffects) {
        await effect.delete();
        console.log(\`Removed expired effect \${effect.name} from \${actor.name}\`);
      }
    }
  },
  
  // Clean up ongoing effects when combat ends
  cleanupOnCombatEnd: async function() {
    console.log("Cleaning up ongoing effects at combat end");
    
    for (const combatant of game.combat?.combatants || []) {
      if (!combatant.actor) continue;
      
      const combatOnlyEffects = combatant.actor.effects.filter(e => 
        e.flags?.automancy?.ongoingEffect?.duration?.type === "combat"
      );
      
      for (const effect of combatOnlyEffects) {
        await effect.delete();
        console.log(\`Removed combat-only effect \${effect.name} from \${combatant.actor.name}\`);
      }
    }
  }
};

// Register cleanup hooks
Hooks.on("deleteCombat", GlobalOngoingCleanup.cleanupOnCombatEnd);
Hooks.on("ready", () => {
  // Clean up expired effects every 5 minutes
  setInterval(GlobalOngoingCleanup.cleanupAllExpired, 300000);
});

window.automancyOngoing = window.automancyOngoing || {};
Object.assign(window.automancyOngoing, GlobalOngoingCleanup);`;
  }

  private generateDebugTools(): string {
    return `
// Debug tools for ongoing effects
const OngoingDebugTools = {
  
  // List all ongoing effects
  listAll: function() {
    console.log("=== Ongoing Effects Debug ===");
    
    for (const actor of game.actors) {
      const ongoingEffects = actor.effects.filter(e => 
        e.flags?.automancy?.ongoingEffect
      );
      
      if (ongoingEffects.length > 0) {
        console.log(\`\${actor.name}:\`);
        for (const effect of ongoingEffects) {
          const ongoing = effect.flags.automancy.ongoingEffect;
          console.log(\`  - \${effect.name} (\${ongoing.type}, \${ongoing.timing})\`);
        }
      }
    }
  },
  
  // Force trigger ongoing effect
  forceTrigger: async function(actorName, effectName) {
    const actor = game.actors.getName(actorName);
    if (!actor) {
      console.error(\`Actor "\${actorName}" not found\`);
      return;
    }
    
    const effect = actor.effects.find(e => e.name.includes(effectName));
    if (!effect) {
      console.error(\`Effect "\${effectName}" not found on \${actorName}\`);
      return;
    }
    
    const macroName = effect.flags?.automancy?.macroName;
    if (!macroName) {
      console.error("No macro associated with this effect");
      return;
    }
    
    const macro = game.macros.find(m => m.name === macroName);
    if (macro) {
      await macro.execute({
        actor: actor,
        token: actor.getActiveTokens()[0],
        effect: effect
      });
      console.log("Forced trigger of ongoing effect");
    }
  }
};

// Make debug tools globally available
window.debugOngoing = OngoingDebugTools;
console.log("Ongoing effects debug tools available at window.debugOngoing");`;
  }

  // Helper methods
  private extractDuration(text: string): { seconds?: number; rounds?: number } | undefined {
    const roundMatch = text.match(/for (\d+) rounds?/i);
    if (roundMatch) {
      return { rounds: parseInt(roundMatch[1]) };
    }

    const minuteMatch = text.match(/for (\d+) minutes?/i);
    if (minuteMatch) {
      return { seconds: parseInt(minuteMatch[1]) * 60 };
    }

    return undefined;
  }

  private extractEndCondition(text: string): string | undefined {
    if (text.includes('until unconscious')) return 'unconscious';
    if (text.includes('until this grapple ends')) return 'parent_condition_ends';
    if (text.includes('at full hit points')) return 'full_hp';
    return undefined;
  }

  private extractSaveToEnd(text: string): { ability: string; dc: number } | undefined {
    const saveMatch = text.match(/DC (\d+) (\w+) (?:saving throw|save) to end/i);
    if (saveMatch) {
      return {
        dc: parseInt(saveMatch[1]),
        ability: saveMatch[2].toLowerCase().slice(0, 3)
      };
    }
    return undefined;
  }

  private extractSaveType(text: string): string {
    const saveMatch = text.match(/DC \d+ (\w+) (?:saving throw|save)/i);
    return saveMatch ? saveMatch[1].toLowerCase().slice(0, 3) : 'con';
  }

  private extractSaveDC(text: string): number {
    const dcMatch = text.match(/DC (\d+)/i);
    return dcMatch ? parseInt(dcMatch[1]) : 15;
  }

  private generateSpecialDuration(ongoing: OngoingEffectData): string[] {
    const durations: string[] = [];

    if (ongoing.endCondition === 'unconscious') {
      durations.push('isUnconscious');
    }

    if (ongoing.endCondition === 'parent_condition_ends') {
      durations.push(`!effect.name.includes("${ongoing.linkedCondition}")`);
    }

    if (ongoing.saveToEnd) {
      durations.push('shortRest');
    }

    return durations;
  }

  private determineMacroRepeat(ongoingData: OngoingEffectData[]): string {
    const hasStart = ongoingData.some(e => e.timing === 'start_of_turn');
    const hasEnd = ongoingData.some(e => e.timing === 'end_of_turn');

    if (hasStart && hasEnd) return 'startEndEveryTurn';
    if (hasStart) return 'startEveryTurn';
    if (hasEnd) return 'endEveryTurn';
    return 'none';
  }
}

// Type definitions
interface OngoingSystemData {
  hasOngoingEffects: boolean;
  ongoingEffects?: OngoingEffectData[];
  effects: ActiveEffectData[];
  macros: OngoingMacro[];
  hooks: OngoingHook[];
  flags: Record<string, any>;
  cleanup?: string;
}

interface OngoingEffectData {
  type: 'damage' | 'healing' | 'save' | 'condition_link';
  timing: 'start_of_turn' | 'end_of_turn' | 'persistent';
  formula?: string;
  damageType?: string;
  saveType?: string;
  saveDC?: number;
  linkedCondition?: string;
  duration?: { seconds?: number; rounds?: number };
  endCondition?: string;
  saveToEnd?: { ability: string; dc: number };
}

interface OngoingMacro {
  name: string;
  type: 'ongoing_damage' | 'ongoing_healing' | 'ongoing_save';
  content: string;
  executionTiming: string;
}

interface OngoingHook {
  event: string;
  priority: number;
  content: string;
  timing: 'start' | 'end';
}

interface GlobalOngoingSystem {
  turnTracker: string;
  effectManager: string;
  cleanupSystem: string;
  debugTools: string;
}