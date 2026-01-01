import { ParsedAbility, AbilityType, FoundryItemData } from '../types';

/**
 * Movement-Attack Integration System
 * Automatically handles abilities that combine movement with attacks in a single activation
 * Examples: Pounce, Charge, Deadly Leap, Flyby Attack, etc.
 */
export class MovementAttackIntegration {

  /**
   * Analyze ability for movement-attack patterns and generate integrated automation
   */
  public analyzeMovementAttackPattern(ability: ParsedAbility): MovementAttackData | null {
    const patterns = this.detectMovementAttackPatterns(ability.raw);
    
    if (patterns.length === 0) {
      return null;
    }

    return {
      hasMovementAttackPattern: true,
      patterns,
      integratedActivation: this.generateIntegratedActivation(ability, patterns),
      templateConfig: this.generateTemplateConfiguration(patterns),
      macroIntegration: this.generateMovementAttackMacro(ability, patterns),
      flags: this.generateMovementAttackFlags(ability, patterns)
    };
  }

  /**
   * Apply movement-attack integration to Foundry item
   */
  public applyMovementAttackIntegration(
    foundryItem: FoundryItemData, 
    ability: ParsedAbility
  ): FoundryItemData {
    const movementData = this.analyzeMovementAttackPattern(ability);
    
    if (!movementData) {
      return foundryItem; // No changes needed
    }

    // Modify item to use template targeting
    foundryItem.system.target = {
      value: 1,
      width: null,
      units: "",
      type: "space"
    };

    foundryItem.system.range = {
      value: movementData.templateConfig.maxRange,
      long: null,
      units: "ft"
    };

    foundryItem.system.activation = {
      type: "action",
      cost: 1,
      condition: movementData.integratedActivation.description
    };

    // Add template and macro flags
    foundryItem.flags = {
      ...foundryItem.flags,
      ...movementData.flags
    };

    console.log(`✅ Applied movement-attack integration to ${ability.name}`);
    console.log(`   - Pattern: ${movementData.patterns[0].type}`);
    console.log(`   - Range: ${movementData.templateConfig.maxRange} feet`);
    console.log(`   - Requirements: ${movementData.patterns[0].requirements.join(', ')}`);

    return foundryItem;
  }

