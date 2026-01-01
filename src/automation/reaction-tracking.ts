import { ParsedAbility, AbilityType } from '../types';

/**
 * Professional reaction consumption and tracking system
 * Handles D&D 5e reaction mechanics with full automation
 */
export class ReactionTracking {

  /**
   * Generate complete reaction tracking system
   */
  public generateReactionSystem(ability: ParsedAbility): ReactionSystemData {
    if (ability.type !== AbilityType.REACTION) {
      return {
        isReaction: false,
        trackingData: null,
        macros: [],
        hooks: [],
        flags: {}
      };
    }

    const trackingData = this.analyzeReactionTriggers(ability.raw);
    
    return {
      isReaction: true,
      trackingData,
      macros: this.generateReactionMacros(ability, trackingData),
      hooks: this.generateReactionHooks(ability, trackingData),
      flags: this.generateReactionFlags(ability, trackingData),
      validation: this.generateReactionValidation(ability, trackingData)
    };
  }

  /**
   * Generate global reaction management system
   */
  public generateGlobalReactionSystem(): GlobalReactionSystem {
    return {
      trackingHooks: this.generateGlobalTrackingHooks(),
      resetSystem: this.generateReactionResetSystem(),
      prioritySystem: this.generateReactionPrioritySystem(),
      dialogSystem: this.generateReactionDialogSystem()
    };
  }

  private analyzeReactionTriggers(text: string): ReactionTrackingData {
    const triggers: ReactionTrigger[] = [];
    
    // Damage trigger
    if (text.match(/(?:when|if).*takes? damage/i)) {
      triggers.push({
        type: 'damage_taken',
        hook: 'midi-qol.DamageWorkflowComplete',
        priority: 100,
        validation: this.generateDamageTriggerValidation(text)
      });
    }

    // Attack trigger
    if (text.match(/(?:when|if).*(?:attacked|attack.*made)/i)) {
      triggers.push({
        type: 'being_attacked',
        hook: 'midi-qol.preAttackRoll',
        priority: 90,
        validation: this.generateAttackTriggerValidation(text)
      });
    }

    // Movement trigger
    if (text.match(/(?:when|if).*moves?/i)) {
      triggers.push({
        type: 'target_moves',
        hook: 'updateToken',
        priority: 80,
        validation: this.generateMovementTriggerValidation(text)
      });
    }

    // Spell casting trigger
    if (text.match(/(?:when|if).*casts? a spell/i)) {
      triggers.push({
        type: 'spell_cast',
        hook: 'midi-qol.preItemRoll',
        priority: 95,
        validation: this.generateSpellTriggerValidation(text)
      });
    }

    // Opportunity attack trigger
    if (text.match(/opportunity attack/i)) {
      triggers.push({
        type: 'opportunity_attack',
        hook: 'midi-qol.OpportunityAttack',
        priority: 70,
        validation: this.generateOpportunityTriggerValidation(text)
      });
    }

    return {
      triggers,
      consumesReaction: true,
      range: this.extractReactionRange(text),
      conditions: this.extractReactionConditions(text),
      timing: this.extractReactionTiming(text)
    };
  }

  private generateReactionMacros(ability: ParsedAbility, trackingData: ReactionTrackingData): ReactionMacro[] {
    const macros: ReactionMacro[] = [];

    // Main reaction trigger macro
    macros.push({
      name: `${ability.name.replace(/\s+/g, '')}ReactionTrigger`,
      type: 'trigger',
      content: this.generateMainReactionTriggerMacro(ability, trackingData),
      executionHook: trackingData.triggers[0]?.hook || 'manual'
    });

    // Reaction validation macro
    macros.push({
      name: `${ability.name.replace(/\s+/g, '')}ReactionValidation`,
      type: 'validation',
      content: this.generateReactionValidationMacro(ability, trackingData),
      executionHook: 'pre-trigger'
    });

    // Reaction consumption macro
    macros.push({
      name: `${ability.name.replace(/\s+/g, '')}ReactionConsumption`,
      type: 'consumption',
      content: this.generateReactionConsumptionMacro(ability, trackingData),
      executionHook: 'post-use'
    });

    return macros;
  }

