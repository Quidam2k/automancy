import { ParsedAbility, FoundryItemData } from '../types';

/**
 * Professional recharge automation system
 * Handles D&D 5e recharge mechanics with full automation
 */
export class RechargeAutomation {

  /**
   * Generate complete recharge automation for abilities
   */
  public generateRechargeSystem(ability: ParsedAbility): RechargeSystemData {
    const rechargeData = this.analyzeRechargeRequirements(ability.raw);
    
    if (!rechargeData) {
      return {
        hasRecharge: false,
        itemUpdates: {},
        macros: [],
        hooks: []
      };
    }

    return {
      hasRecharge: true,
      rechargeData,
      itemUpdates: this.generateItemUpdates(rechargeData),
      macros: this.generateRechargeMacros(ability, rechargeData),
      hooks: this.generateRechargeHooks(ability, rechargeData),
      flags: this.generateRechargeFlags(ability, rechargeData)
    };
  }

  /**
   * Generate automatic recharge rolling system
   */
  public generateAutoRechargeSystem(abilities: ParsedAbility[]): AutoRechargeSystem {
    const rechargeAbilities = abilities.filter(a => this.hasRechargeRequirement(a.raw));
    
    return {
      combatHook: this.generateCombatRechargeHook(rechargeAbilities),
      turnHook: this.generateTurnRechargeHook(rechargeAbilities),
      rollMacro: this.generateRechargeRollMacro(),
      trackingSystem: this.generateRechargeTrackingSystem()
    };
  }

  private analyzeRechargeRequirements(text: string): RechargeData | null {
    // Standard recharge pattern: (Recharge 5-6) or (Recharge 6)
    const standardMatch = text.match(/\(Recharge (\d+)(?:-(\d+))?\)/i);
    if (standardMatch) {
      const minRoll = parseInt(standardMatch[1]);
      const maxRoll = standardMatch[2] ? parseInt(standardMatch[2]) : 6;
      
      return {
        type: 'standard',
        minRoll,
        maxRoll,
        timing: 'start_of_turn',
        automatic: true
      };
    }

    // Limited use recharge patterns
    const limitedMatch = text.match(/\((\d+)\/(?:Day|Rest|Short Rest|Long Rest)\)/i);
    if (limitedMatch) {
      const uses = parseInt(limitedMatch[1]);
      const restType = limitedMatch[0].toLowerCase();
      
      return {
        type: 'limited_use',
        maxUses: uses,
        restoreOn: this.parseRestType(restType),
        timing: 'rest',
        automatic: false
      };
    }

    // Conditional recharge patterns
    const conditionalMatch = text.match(/recharges? (?:when|if) (.+?)(?:\.|,|$)/i);
    if (conditionalMatch) {
      return {
        type: 'conditional',
        condition: conditionalMatch[1].trim(),
        timing: 'conditional',
        automatic: false
      };
    }

    return null;
  }

  private generateItemUpdates(rechargeData: RechargeData): Record<string, any> {
    const updates: Record<string, any> = {};

    if (rechargeData.type === 'standard') {
      updates['system.recharge'] = {
        value: rechargeData.minRoll,
        charged: true // Start charged
      };
    } else if (rechargeData.type === 'limited_use') {
      updates['system.uses'] = {
        value: rechargeData.maxUses,
        max: rechargeData.maxUses,
        per: this.convertRestTypeToFoundry(rechargeData.restoreOn)
      };
    }

    return updates;
  }

  private generateRechargeMacros(ability: ParsedAbility, rechargeData: RechargeData): RechargeMacro[] {
    const macros: RechargeMacro[] = [];

    // Usage tracking macro
    macros.push({
      name: `${ability.name.replace(/\s+/g, '')}Usage`,
      type: 'usage_tracking',
      content: this.generateUsageTrackingMacro(ability, rechargeData),
      executionPoint: 'postItemRoll'
    });

    // Recharge rolling macro (for standard recharge)
    if (rechargeData.type === 'standard') {
      macros.push({
        name: `${ability.name.replace(/\s+/g, '')}Recharge`,
        type: 'recharge_roll',
        content: this.generateRechargeRollMacroContent(ability, rechargeData),
        executionPoint: 'turnStart'
      });
    }

    // Conditional recharge macro
    if (rechargeData.type === 'conditional') {
      macros.push({
        name: `${ability.name.replace(/\s+/g, '')}ConditionalRecharge`,
        type: 'conditional_recharge',
        content: this.generateConditionalRechargeMacro(ability, rechargeData),
        executionPoint: 'conditional'
      });
    }

    return macros;
  }