  private detectMovementAttackPatterns(text: string): MovementAttackPattern[] {
    const patterns: MovementAttackPattern[] = [];

    // Pattern 1: Move distance + attack + conditional effect (Pounce, Deadly Leap, Charge)
    const moveAttackConditional = text.match(
      /(?:moves?|leaps?|charges?|rushes?).*?(?:at least|up to) (\d+) (?:feet|ft).*?(?:toward|at).*?(?:target|creature).*?(?:then|and then|if.*hits?).*?(?:attack|hits?).*?(?:must|makes?).*?(?:saving throw|save|knocked|pushed)/i
    );
    
    if (moveAttackConditional) {
      const distance = parseInt(moveAttackConditional[1]);
      patterns.push({
        type: 'move_attack_conditional',
        movementDistance: distance,
        movementType: this.extractMovementType(text),
        attackType: this.extractAttackType(text),
        conditionalEffect: this.extractConditionalEffect(text),
        requirements: [`Move at least ${distance} feet toward target`],
        description: `Move up to ${distance} feet, then attack with conditional effects`
      });
    }

    // Pattern 2: Attack + move (Hit and Run, Flyby)
    const attackMove = text.match(
      /(?:attack|hits?).*?(?:then|and then|can).*?(?:move|moves?).*?(?:up to|half).*?(?:speed|(\d+) (?:feet|ft)).*?without.*?opportunity/i
    );
    
    if (attackMove) {
      const speedMatch = text.match(/move up to (?:half (?:its|their) speed|(\d+) (?:feet|ft))/i);
      const distance = speedMatch && speedMatch[1] ? parseInt(speedMatch[1]) : 20; // Default half speed ~20ft
      
      patterns.push({
        type: 'attack_move',
        movementDistance: distance,
        movementType: 'normal',
        attackType: this.extractAttackType(text),
        conditionalEffect: 'no_opportunity_attacks',
        requirements: ['Make attack first'],
        description: `Attack, then move up to ${distance} feet without opportunity attacks`
      });
    }

    // Pattern 3: Move + attack + move (Flyby Attack)
    const flybyPattern = text.match(
      /(?:flies?|moves?).*?(?:attack|attacks?).*?(?:without|doesn't) provoke.*?opportunity/i
    );
    
    if (flybyPattern && !attackMove) { // Don't double-detect
      patterns.push({
        type: 'flyby_attack',
        movementDistance: 30, // Typical fly speed portion
        movementType: 'fly',
        attackType: this.extractAttackType(text),
        conditionalEffect: 'no_opportunity_attacks',
        requirements: ['Can fly'],
        description: 'Move, attack, continue moving without opportunity attacks'
      });
    }

    // Pattern 4: Charge (specific D&D pattern)
    const chargePattern = text.match(
      /charges?.*?(\d+).*?(?:feet|ft).*?(?:straight line|toward).*?(?:attack|ram).*?(?:additional|extra|bonus) (\d+(?:d\d+)?)/i
    );
    
    if (chargePattern) {
      const distance = parseInt(chargePattern[1]);
      const bonusDamage = chargePattern[2];
      
      patterns.push({
        type: 'charge',
        movementDistance: distance,
        movementType: 'straight_line',
        attackType: this.extractAttackType(text),
        conditionalEffect: `bonus_damage_${bonusDamage}`,
        requirements: [`Move ${distance} feet in straight line toward target`],
        description: `Charge ${distance} feet for +${bonusDamage} damage`
      });
    }

    return patterns;
  }

  private generateIntegratedActivation(
    ability: ParsedAbility, 
    patterns: MovementAttackPattern[]
  ): IntegratedActivation {
    const primary = patterns[0];
    
    return {
      activationType: 'template_then_workflow',
      description: primary.description,
      steps: this.generateActivationSteps(primary),
      userExperience: this.generateUserExperience(primary)
    };
  }

  private generateActivationSteps(pattern: MovementAttackPattern): ActivationStep[] {
    const steps: ActivationStep[] = [];

    switch (pattern.type) {
      case 'move_attack_conditional':
        steps.push(
          { order: 1, action: 'template_targeting', description: 'Select movement destination' },
          { order: 2, action: 'automatic_movement', description: 'Token moves to location' },
          { order: 3, action: 'distance_validation', description: 'Check movement requirements' },
          { order: 4, action: 'target_selection', description: 'Select attack target if requirements met' },
          { order: 5, action: 'attack_workflow', description: 'Execute attack with conditional effects' }
        );
        break;

      case 'attack_move':
        steps.push(
          { order: 1, action: 'target_selection', description: 'Select attack target' },
          { order: 2, action: 'attack_workflow', description: 'Execute attack' },
          { order: 3, action: 'template_targeting', description: 'Select movement destination' },
          { order: 4, action: 'automatic_movement', description: 'Move without opportunity attacks' }
        );
        break;

      case 'flyby_attack':
        steps.push(
          { order: 1, action: 'movement_path_selection', description: 'Select flight path' },
          { order: 2, action: 'automatic_movement', description: 'Begin movement' },
          { order: 3, action: 'attack_at_point', description: 'Attack during movement' },
          { order: 4, action: 'complete_movement', description: 'Finish movement without opportunity attacks' }
        );
        break;

      case 'charge':
        steps.push(
          { order: 1, action: 'straight_line_template', description: 'Select charge line' },
          { order: 2, action: 'automatic_movement', description: 'Charge in straight line' },
          { order: 3, action: 'distance_validation', description: 'Validate charge distance' },
          { order: 4, action: 'attack_workflow', description: 'Attack with bonus damage' }
        );
        break;
    }

    return steps;
  }

  private generateUserExperience(pattern: MovementAttackPattern): UserExperience {
    switch (pattern.type) {
      case 'move_attack_conditional':
        return {
          clickSequence: [
            'Click ability',
            'Click destination within range',
            'Click attack target (if movement requirement met)',
            'Automation handles the rest'
          ],
          visual: 'Template shows movement range, then attack targeting if requirements met',
          feedback: 'Chat messages indicate movement distance and conditional effects applied'
        };

      case 'attack_move':
        return {
          clickSequence: [
            'Click ability',
            'Click attack target',
            'Click movement destination',
            'Automation handles movement without opportunity attacks'
          ],
          visual: 'Standard attack targeting, then movement template',
          feedback: 'Movement granted without opportunity attacks after successful attack'
        };

      case 'flyby_attack':
        return {
          clickSequence: [
            'Click ability', 
            'Draw flight path through target',
            'Automation handles attack during movement'
          ],
          visual: 'Path template showing flight route through enemy space',
          feedback: 'Attack executes automatically when path intersects target'
        };

      case 'charge':
        return {
          clickSequence: [
            'Click ability',
            'Click target to charge at', 
            'Automation validates straight line and distance',
            'Attack executes with bonus damage if valid'
          ],
          visual: 'Straight line template to target',
          feedback: 'Bonus damage applied if charge requirements met'
        };

      default:
        return {
          clickSequence: ['Click ability', 'Follow prompts'],
          visual: 'Context-appropriate templates and targeting',  
          feedback: 'Automation provides clear status updates'
        };
    }
  }

  private generateTemplateConfiguration(patterns: MovementAttackPattern[]): TemplateConfiguration {
    const primary = patterns[0];
    
    return {
      templateType: this.getTemplateType(primary.type),
      maxRange: primary.movementDistance,
      shape: this.getTemplateShape(primary.movementType),
      requiresLineOfSight: primary.movementType !== 'teleport',
      allowsPartialMovement: primary.type !== 'charge'
    };
  }

  private generateMovementAttackMacro(
    ability: ParsedAbility,
    patterns: MovementAttackPattern[]
  ): string {
    const primary = patterns[0];
    const macroName = `${ability.name.replace(/\s+/g, '')}MovementAttack`;

    return `
// ${ability.name} Movement-Attack Integration Macro
// Pattern: ${primary.type}
// Professional automation for seamless movement + attack workflow

console.log("Executing movement-attack integration for ${ability.name}");

if (args[0].macroPass !== "preItemRoll") return;

const { workflow, actor, token, item } = args[0];

try {
  ${this.generatePatternSpecificLogic(primary, ability)}
  
  // Set up integrated workflow
  await setupIntegratedWorkflow();
  
} catch (error) {
  console.error("Movement-attack integration failed:", error);
  ui.notifications.error("${ability.name} automation failed");
}

async function setupIntegratedWorkflow() {
  ${this.generateWorkflowSetup(primary)}
}

${this.generateHelperFunctions(primary)}
`;
  }

  private generatePatternSpecificLogic(pattern: MovementAttackPattern, ability: ParsedAbility): string {
    switch (pattern.type) {
      case 'move_attack_conditional':
        return `
  // Movement-first pattern (Pounce, Deadly Leap, Charge)
  console.log("Setting up move-attack-conditional pattern");
  
  // Step 1: Handle template targeting for movement
  if (!workflow.templateLocation) {
    ui.notifications.warn("Select movement destination for ${ability.name}");
    return false;
  }
  
  // Step 2: Calculate movement distance
  const startPos = { x: token.x, y: token.y };
  const endPos = workflow.templateLocation;
  const movementDistance = canvas.grid.measureDistance(startPos, endPos);
  
  console.log(\`Movement distance: \${movementDistance} feet (required: ${pattern.movementDistance}+)\`);
  
  // Step 3: Move token automatically
  await token.document.update({
    x: endPos.x,
    y: endPos.y
  });
  
  // Step 4: Check if movement requirement met for conditional effects
  const requirementMet = movementDistance >= ${pattern.movementDistance};
  await actor.setFlag("automancy", "movementRequirementMet", requirementMet);
  
  if (requirementMet) {
    ui.notifications.info(\`${ability.name}: Movement requirement met! Conditional effects will apply.\`);
  } else {
    ui.notifications.warn(\`${ability.name}: Moved only \${movementDistance} feet. No conditional effects.\`);
  }`;

      case 'attack_move':
        return `
  // Attack-first pattern (Hit and Run)
  console.log("Setting up attack-move pattern");
  
  // Movement will be handled in postAttackRoll hook
  await actor.setFlag("automancy", "pendingMovement", {
    distance: ${pattern.movementDistance},
    type: "no_opportunity_attacks"
  });`;

      case 'charge':
        return `
  // Charge pattern with straight-line requirement
  console.log("Setting up charge pattern");
  
  // Validate straight line to target
  if (workflow.targets.size !== 1) {
    ui.notifications.warn("Charge requires exactly one target");
    return false;
  }
  
  const target = workflow.targets.first();
  const isValidCharge = validateStraightLineCharge(token, target, ${pattern.movementDistance});
  
  if (!isValidCharge.valid) {
    ui.notifications.warn(\`Invalid charge: \${isValidCharge.reason}\`);
    return false;
  }
  
  // Move token and set up bonus damage
  await token.document.update({
    x: isValidCharge.finalPosition.x,
    y: isValidCharge.finalPosition.y
  });
  
  await actor.setFlag("automancy", "chargeDamageBonus", "${pattern.conditionalEffect.replace('bonus_damage_', '')}");`;

      default:
        return '// Standard movement-attack pattern';
    }
  }

  private generateWorkflowSetup(pattern: MovementAttackPattern): string {
    return `
  // Configure workflow for integrated movement and attack
  workflow.automancyMovementAttack = {
    pattern: "${pattern.type}",
    movementDistance: ${pattern.movementDistance},
    conditionalEffect: "${pattern.conditionalEffect}",
    requirementsMet: actor.getFlag("automancy", "movementRequirementMet") !== false
  };
  
  console.log("Movement-attack workflow configured successfully");`;
  }

  private generateHelperFunctions(pattern: MovementAttackPattern): string {
    let helpers = `
// Helper functions for ${pattern.type} pattern

function validateStraightLineCharge(sourceToken, targetToken, minDistance) {
  const start = { x: sourceToken.x, y: sourceToken.y };
  const end = { x: targetToken.x, y: targetToken.y };
  const distance = canvas.grid.measureDistance(start, end);
  
  if (distance < minDistance) {
    return { valid: false, reason: \`Distance \${distance} < \${minDistance} feet\` };
  }
  
  // Calculate final position (5 feet before target)
  const direction = {
    x: (end.x - start.x) / distance,
    y: (end.y - start.y) / distance
  };
  
  const finalPosition = {
    x: end.x - (direction.x * canvas.grid.size),
    y: end.y - (direction.y * canvas.grid.size)
  };
  
  return { valid: true, finalPosition };
}`;

    if (pattern.type === 'attack_move') {
      helpers += `

// Post-attack movement for hit-and-run abilities
Hooks.once("midi-qol.AttackRollComplete", async (workflow) => {
  const pendingMovement = workflow.actor.getFlag("automancy", "pendingMovement");
  if (!pendingMovement) return;
  
  // Clear flag
  await workflow.actor.unsetFlag("automancy", "pendingMovement");
  
  // Prompt for movement destination
  ui.notifications.info("Select movement destination (no opportunity attacks)");
  
  // Grant movement without opportunity attacks
  const effect = {
    name: "${pattern.type} - Free Movement",
    changes: [{
      key: "flags.midi-qol.ignoreNearbyFoes",
      mode: 5,
      value: "1",
      priority: 20
    }],
    duration: { seconds: 6 },
    flags: { automancy: { temporary: true } }
  };
  
  await workflow.actor.createEmbeddedDocuments("ActiveEffect", [effect]);
});`;
    }

    return helpers;
  }

  private generateMovementAttackFlags(
    ability: ParsedAbility,
    patterns: MovementAttackPattern[]
  ): Record<string, any> {
    const primary = patterns[0];

    return {
      'midi-qol': {
        templateRequired: true,
        rangeTarget: 'template',
        // NOTE: Removed onUseMacroName - macros must be created separately in Foundry
        movementAttackIntegration: true
      },
      'chris-premades': {
        movementAttack: {
          pattern: primary.type,
          distance: primary.movementDistance,
          integratedWorkflow: true
        }
      },
      automancy: {
        movementAttackPattern: primary.type,
        integrationApplied: true,
        templateConfig: this.generateTemplateConfiguration(patterns)
      }
    };
  }

  // Helper methods for pattern analysis
  private extractMovementType(text: string): string {
    if (text.includes('leap') || text.includes('jump')) return 'leap';
    if (text.includes('charge')) return 'straight_line';
    if (text.includes('fly') || text.includes('flies')) return 'fly';
    if (text.includes('teleport')) return 'teleport';
    return 'normal';
  }

  private extractAttackType(text: string): string {
    if (text.match(/bite/i)) return 'bite';
    if (text.match(/claw/i)) return 'claw';
    if (text.match(/weapon attack/i)) return 'weapon';
    if (text.match(/spell attack/i)) return 'spell';
    return 'attack';
  }

  private extractConditionalEffect(text: string): string {
    if (text.includes('prone')) return 'prone';
    if (text.includes('grapple')) return 'grapple';
    if (text.includes('push') || text.includes('knock')) return 'knockback';
    if (text.includes('additional') || text.includes('bonus') || text.includes('extra')) return 'bonus_damage';
    return 'none';
  }

  private getTemplateType(patternType: string): string {
    switch (patternType) {
      case 'charge': return 'ray';
      case 'flyby_attack': return 'ray';
      default: return 'circle';
    }
  }

  private getTemplateShape(movementType: string): string {
    switch (movementType) {
      case 'straight_line': return 'ray';
      case 'fly': return 'ray';
      default: return 'circle';
    }
  }
}

// Type definitions
interface MovementAttackData {
  hasMovementAttackPattern: boolean;
  patterns: MovementAttackPattern[];
  integratedActivation: IntegratedActivation;
  templateConfig: TemplateConfiguration;
  macroIntegration: string;
  flags: Record<string, any>;
}

interface MovementAttackPattern {
  type: 'move_attack_conditional' | 'attack_move' | 'flyby_attack' | 'charge';
  movementDistance: number;
  movementType: string;
  attackType: string;
  conditionalEffect: string;
  requirements: string[];
  description: string;
}

interface IntegratedActivation {
  activationType: string;
  description: string;
  steps: ActivationStep[];
  userExperience: UserExperience;
}

interface ActivationStep {
  order: number;
  action: string;
  description: string;
}

interface UserExperience {
  clickSequence: string[];
  visual: string;
  feedback: string;
}

interface TemplateConfiguration {
  templateType: string;
  maxRange: number;
  shape: string;
  requiresLineOfSight: boolean;
  allowsPartialMovement: boolean;
}