  private generateMainReactionTriggerMacro(ability: ParsedAbility, trackingData: ReactionTrackingData): string {
    const primaryTrigger = trackingData.triggers[0];
    
    return `
// ${ability.name} Reaction Trigger Macro
// Trigger: ${primaryTrigger?.type || 'manual'}
// Professional Reaction System - Phase 2

console.log("Reaction trigger fired for ${ability.name}");

// Validate macro execution context
if (!args || !args[0]) {
  console.error("Invalid reaction trigger context");
  return;
}

const { workflow, actor, token, item, targetedTokens } = args[0];

// Comprehensive reaction validation
try {
  // Check if reaction already used this round
  const reactionUsed = actor.getFlag("automancy", "reactionUsedThisRound");
  if (reactionUsed) {
    console.log("Reaction already used this round");
    return;
  }

  // Validate trigger conditions
  ${this.generateTriggerValidationLogic(ability, trackingData)}

  // Range validation
  ${this.generateRangeValidationLogic(trackingData)}

  // Specific condition validation
  ${this.generateConditionValidationLogic(trackingData)}

  // Prompt for reaction use with professional dialog
  const useReaction = await ReactionDialog.prompt({
    title: "${ability.name}",
    abilityName: "${ability.name}",
    triggerText: "${primaryTrigger?.type || 'unknown'}",
    range: ${trackingData.range || 30},
    actor: actor,
    workflow: workflow,
    validTargets: getValidReactionTargets()
  });

  if (useReaction.confirmed) {
    console.log("Player confirmed reaction use");
    
    // Execute the reaction
    await executeReaction(useReaction.targetToken);
  } else {
    console.log("Player declined reaction use");
  }

} catch (error) {
  console.error("Reaction trigger macro failed:", error);
  ui.notifications.error(\`Reaction trigger failed for ${ability.name}\`);
}

// Helper functions
function getValidReactionTargets() {
  ${this.generateTargetSelectionLogic(trackingData)}
}

async function executeReaction(targetToken) {
  try {
    // Mark reaction as used BEFORE execution to prevent double-use
    await actor.setFlag("automancy", "reactionUsedThisRound", true);
    await actor.setFlag("automancy", "lastReactionUsed", {
      ability: "${ability.name}",
      round: game.combat?.round || 0,
      turn: game.combat?.turn || 0,
      timestamp: Date.now()
    });

    // Execute the reaction ability
    const reactionItem = actor.items.find(i => i.name === "${ability.name}");
    if (!reactionItem) {
      throw new Error("Reaction item not found");
    }

    // Set up proper targeting if needed
    if (targetToken) {
      game.user.updateTokenTargets([targetToken.id]);
    }

    // Execute with proper context
    const reactionWorkflow = await reactionItem.use({
      configureDialog: false,
      versatile: false,
      createWorkflow: true,
      targetConfirmation: "none"
    });

    // Post-execution processing
    if (reactionWorkflow) {
      console.log("Reaction executed successfully");
      
      // Apply any additional effects or cleanup
      await postReactionCleanup(reactionWorkflow);
    }

  } catch (error) {
    console.error("Reaction execution failed:", error);
    
    // Reset reaction flag on failure
    await actor.unsetFlag("automancy", "reactionUsedThisRound");
    ui.notifications.error("Reaction execution failed");
  }
}

async function postReactionCleanup(workflow) {
  // Any post-reaction processing
  console.log("Post-reaction cleanup for ${ability.name}");
  
  // Update UI
  ui.actors.render();
  if (token.sheet?.rendered) {
    token.sheet.render();
  }
}`;
  }