  private generateUsageTrackingMacro(ability: ParsedAbility, rechargeData: RechargeData): string {
    return `
// ${ability.name} Usage Tracking Macro
// Handles post-use resource management

if (args[0].macroPass !== "postItemRoll") return;

const { workflow, item, actor } = args[0];

try {
  console.log("Tracking usage for ${ability.name}");
  
  ${this.generateUsageLogic(ability, rechargeData)}
  
  // Update UI to reflect current state
  ui.actors.render();
  
  ${this.generateRechargeNotification(ability, rechargeData)}
  
} catch (error) {
  console.error("Usage tracking failed for ${ability.name}:", error);
}`;
  }

  private generateUsageLogic(ability: ParsedAbility, rechargeData: RechargeData): string {
    if (rechargeData.type === 'standard') {
      return `
  // Mark ability as used (needs recharge)
  await item.update({
    "system.recharge.charged": false
  });
  
  console.log("${ability.name} used - requires recharge ${rechargeData.minRoll}-${rechargeData.maxRoll}");`;
    } else if (rechargeData.type === 'limited_use') {
      return `
  // Consume one use
  const currentUses = item.system.uses.value;
  if (currentUses > 0) {
    await item.update({
      "system.uses.value": currentUses - 1
    });
    console.log(\`${ability.name} used - \${currentUses - 1} uses remaining\`);
  }`;
    }

    return '// No specific usage logic required';
  }

  private generateRechargeNotification(ability: ParsedAbility, rechargeData: RechargeData): string {
    if (rechargeData.type === 'standard') {
      return `
  // Notify about recharge requirement
  ui.notifications.info(\`${ability.name} used! Will attempt recharge at start of next turn (${rechargeData.minRoll}-${rechargeData.maxRoll})\`);`;
    } else if (rechargeData.type === 'limited_use') {
      return `
  // Notify about remaining uses
  const remainingUses = item.system.uses.value - 1;
  if (remainingUses > 0) {
    ui.notifications.info(\`${ability.name} used! \${remainingUses} uses remaining\`);
  } else {
    ui.notifications.warn(\`${ability.name} used! No uses remaining until ${rechargeData.restoreOn}\`);
  }`;
    }

    return '';
  }

  private generateRechargeRollMacroContent(ability: ParsedAbility, rechargeData: RechargeData): string {
    return `
// ${ability.name} Automatic Recharge Roll
// Executes at start of each turn if ability is not charged

// Only run for the owning actor's turn
if (!game.combat?.current?.actor?.uuid === actor.uuid) return;

const item = actor.items.find(i => i.name === "${ability.name}");
if (!item) return;

// Check if already charged
if (item.system.recharge?.charged) {
  console.log("${ability.name} already charged");
  return;
}

try {
  // Roll d6 for recharge
  const rechargeRoll = await new Roll("1d6").evaluate({ async: true });
  const rollResult = rechargeRoll.total;
  
  // Check if recharge successful
  const recharged = rollResult >= ${rechargeData.minRoll};
  
  // Create chat message for recharge attempt
  const flavor = recharged 
    ? \`<strong>${ability.name}</strong> recharges! (rolled \${rollResult})\`
    : \`<strong>${ability.name}</strong> does not recharge (rolled \${rollResult}, needed ${rechargeData.minRoll}+)\`;
  
  await rechargeRoll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: flavor,
    content: \`<div class="dice-roll">
      <div class="dice-result">
        <div class="dice-formula">Recharge Roll: d6</div>
        <div class="dice-tooltip">
          <section class="tooltip-part">
            <div class="dice">
              <p class="part-formula">1d6</p>
              <ol class="dice-rolls">
                <li class="roll die d6">\${rollResult}</li>
              </ol>
            </div>
          </section>
        </div>
        <h4 class="dice-total \${recharged ? 'success' : 'failure'}">\${rollResult}</h4>
      </div>
    </div>\`
  });
  
  // Update item if recharged
  if (recharged) {
    await item.update({
      "system.recharge.charged": true
    });
    
    // Visual notification
    ui.notifications.info(\`${ability.name} has recharged!\`);
    
    // Add visual effect to token
    if (canvas.tokens.controlled.length > 0) {
      const token = canvas.tokens.controlled[0];
      await token.document.update({
        "effects": token.document.effects.concat([{
          tint: "#00ff00",
          duration: 2000,
          intensity: 0.3
        }])
      });
    }
  }
  
  console.log(\`${ability.name} recharge attempt: rolled \${rollResult}, recharged: \${recharged}\`);
  
} catch (error) {
  console.error("Recharge roll failed:", error);
  ui.notifications.error("Failed to roll recharge for ${ability.name}");
}`;
  }

