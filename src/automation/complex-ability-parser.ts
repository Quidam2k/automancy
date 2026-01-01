import { ParsedAbility, AbilityType, AutomationComplexity } from '../types';

/**
 * Advanced parser for complex multi-step abilities
 * Handles conditional requirements, linked effects, and sophisticated automation
 */
export class ComplexAbilityParser {

  /**
   * Enhanced parsing for complex abilities with conditional logic
   */
  public parseComplexAbility(ability: ParsedAbility): EnhancedAbilityData {
    const enhanced: EnhancedAbilityData = {
      ...ability,
      requirements: this.parseRequirements(ability.raw),
      linkedEffects: this.parseLinkedEffects(ability.raw),
      automation: this.determineAutomationStrategy(ability),
      professionalFlags: this.generateProfessionalFlags(ability)
    };

    // Recalculate complexity based on enhanced analysis
    enhanced.complexity = this.assessEnhancedComplexity(enhanced);

    return enhanced;
  }

  private parseRequirements(text: string): AbilityRequirement[] {
    const requirements: AbilityRequirement[] = [];

    // Movement-based requirements (like Deadly Leap)
    const movementMatch = text.match(/(?:leaps?|jumps?) at least (\d+) (?:feet|ft\.?) (?:toward|towards?) (?:a )?target/i);
    if (movementMatch) {
      requirements.push({
        type: 'movement',
        condition: `leap_distance >= ${movementMatch[1]}`,
        description: `Must leap at least ${movementMatch[1]} feet toward target`,
        automationHook: 'preAttackRoll',
        validationMacro: this.generateMovementValidationMacro(parseInt(movementMatch[1]))
      });
    }

    // Line of sight requirements
    if (text.match(/can see|within (?:sight|line of sight)/i)) {
      requirements.push({
        type: 'visibility',
        condition: 'line_of_sight',
        description: 'Must have line of sight to target',
        automationHook: 'preTargeting',
        validationMacro: this.generateVisibilityValidationMacro()
      });
    }

    // Health-based requirements
    const healthMatch = text.match(/(?:when|if) (?:the owlbear|you) takes? damage/i);
    if (healthMatch) {
      requirements.push({
        type: 'trigger',
        condition: 'takes_damage',
        description: 'Triggered when taking damage',
        automationHook: 'onDamaged',
        validationMacro: this.generateDamageTriggerMacro()
      });
    }

    // Resource consumption requirements
    const rechargeMatch = text.match(/\(Recharge (\d+)(?:-(\d+))?\)/i);
    if (rechargeMatch) {
      requirements.push({
        type: 'recharge',
        condition: `recharge_${rechargeMatch[1]}_${rechargeMatch[2] || 6}`,
        description: `Recharges on ${rechargeMatch[1]}-${rechargeMatch[2] || 6}`,
        automationHook: 'preItemRoll',
        validationMacro: this.generateRechargeValidationMacro(
          parseInt(rechargeMatch[1]), 
          parseInt(rechargeMatch[2] || '6')
        )
      });
    }

    return requirements;
  }

  private parseLinkedEffects(text: string): LinkedEffect[] {
    const linkedEffects: LinkedEffect[] = [];

    // Grapple -> Restrain -> Ongoing Damage chain (Bear Hug)
    if (text.includes('grappled') && text.includes('restrained') && text.includes('damage at the start')) {
      linkedEffects.push({
        trigger: 'save_failure',
        sequence: [
          {
            step: 1,
            action: 'apply_condition',
            condition: 'grappled',
            timing: 'immediate'
          },
          {
            step: 2,
            action: 'apply_condition', 
            condition: 'restrained',
            timing: 'immediate',
            linkedTo: 'grappled'
          },
          {
            step: 3,
            action: 'ongoing_damage',
            timing: 'start_of_turn',
            linkedTo: 'grappled',
            endCondition: 'grapple_ends'
          }
        ]
      });
    }

    // Attack -> Condition chain (Deadly Leap)
    if (text.match(/hits? them with.*then.*saving throw/i)) {
      linkedEffects.push({
        trigger: 'successful_attack',
        sequence: [
          {
            step: 1,
            action: 'validate_requirement',
            condition: 'movement_distance',
            timing: 'pre_attack'
          },
          {
            step: 2,
            action: 'force_save',
            timing: 'post_hit',
            linkedTo: 'movement_validation'
          },
          {
            step: 3,
            action: 'apply_condition',
            condition: 'prone',
            timing: 'post_save_failure'
          }
        ]
      });
    }

    return linkedEffects;
  }