  private generateTriggerValidationLogic(ability: ParsedAbility, trackingData: ReactionTrackingData): string {
    const validations: string[] = [];

    for (const trigger of trackingData.triggers) {
      switch (trigger.type) {
        case 'damage_taken':
          validations.push(`
  // Validate damage trigger
  if (!workflow.damageRoll || workflow.damageRoll.total <= 0) {
    console.log("No damage dealt - reaction not triggered");
    return;
  }
  
  // Check if this actor took damage
  if (!workflow.hitTargets.has(token)) {
    console.log("This actor did not take damage - reaction not triggered");
    return;
  }`);
          break;

        case 'being_attacked':
          validations.push(`
  // Validate attack trigger
  if (!workflow.targets || !workflow.targets.has(token)) {
    console.log("This actor is not being attacked - reaction not triggered");
    return;
  }`);
          break;

        case 'target_moves':
          validations.push(`
  // Validate movement trigger
  const movementDistance = canvas.grid.measureDistance(
    { x: args[0].x, y: args[0].y },
    { x: workflow.token.x, y: workflow.token.y }
  );
  
  if (movementDistance < 5) {
    console.log("Insufficient movement - reaction not triggered");
    return;
  }`);
          break;
      }
    }

    return validations.join('\n');
  }

  private generateRangeValidationLogic(trackingData: ReactionTrackingData): string {
    if (!trackingData.range) {
      return '// No range restrictions';
    }

    return `
  // Validate reaction range (${trackingData.range} feet)
  const distance = canvas.grid.measureDistance(token, workflow.token);
  if (distance > ${trackingData.range}) {
    console.log(\`Target too far away: \${distance} feet (max ${trackingData.range})\`);
    return;
  }`;
  }

  private generateConditionValidationLogic(trackingData: ReactionTrackingData): string {
    if (!trackingData.conditions || trackingData.conditions.length === 0) {
      return '// No additional conditions';
    }

    const conditionChecks = trackingData.conditions.map(condition => {
      switch (condition.type) {
        case 'line_of_sight':
          return `
  // Check line of sight
  if (!canvas.sight.testVisibility(token.center, workflow.token.center)) {
    console.log("No line of sight to target");
    return;
  }`;

        case 'target_type':
          return `
  // Check target type: ${condition.value}
  if (workflow.token.actor.system.details.type.value !== "${condition.value}") {
    console.log("Target is not a ${condition.value}");
    return;
  }`;

        case 'weapon_attack':
          return `
  // Check if attack is weapon attack
  if (!workflow.item || workflow.item.system.actionType !== "mwak" && workflow.item.system.actionType !== "rwak") {
    console.log("Attack is not a weapon attack");
    return;
  }`;

        default:
          return `// Unknown condition: ${condition.type}`;
      }
    }).join('\n');

    return conditionChecks;
  }

  private generateTargetSelectionLogic(trackingData: ReactionTrackingData): string {
    return `
  // Get valid targets within range
  const validTargets = [];
  const maxRange = ${trackingData.range || 30};
  
  for (const tokenDoc of canvas.tokens.placeables) {
    if (tokenDoc === token) continue; // Skip self
    
    const distance = canvas.grid.measureDistance(token, tokenDoc);
    if (distance <= maxRange) {
      // Additional target validation
      ${this.generateTargetTypeValidation(trackingData)}
      
      validTargets.push(tokenDoc);
    }
  }
  
  return validTargets;`;
  }

  private generateTargetTypeValidation(trackingData: ReactionTrackingData): string {
    const conditions = trackingData.conditions || [];
    const targetTypeCondition = conditions.find(c => c.type === 'target_type');
    
    if (targetTypeCondition) {
      return `
      // Check target type
      if (tokenDoc.actor?.system.details.type.value !== "${targetTypeCondition.value}") {
        continue; // Skip invalid target type
      }`;
    }

    return '// No target type restrictions';
  }