  private generateConditionalRechargeMacro(ability: ParsedAbility, rechargeData: RechargeData): string {
    return `
// ${ability.name} Conditional Recharge Macro
// Condition: ${rechargeData.condition}

// This macro should be called when the recharge condition is met
// Condition: ${rechargeData.condition}

async function checkRechargeCondition() {
  const item = actor.items.find(i => i.name === "${ability.name}");
  if (!item || item.system.recharge?.charged) return;
  
  ${this.generateConditionCheck(rechargeData.condition || 'unknown')}
  
  if (conditionMet) {
    await item.update({
      "system.recharge.charged": true
    });
    
    ui.notifications.info(\`${ability.name} has recharged due to: ${rechargeData.condition}\`);
    
    // Create chat message
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: \`<strong>${ability.name}</strong> recharges! Condition met: ${rechargeData.condition}\`,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }
}

// Call the check function
checkRechargeCondition();`;
  }

  private generateConditionCheck(condition: string): string {
    // Parse common conditional recharge patterns
    if (condition.includes('deals damage')) {
      return `
  // Check if actor dealt damage this turn
  const dealtDamage = actor.getFlag("automancy", "dealtDamageThisTurn");
  const conditionMet = dealtDamage && dealtDamage > 0;`;
    }

    if (condition.includes('takes damage')) {
      return `
  // Check if actor took damage this turn
  const tookDamage = actor.getFlag("automancy", "tookDamageThisTurn");
  const conditionMet = tookDamage && tookDamage > 0;`;
    }

    if (condition.includes('kills') || condition.includes('reduces to 0')) {
      return `
  // Check if actor killed an enemy this turn
  const killedEnemy = actor.getFlag("automancy", "killedEnemyThisTurn");
  const conditionMet = killedEnemy === true;`;
    }

    return `
  // Custom condition check - implement based on specific ability
  // Condition: ${condition}
  const conditionMet = false; // TODO: Implement condition logic`;
  }

  private generateRechargeHooks(ability: ParsedAbility, rechargeData: RechargeData): RechargeHook[] {
    const hooks: RechargeHook[] = [];

    if (rechargeData.type === 'standard') {
      hooks.push({
        event: 'combatTurn',
        priority: 100,
        content: `
// Auto-recharge hook for ${ability.name}
Hooks.on("combatTurn", async (combat, updateData, options) => {
  const currentCombatant = combat.combatant;
  if (!currentCombatant?.actor) return;
  
  const item = currentCombatant.actor.items.find(i => i.name === "${ability.name}");
  if (!item || item.system.recharge?.charged) return;
  
  // Execute recharge macro
  const macro = game.macros.find(m => m.name === "${ability.name.replace(/\s+/g, '')}Recharge");
  if (macro) {
    await macro.execute({ actor: currentCombatant.actor });
  }
});`
      });
    }

    return hooks;
  }

  private generateRechargeFlags(ability: ParsedAbility, rechargeData: RechargeData): Record<string, any> {
    return {
      'midi-qol': {
        rechargeTracking: true,
        postUseMacro: `${ability.name.replace(/\s+/g, '')}Usage,postItemRoll`
      },
      automancy: {
        rechargeType: rechargeData.type,
        rechargeData: rechargeData,
        automatedRecharge: rechargeData.automatic
      }
    };
  }

  private generateCombatRechargeHook(abilities: ParsedAbility[]): string {
    return `
// Global combat recharge system
Hooks.on("combatTurn", async (combat, updateData, options) => {
  const currentCombatant = combat.combatant;
  if (!currentCombatant?.actor) return;
  
  console.log("Processing recharge abilities for", currentCombatant.actor.name);
  
  // Check all recharge abilities
  const rechargeAbilities = [${abilities.map(a => `"${a.name}"`).join(', ')}];
  
  for (const abilityName of rechargeAbilities) {
    const item = currentCombatant.actor.items.find(i => i.name === abilityName);
    if (!item || item.system.recharge?.charged) continue;
    
    const rechargeMacro = game.macros.find(m => m.name === \`\${abilityName.replace(/\\s+/g, '')}Recharge\`);
    if (rechargeMacro) {
      try {
        await rechargeMacro.execute({ 
          actor: currentCombatant.actor,
          token: currentCombatant.token?.object
        });
      } catch (error) {
        console.error(\`Failed to execute recharge for \${abilityName}:\`, error);
      }
    }
  }
});`;
  }

  private generateTurnRechargeHook(abilities: ParsedAbility[]): string {
    return `
// Turn-based recharge tracking
Hooks.on("updateCombat", async (combat, updateData, options) => {
  if (!updateData.turn && !updateData.round) return;
  
  // Reset turn-based flags for all actors
  for (const combatant of combat.combatants) {
    if (!combatant.actor) continue;
    
    await combatant.actor.unsetFlag("automancy", "dealtDamageThisTurn");
    await combatant.actor.unsetFlag("automancy", "tookDamageThisTurn");
    await combatant.actor.unsetFlag("automancy", "killedEnemyThisTurn");
  }
});`;
  }