  private determineAutomationStrategy(ability: ParsedAbility): AutomationStrategy {
    const strategy: AutomationStrategy = {
      primary: 'workflow_integration',
      hooks: [],
      macros: [],
      effects: []
    };

    // Multi-step abilities need comprehensive workflow integration
    if (ability.raw.includes('then') || ability.raw.includes('until')) {
      strategy.primary = 'multi_step_workflow';
      strategy.hooks.push('preItemRoll', 'postAttackRoll', 'postSave', 'preActiveEffects');
    }

    // Recharge abilities need resource tracking
    if (ability.raw.match(/recharge \d+/i)) {
      strategy.hooks.push('preItemRoll', 'postItemRoll');
      strategy.macros.push('recharge_management');
    }

    // Reaction abilities need trigger monitoring
    if (ability.type === AbilityType.REACTION) {
      strategy.hooks.push('isDamaged', 'preAttackRoll');
      strategy.macros.push('reaction_trigger');
    }

    // Ongoing effects need turn-based processing
    if (ability.raw.includes('at the start of each') || ability.raw.includes('until')) {
      strategy.hooks.push('turnStart', 'combatStart');
      strategy.effects.push('persistent_tracking');
    }

    return strategy;
  }

  private generateProfessionalFlags(ability: ParsedAbility): Record<string, any> {
    const flags: Record<string, any> = {};

    // Chris Premades compatibility flags
    flags['chris-premades'] = {
      info: {
        name: ability.name,
        version: '2.0.0',
        hasAnimation: false
      }
    };

    // Gambits Premades reaction flags
    if (ability.type === AbilityType.REACTION) {
      flags['gambits-premades'] = {
        isReaction: true,
        reactionTrigger: this.extractReactionTrigger(ability.raw)
      };
    }

    // MidiQOL professional workflow flags
    flags['midi-qol'] = {
      itemCondition: this.generateItemCondition(ability.raw),
      effectActivation: ability.complexity >= AutomationComplexity.MODERATE,
      rollAttackPerTarget: ability.target.value && ability.target.value > 1 ? 'default' : 'never'
    };

    // DAE special handling flags
    flags['dae'] = {
      alwaysActive: ability.type === AbilityType.PASSIVE,
      specialDuration: this.determineSpecialDuration(ability.raw)
    };

    return flags;
  }

  private assessEnhancedComplexity(enhanced: EnhancedAbilityData): AutomationComplexity {
    let complexity = enhanced.complexity;

    // Increase complexity for requirements
    if (enhanced.requirements.length > 0) {
      complexity = Math.max(complexity, AutomationComplexity.MODERATE);
    }

    // Increase complexity for linked effects  
    if (enhanced.linkedEffects.length > 0) {
      complexity = Math.max(complexity, AutomationComplexity.COMPLEX);
    }

    // Reactions are inherently complex
    if (enhanced.type === AbilityType.REACTION) {
      complexity = Math.max(complexity, AutomationComplexity.REACTION);
    }

    // Multi-step workflows are complex
    if (enhanced.automation.primary === 'multi_step_workflow') {
      complexity = Math.max(complexity, AutomationComplexity.COMPLEX);
    }

    return complexity;
  }

  // Macro generation methods
  private generateMovementValidationMacro(distance: number): string {
    return `
// Movement validation for ${distance} feet requirement
if (args[0].macroPass !== "preAttackRoll") return;

const token = args[0].token;
const targets = args[0].targets;

if (!token || !targets.length) return;

const target = targets[0];
const currentDistance = canvas.grid.measureDistance(token, target);

// Check if token moved at least required distance this turn
const movementHistory = token.getFlag("automancy", "movementHistory") || [];
const lastPosition = movementHistory[movementHistory.length - 1];

if (lastPosition) {
  const distanceMoved = canvas.grid.measureDistance(lastPosition, token);
  if (distanceMoved < ${distance}) {
    ui.notifications.warn("Must leap at least ${distance} feet toward target!");
    return false; // Cancel the workflow
  }
}

return true;
`;
  }