  private generateReactionValidationMacro(ability: ParsedAbility, trackingData: ReactionTrackingData): string {
    return `
// ${ability.name} Reaction Validation Macro
// Pre-execution validation for reaction use

async function validateReactionUse(actor, triggerData) {
  const validationResults = {
    valid: true,
    reasons: []
  };

  try {
    // Check reaction availability
    const reactionUsed = actor.getFlag("automancy", "reactionUsedThisRound");
    if (reactionUsed) {
      validationResults.valid = false;
      validationResults.reasons.push("Reaction already used this round");
      return validationResults;
    }

    // Check if actor is incapacitated
    if (actor.effects.some(e => e.statuses.has("incapacitated"))) {
      validationResults.valid = false;
      validationResults.reasons.push("Actor is incapacitated");
      return validationResults;
    }

    // Check if actor is unconscious
    if (actor.effects.some(e => e.statuses.has("unconscious"))) {
      validationResults.valid = false;
      validationResults.reasons.push("Actor is unconscious");
      return validationResults;
    }

    // Check resource requirements
    ${this.generateResourceValidation(ability)}

    // Check specific reaction conditions
    ${this.generateSpecificReactionValidation(ability, trackingData)}

    console.log("Reaction validation passed for ${ability.name}");
    return validationResults;

  } catch (error) {
    console.error("Reaction validation failed:", error);
    validationResults.valid = false;
    validationResults.reasons.push(\`Validation error: \${error.message}\`);
    return validationResults;
  }
}

// Export validation function
window.automancyReactions = window.automancyReactions || {};
window.automancyReactions.validateReactionUse = validateReactionUse;`;
  }

  private generateResourceValidation(ability: ParsedAbility): string {
    if (!ability.resources || (ability.resources.consumed || 0) <= 0) {
      return '// No resource requirements';
    }

    return `
    // Check resource availability
    const resource = actor.system.resources.${ability.resources.type};
    if (!resource || resource.value < ${ability.resources.consumed}) {
      validationResults.valid = false;
      validationResults.reasons.push("Insufficient ${ability.resources.type} resources");
      return validationResults;
    }`;
  }

  private generateSpecificReactionValidation(ability: ParsedAbility, trackingData: ReactionTrackingData): string {
    // Specific validation based on ability name or triggers
    if (ability.name.toLowerCase().includes('rush')) {
      return `
    // Validate Hulking Rush specific requirements
    const damageTaken = actor.getFlag("automancy", "damageTakenThisTurn");
    if (!damageTaken || damageTaken <= 0) {
      validationResults.valid = false;
      validationResults.reasons.push("Must have taken damage this turn");
      return validationResults;
    }`;
    }

    return '// No specific validation requirements';
  }

  private generateReactionConsumptionMacro(ability: ParsedAbility, trackingData: ReactionTrackingData): string {
    return `
// ${ability.name} Reaction Consumption Macro
// Handles resource consumption and tracking after reaction use

if (args[0].macroPass !== "postItemRoll") return;

const { workflow, actor, item } = args[0];

try {
  console.log("Processing reaction consumption for ${ability.name}");

  // Consume reaction for the round
  await actor.setFlag("automancy", "reactionUsedThisRound", true);
  
  // Track reaction usage statistics
  const reactionStats = actor.getFlag("automancy", "reactionStats") || {};
  const abilityStats = reactionStats["${ability.name}"] || { used: 0, lastUsed: null };
  
  abilityStats.used += 1;
  abilityStats.lastUsed = Date.now();
  
  reactionStats["${ability.name}"] = abilityStats;
  await actor.setFlag("automancy", "reactionStats", reactionStats);

  // Consume additional resources if required
  ${this.generateResourceConsumption(ability)}

  // Update UI to show reaction used
  ui.notifications.info(\`${ability.name} reaction used!\`);
  
  // Visual indicator on token
  if (workflow.token) {
    await workflow.token.document.update({
      "flags.automancy.reactionUsedIndicator": true
    });
    
    // Remove indicator at end of round
    setTimeout(async () => {
      await workflow.token.document.unsetFlag("automancy", "reactionUsedIndicator");
    }, 1000);
  }

  console.log("Reaction consumption processed successfully");

} catch (error) {
  console.error("Reaction consumption failed:", error);
  ui.notifications.error("Failed to process reaction consumption");
}`;
  }