  private generateRechargeRollMacro(): string {
    return `
// Universal recharge roll macro
async function rollRecharge(actor, itemName, minRoll = 6, maxRoll = 6) {
  const item = actor.items.find(i => i.name === itemName);
  if (!item) {
    ui.notifications.error(\`Item "\${itemName}" not found\`);
    return false;
  }
  
  if (item.system.recharge?.charged) {
    ui.notifications.info(\`\${itemName} is already charged\`);
    return true;
  }
  
  const roll = await new Roll("1d6").evaluate({ async: true });
  const success = roll.total >= minRoll;
  
  const flavor = success 
    ? \`<strong>\${itemName}</strong> recharges! (rolled \${roll.total})\`
    : \`<strong>\${itemName}</strong> does not recharge (rolled \${roll.total}, needed \${minRoll}+)\`;
  
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: flavor
  });
  
  if (success) {
    await item.update({ "system.recharge.charged": true });
  }
  
  return success;
}

// Export function
window.automancyRecharge = { rollRecharge };`;
  }

  private generateRechargeTrackingSystem(): string {
    return `
// Recharge tracking system
const RechargeTracker = {
  
  // Track damage dealt for conditional recharge
  trackDamageDealt: async function(actor, damage) {
    const current = actor.getFlag("automancy", "dealtDamageThisTurn") || 0;
    await actor.setFlag("automancy", "dealtDamageThisTurn", current + damage);
  },
  
  // Track damage taken for conditional recharge  
  trackDamageTaken: async function(actor, damage) {
    const current = actor.getFlag("automancy", "tookDamageThisTurn") || 0;
    await actor.setFlag("automancy", "tookDamageThisTurn", current + damage);
  },
  
  // Track enemy kills for conditional recharge
  trackEnemyKill: async function(actor) {
    await actor.setFlag("automancy", "killedEnemyThisTurn", true);
  },
  
  // Check if ability can recharge based on conditions
  checkConditionalRecharge: async function(actor, abilityName, condition) {
    const item = actor.items.find(i => i.name === abilityName);
    if (!item || item.system.recharge?.charged) return false;
    
    let conditionMet = false;
    
    switch (condition) {
      case "dealt_damage":
        conditionMet = (actor.getFlag("automancy", "dealtDamageThisTurn") || 0) > 0;
        break;
      case "took_damage":
        conditionMet = (actor.getFlag("automancy", "tookDamageThisTurn") || 0) > 0;
        break;
      case "killed_enemy":
        conditionMet = actor.getFlag("automancy", "killedEnemyThisTurn") === true;
        break;
    }
    
    if (conditionMet) {
      await item.update({ "system.recharge.charged": true });
      ui.notifications.info(\`\${abilityName} has recharged!\`);
      return true;
    }
    
    return false;
  }
};

window.automancyRecharge = window.automancyRecharge || {};
Object.assign(window.automancyRecharge, RechargeTracker);`;
  }

  // Helper methods
  private hasRechargeRequirement(text: string): boolean {
    return /\(Recharge \d+(?:-\d+)?\)/i.test(text) ||
           /\(\d+\/(?:Day|Rest|Short Rest|Long Rest)\)/i.test(text) ||
           /recharges? (?:when|if)/i.test(text);
  }

  private parseRestType(restText: string): string {
    if (restText.includes('short rest')) return 'short_rest';
    if (restText.includes('long rest')) return 'long_rest';
    if (restText.includes('day')) return 'day';
    return 'long_rest';
  }

  private convertRestTypeToFoundry(restType: string | undefined): string {
    switch (restType) {
      case 'short_rest': return 'sr';
      case 'long_rest': return 'lr';
      case 'day': return 'day';
      default: return 'lr';
    }
  }
}

// Type definitions
interface RechargeSystemData {
  hasRecharge: boolean;
  rechargeData?: RechargeData;
  itemUpdates: Record<string, any>;
  macros: RechargeMacro[];
  hooks: RechargeHook[];
  flags?: Record<string, any>;
}

interface RechargeData {
  type: 'standard' | 'limited_use' | 'conditional';
  minRoll?: number;
  maxRoll?: number;
  maxUses?: number;
  restoreOn?: string;
  condition?: string;
  timing: 'start_of_turn' | 'end_of_turn' | 'rest' | 'conditional';
  automatic: boolean;
}

interface RechargeMacro {
  name: string;
  type: 'usage_tracking' | 'recharge_roll' | 'conditional_recharge';
  content: string;
  executionPoint: string;
}

interface RechargeHook {
  event: string;
  priority: number;
  content: string;
}

interface AutoRechargeSystem {
  combatHook: string;
  turnHook: string;
  rollMacro: string;
  trackingSystem: string;
}