  private generateVisibilityValidationMacro(): string {
    return `
// Line of sight validation
if (args[0].macroPass !== "preTargeting") return;

const token = args[0].token;
const targets = args[0].targets;

for (const target of targets) {
  const canSee = canvas.sight.testVisibility(token.center, target.center);
  if (!canSee) {
    ui.notifications.warn(\`Cannot see \${target.name}!\`);
    return false;
  }
}

return true;
`;
  }

  private generateDamageTriggerMacro(): string {
    return `
// Damage trigger for reactions
// This hooks into the isDamaged workflow

if (args[0].macroPass !== "isDamaged") return;

const actor = args[0].actor;
const token = args[0].token;

// Check if reaction already used this round
const reactionUsed = actor.getFlag("automancy", "reactionUsedThisRound");
if (reactionUsed) return;

// Prompt for reaction use
const useReaction = await Dialog.confirm({
  title: "Hulking Rush",
  content: "<p>You took damage! Use your reaction to move without provoking opportunity attacks?</p>"
});

if (useReaction) {
  // Mark reaction as used
  await actor.setFlag("automancy", "reactionUsedThisRound", true);
  
  // Allow movement without opportunity attacks
  const movement = Math.floor(token.actor.system.attributes.movement.walk / 2);
  ui.notifications.info(\`You can move up to \${movement} feet without provoking opportunity attacks.\`);
  
  // Add temporary effect
  const effectData = {
    name: "Hulking Rush Movement",
    changes: [{
      key: "flags.midi-qol.ignoreNearbyFoes",
      mode: 5,
      value: "1"
    }],
    duration: { seconds: 6 }, // Until end of turn
    flags: { automancy: { temporary: true } }
  };
  
  await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
}
`;
  }

  private generateRechargeValidationMacro(min: number, max: number): string {
    return `
// Recharge validation and rolling
if (args[0].macroPass !== "preItemRoll") return;

const item = args[0].item;
const actor = args[0].actor;

// Check if ability is charged
const charged = item.system.recharge?.charged;
if (!charged) {
  ui.notifications.warn(\`\${item.name} is not charged! (Recharge ${min}-${max})\`);
  return false;
}

return true;
`;
  }

  private extractReactionTrigger(text: string): string {
    if (text.includes('takes damage')) return 'isDamaged';
    if (text.includes('attacked')) return 'isAttacked';
    if (text.includes('spell cast')) return 'spellCast';
    return 'manual';
  }

  private generateItemCondition(text: string): string | null {
    // Generate conditional logic for complex requirements
    const conditions: string[] = [];

    if (text.includes('can see')) {
      conditions.push('game.canvas.sight.testVisibility(@token, @target)');
    }

    if (text.match(/leap.*feet/i)) {
      conditions.push('@token.getFlag("automancy", "hasLeaped")');
    }

    return conditions.length > 0 ? conditions.join(' && ') : null;
  }

  private determineSpecialDuration(text: string): string[] {
    const durations: string[] = [];

    if (text.includes('until this grapple ends')) {
      durations.push('isGrappled');
    }

    if (text.includes('start of each turn')) {
      durations.push('turnStart');
    }

    if (text.includes('end of turn')) {
      durations.push('turnEnd');
    }

    return durations;
  }
}

// Enhanced type definitions
interface EnhancedAbilityData extends ParsedAbility {
  requirements: AbilityRequirement[];
  linkedEffects: LinkedEffect[];
  automation: AutomationStrategy;
  professionalFlags: Record<string, any>;
}

interface AbilityRequirement {
  type: 'movement' | 'visibility' | 'trigger' | 'recharge' | 'resource';
  condition: string;
  description: string;
  automationHook: string;
  validationMacro: string;
}

interface LinkedEffect {
  trigger: string;
  sequence: EffectStep[];
}

interface EffectStep {
  step: number;
  action: string;
  condition?: string;
  timing: string;
  linkedTo?: string;
  endCondition?: string;
}

interface AutomationStrategy {
  primary: 'basic' | 'workflow_integration' | 'multi_step_workflow' | 'reaction_based';
  hooks: string[];
  macros: string[];
  effects: string[];
}