  private generateResourceConsumption(ability: ParsedAbility): string {
    if (!ability.resources || (ability.resources.consumed || 0) <= 0) {
      return '// No additional resource consumption';
    }

    return `
  // Consume ${ability.resources.consumed} ${ability.resources.type} resource(s)
  const currentResources = actor.system.resources.${ability.resources.type}.value;
  if (currentResources >= ${ability.resources.consumed}) {
    await actor.update({
      "system.resources.${ability.resources.type}.value": currentResources - ${ability.resources.consumed}
    });
    console.log("Consumed ${ability.resources.consumed} ${ability.resources.type} resource(s)");
  }`;
  }

  private generateReactionHooks(ability: ParsedAbility, trackingData: ReactionTrackingData): ReactionHook[] {
    const hooks: ReactionHook[] = [];

    // Generate hooks for each trigger type
    for (const trigger of trackingData.triggers) {
      hooks.push({
        event: trigger.hook,
        priority: trigger.priority,
        content: this.generateTriggerHookContent(ability, trigger)
      });
    }

    return hooks;
  }

  private generateTriggerHookContent(ability: ParsedAbility, trigger: ReactionTrigger): string {
    return `
// Hook for ${ability.name} - ${trigger.type}
Hooks.on("${trigger.hook}", async (...args) => {
  console.log("${trigger.hook} fired, checking for ${ability.name} reaction");
  
  // Find actors with this reaction
  const candidates = game.actors.filter(actor => 
    actor.items.some(item => item.name === "${ability.name}")
  );
  
  for (const actor of candidates) {
    // Skip if not in combat or not actor's turn context
    if (!game.combat || !actor.isOwner) continue;
    
    // Execute reaction trigger macro
    const triggerMacro = game.macros.find(m => 
      m.name === "${ability.name.replace(/\s+/g, '')}ReactionTrigger"
    );
    
    if (triggerMacro) {
      try {
        await triggerMacro.execute({
          actor: actor,
          token: actor.getActiveTokens()[0],
          trigger: "${trigger.type}",
          hookArgs: args
        });
      } catch (error) {
        console.error(\`Reaction trigger failed for \${actor.name}:\`, error);
      }
    }
  }
});`;
  }

  private generateReactionFlags(ability: ParsedAbility, trackingData: ReactionTrackingData): Record<string, any> {
    return {
      'midi-qol': {
        reactionTracking: true,
        reactionType: trackingData.triggers[0]?.type || 'manual'
      },
      'gambits-premades': {
        isReaction: true,
        reactionTriggers: trackingData.triggers.map(t => t.type),
        consumesReaction: trackingData.consumesReaction
      },
      automancy: {
        reactionSystem: true,
        trackingData: trackingData,
        professionalGrade: true
      }
    };
  }

  private generateReactionValidation(ability: ParsedAbility, trackingData: ReactionTrackingData): string {
    return `
// Professional reaction validation for ${ability.name}
function validateReaction(workflow, actor, token) {
  // Standard validation checks
  const checks = [
    () => !actor.getFlag("automancy", "reactionUsedThisRound"),
    () => !actor.effects.some(e => e.statuses.has("incapacitated")),
    () => !actor.effects.some(e => e.statuses.has("unconscious")),
    ${trackingData.conditions?.map(c => this.generateConditionCheck(c)).join(',\n    ') || ''}
  ];
  
  return checks.every(check => check());
}`;
  }

  private generateConditionCheck(condition: ReactionCondition): string {
    switch (condition.type) {
      case 'line_of_sight':
        return '() => canvas.sight.testVisibility(token.center, workflow.token.center)';
      case 'weapon_attack':
        return '() => ["mwak", "rwak"].includes(workflow.item?.system.actionType)';
      case 'target_type':
        return `() => workflow.token.actor.system.details.type.value === "${condition.value}"`;
      default:
        return '() => true';
    }
  }

  // Global system methods
  private generateGlobalTrackingHooks(): string {
    return `
// Global reaction tracking system
Hooks.on("combatRound", async (combat, updateData, options) => {
  // Reset reaction usage at start of each round
  for (const combatant of combat.combatants) {
    if (combatant.actor) {
      await combatant.actor.unsetFlag("automancy", "reactionUsedThisRound");
      await combatant.actor.unsetFlag("automancy", "reactionUsedIndicator");
    }
  }
  
  console.log("Reactions reset for new round");
});

// Track damage for reaction triggers
Hooks.on("midi-qol.DamageWorkflowComplete", async (workflow) => {
  if (workflow.damageRoll?.total > 0) {
    for (const target of workflow.hitTargets) {
      const currentDamage = target.actor.getFlag("automancy", "damageTakenThisTurn") || 0;
      await target.actor.setFlag("automancy", "damageTakenThisTurn", currentDamage + workflow.damageRoll.total);
    }
  }
});`;
  }

  private generateReactionResetSystem(): string {
    return `
// Reaction reset system
const ReactionReset = {
  
  // Reset all reactions for new round
  resetForNewRound: async function(combat) {
    for (const combatant of combat.combatants) {
      if (combatant.actor) {
        await combatant.actor.unsetFlag("automancy", "reactionUsedThisRound");
        await combatant.actor.unsetFlag("automancy", "damageTakenThisTurn");
      }
    }
  },
  
  // Reset specific actor's reaction
  resetActorReaction: async function(actor) {
    await actor.unsetFlag("automancy", "reactionUsedThisRound");
    ui.notifications.info(\`\${actor.name}'s reaction has been reset\`);
  },
  
  // Force use reaction (for manual consumption)
  consumeReaction: async function(actor, abilityName) {
    await actor.setFlag("automancy", "reactionUsedThisRound", true);
    await actor.setFlag("automancy", "lastReactionUsed", {
      ability: abilityName,
      timestamp: Date.now()
    });
  }
};

window.automancyReactions = window.automancyReactions || {};
Object.assign(window.automancyReactions, ReactionReset);`;
  }

  private generateReactionPrioritySystem(): string {
    return `
// Reaction priority system for multiple simultaneous triggers
const ReactionPriority = {
  
  priorities: {
    'damage_taken': 100,
    'being_attacked': 90,
    'spell_cast': 85,
    'target_moves': 80,
    'opportunity_attack': 70
  },
  
  // Queue reactions by priority
  queueReaction: function(actor, abilityName, triggerType, context) {
    const queue = this.getReactionQueue();
    const priority = this.priorities[triggerType] || 50;
    
    queue.push({
      actor: actor,
      ability: abilityName,
      trigger: triggerType,
      priority: priority,
      context: context,
      timestamp: Date.now()
    });
    
    // Sort by priority (highest first)
    queue.sort((a, b) => b.priority - a.priority);
    
    this.setReactionQueue(queue);
  },
  
  // Process reaction queue
  processQueue: async function() {
    const queue = this.getReactionQueue();
    if (queue.length === 0) return;
    
    console.log(\`Processing \${queue.length} queued reactions\`);
    
    for (const reaction of queue) {
      if (reaction.actor.getFlag("automancy", "reactionUsedThisRound")) {
        continue; // Skip if reaction already used
      }
      
      // Execute highest priority reaction
      await this.executeQueuedReaction(reaction);
      break; // Only execute one reaction per trigger
    }
    
    this.clearReactionQueue();
  },
  
  getReactionQueue: function() {
    return game.settings.get("automancy", "reactionQueue") || [];
  },
  
  setReactionQueue: function(queue) {
    game.settings.set("automancy", "reactionQueue", queue);
  },
  
  clearReactionQueue: function() {
    game.settings.set("automancy", "reactionQueue", []);
  }
};

window.automancyReactions = window.automancyReactions || {};
Object.assign(window.automancyReactions, ReactionPriority);`;
  }

  private generateReactionDialogSystem(): string {
    return `
// Professional reaction dialog system
class ReactionDialog extends Dialog {
  
  static async prompt(options) {
    const {
      title,
      abilityName,
      triggerText,
      range,
      actor,
      workflow,
      validTargets
    } = options;
    
    const content = \`
      <div class="reaction-dialog">
        <h3>\${title}</h3>
        <p><strong>Trigger:</strong> \${triggerText}</p>
        <p><strong>Range:</strong> \${range} feet</p>
        \${validTargets.length > 0 ? 
          \`<p><strong>Valid Targets:</strong> \${validTargets.length}</p>\` : 
          '<p class="warning">No valid targets in range</p>'
        }
        <hr>
        <p>Use your reaction for <strong>\${abilityName}</strong>?</p>
      </div>
    \`;
    
    return new Promise((resolve) => {
      new ReactionDialog({
        title: \`Reaction: \${title}\`,
        content: content,
        buttons: {
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: "Use Reaction",
            callback: () => resolve({
              confirmed: true,
              targetToken: validTargets[0] || null
            })
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: "Don't Use",
            callback: () => resolve({
              confirmed: false,
              targetToken: null
            })
          }
        },
        default: "yes",
        close: () => resolve({
          confirmed: false,
          targetToken: null
        })
      }, {
        width: 400,
        height: "auto"
      }).render(true);
    });
  }
}

window.ReactionDialog = ReactionDialog;`;
  }

  // Helper methods for parsing reaction text
  private extractReactionRange(text: string): number | null {
    const rangeMatch = text.match(/(?:within|range of) (\d+) (?:feet|ft)/i);
    return rangeMatch ? parseInt(rangeMatch[1]) : null;
  }

  private extractReactionConditions(text: string): ReactionCondition[] {
    const conditions: ReactionCondition[] = [];

    if (text.includes('can see')) {
      conditions.push({ type: 'line_of_sight', value: null });
    }

    if (text.includes('weapon attack')) {
      conditions.push({ type: 'weapon_attack', value: null });
    }

    const targetTypeMatch = text.match(/against (?:a |an )?(\w+)/i);
    if (targetTypeMatch) {
      conditions.push({ 
        type: 'target_type', 
        value: targetTypeMatch[1].toLowerCase() 
      });
    }

    return conditions;
  }

  private extractReactionTiming(text: string): 'before' | 'after' | 'immediate' {
    if (text.includes('before')) return 'before';
    if (text.includes('after')) return 'after';
    return 'immediate';
  }

  // Trigger-specific validation generators
  private generateDamageTriggerValidation(text: string): string {
    return 'workflow.damageRoll && workflow.damageRoll.total > 0 && workflow.hitTargets.has(token)';
  }

  private generateAttackTriggerValidation(text: string): string {
    return 'workflow.targets && workflow.targets.has(token)';
  }

  private generateMovementTriggerValidation(text: string): string {
    return 'canvas.grid.measureDistance(args[0].previousPosition, args[0].newPosition) >= 5';
  }

  private generateSpellTriggerValidation(text: string): string {
    return 'workflow.item && workflow.item.type === "spell"';
  }

  private generateOpportunityTriggerValidation(text: string): string {
    return 'workflow.isOpportunityAttack === true';
  }
}

// Type definitions
interface ReactionSystemData {
  isReaction: boolean;
  trackingData: ReactionTrackingData | null;
  macros: ReactionMacro[];
  hooks: ReactionHook[];
  flags: Record<string, any>;
  validation?: string;
}

interface ReactionTrackingData {
  triggers: ReactionTrigger[];
  consumesReaction: boolean;
  range: number | null;
  conditions: ReactionCondition[];
  timing: 'before' | 'after' | 'immediate';
}

interface ReactionTrigger {
  type: 'damage_taken' | 'being_attacked' | 'target_moves' | 'spell_cast' | 'opportunity_attack';
  hook: string;
  priority: number;
  validation: string;
}

interface ReactionCondition {
  type: 'line_of_sight' | 'weapon_attack' | 'target_type';
  value: string | null;
}

interface ReactionMacro {
  name: string;
  type: 'trigger' | 'validation' | 'consumption';
  content: string;
  executionHook: string;
}

interface ReactionHook {
  event: string;
  priority: number;
  content: string;
}

interface GlobalReactionSystem {
  trackingHooks: string;
  resetSystem: string;
  prioritySystem: string;
  dialogSystem: string;
}