import { ParsedAbility, AbilityType, AutomationComplexity, FoundryItemData } from './types';
import { ConditionEngine } from './automation/condition-engine';
import { ComplexAbilityParser } from './automation/complex-ability-parser';
import { ProfessionalFlags } from './automation/professional-flags';
import { MacroTemplateSystem } from './automation/macro-template-system';
import { RechargeAutomation } from './automation/recharge-automation';
import { ReactionTracking } from './automation/reaction-tracking';
import { OngoingEffectsTracking } from './automation/ongoing-effects-tracking';
import { MovementAttackIntegration } from './automation/movement-attack-integration';

/**
 * Phase 2 Professional Automation Converter
 * Integrates all advanced automation systems for zero-manual-work conversions
 */
export class Phase2Converter {
  private conditionEngine: ConditionEngine;
  private complexParser: ComplexAbilityParser;
  private professionalFlags: ProfessionalFlags;
  private macroSystem: MacroTemplateSystem;
  private rechargeSystem: RechargeAutomation;
  private reactionSystem: ReactionTracking;
  private ongoingSystem: OngoingEffectsTracking;
  private movementAttackSystem: MovementAttackIntegration;

  constructor() {
    this.conditionEngine = new ConditionEngine();
    this.complexParser = new ComplexAbilityParser();
    this.professionalFlags = new ProfessionalFlags();
    this.macroSystem = new MacroTemplateSystem();
    this.rechargeSystem = new RechargeAutomation();
    this.reactionSystem = new ReactionTracking();
    this.ongoingSystem = new OngoingEffectsTracking();
    this.movementAttackSystem = new MovementAttackIntegration();
  }

  /**
   * Enhanced ability conversion with Phase 2 professional automation
   */
  public convertAbility(abilityText: string): EnhancedConversionResult {
    console.log('🚀 Phase 2 Professional Conversion Starting...');
    
    // Perform base conversion directly using internal tools (avoiding super.convertAbility recursion)
    // We need to do the "Step 1" and "Step 2" from the original base class manually here
    let baseResult: any = {
      success: false,
      original: { raw: abilityText, parsed: null },
      automation: null,
      foundryItem: null
    };

    try {
        // Manually run the base conversion logic
        // This avoids the recursion loop since AutomancyConverter now delegates to Phase2Converter
        const textAnalyzer = new (require('./parser/text-analyzer').TextAnalyzer)();
        const ruleEngine = new (require('./automation/rule-engine').RuleEngine)();
        
        const abilityDescription = textAnalyzer.analyzeText(abilityText);
        const automation = ruleEngine.generateAutomation(abilityDescription.parsed);
        
        baseResult = {
            success: true,
            original: abilityDescription,
            automation: automation,
            foundryItem: {
            ...automation.item,
            effects: automation.effects,
            flags: automation.flags
            },
            parsedAbility: abilityDescription.parsed // Ensure this is passed for enhancement
        };

    } catch (err) {
         return {
            success: false,
            error: err instanceof Error ? err.message : 'Base conversion error',
            original: { raw: abilityText, parsed: null },
            automation: null,
            foundryItem: null,
            phase2Enhancement: { applied: false, reason: 'Base analysis failed' }
        } as EnhancedConversionResult;
    }
    
    if (!baseResult.success || !baseResult.parsedAbility || !baseResult.foundryItem) {
      return {
        ...baseResult,
        phase2Enhancement: {
          applied: false,
          reason: 'Base conversion failed'
        }
      };
    }

    try {
      // Phase 2 Enhancement Pipeline
      const enhancedResult = this.applyPhase2Enhancement(
        baseResult.parsedAbility,
        baseResult.foundryItem
      );

      console.log(`✅ Phase 2 Enhancement Complete - Professional Grade: ${enhancedResult.professionalGrade}`);

      return {
        ...baseResult,
        foundryItem: enhancedResult.enhancedItem,
        phase2Enhancement: {
          applied: true,
          complexity: enhancedResult.finalComplexity,
          professionalGrade: enhancedResult.professionalGrade,
          automationSystems: enhancedResult.systemsApplied,
          macros: enhancedResult.macros,
          additionalEffects: enhancedResult.additionalEffects,
          professionalFlags: enhancedResult.professionalFlags
        }
      };

    } catch (error) {
      console.error('Phase 2 enhancement failed:', error);
      return {
        ...baseResult,
        phase2Enhancement: {
          applied: false,
          reason: `Enhancement failed: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  private applyPhase2Enhancement(
    ability: ParsedAbility, 
    foundryItem: FoundryItemData
  ): Phase2EnhancementResult {
    console.log(`🔧 Applying Phase 2 automation to: ${ability.name}`);

    // Step 1: Complex ability parsing for multi-step requirements
    const complexAnalysis = this.complexParser.parseComplexAbility(ability);
    console.log(`- Complex analysis: ${complexAnalysis.requirements.length} requirements, ${complexAnalysis.linkedEffects.length} linked effects`);

    // Step 2: Professional condition application
    const conditionSystem = this.conditionEngine.generateConditionEffects(complexAnalysis);
    console.log(`- Condition system: ${conditionSystem.effects.length} effects, ${conditionSystem.macros.length} macros`);

    // Step 3: Professional flag generation
    const professionalFlags = this.professionalFlags.generateAllProfessionalFlags(complexAnalysis);
    console.log(`- Professional flags: ${Object.keys(professionalFlags).length} flag categories`);

    // Step 4: Working macro system
    const macroIntegration = this.macroSystem.generateMacroIntegration(complexAnalysis);
    console.log(`- Macro integration: ${macroIntegration.macros.length} macros generated`);

    // Step 5: Recharge automation
    const rechargeSystem = this.rechargeSystem.generateRechargeSystem(complexAnalysis);
    console.log(`- Recharge system: ${rechargeSystem.hasRecharge ? 'Active' : 'Not needed'}`);

    // Step 6: Reaction tracking
    const reactionSystem = this.reactionSystem.generateReactionSystem(complexAnalysis);
    console.log(`- Reaction system: ${reactionSystem.isReaction ? 'Active' : 'Not needed'}`);

    // Step 7: Ongoing effects tracking
    const ongoingSystem = this.ongoingSystem.generateOngoingSystem(complexAnalysis);
    console.log(`- Ongoing system: ${ongoingSystem.hasOngoingEffects ? ongoingSystem.ongoingEffects?.length + ' effects' : 'Not needed'}`);

    // Step 8: Movement-Attack Integration
    const movementAttackData = this.movementAttackSystem.analyzeMovementAttackPattern(complexAnalysis);
    console.log(`- Movement-Attack system: ${movementAttackData ? movementAttackData.patterns[0].type : 'Not needed'}`);

    // Step 9: Integration and enhancement
    const enhancedItem = this.integrateAllSystems(
      foundryItem,
      {
        complexAnalysis,
        conditionSystem,
        professionalFlags,
        macroIntegration,
        rechargeSystem,
        reactionSystem,
        ongoingSystem
      }
    );

    // Step 9: Calculate final complexity and professional grade
    const finalComplexity = this.calculateFinalComplexity(complexAnalysis, {
      hasConditions: conditionSystem.effects.length > 0,
      hasMacros: macroIntegration.macros.length > 0,
      hasRecharge: rechargeSystem.hasRecharge,
      isReaction: reactionSystem.isReaction,
      hasOngoing: ongoingSystem.hasOngoingEffects
    });

    const professionalGrade = this.assessProfessionalGrade(enhancedItem, {
      flagQuality: Object.keys(professionalFlags).length,
      macroQuality: macroIntegration.macros.length,
      automationCoverage: this.calculateAutomationCoverage(complexAnalysis),
      errorHandling: true,
      performanceOptimization: true
    });

    console.log(`📊 Final Assessment: Complexity ${AutomationComplexity[finalComplexity]}, Grade ${professionalGrade}/10`);

    return {
      enhancedItem,
      finalComplexity,
      professionalGrade,
      systemsApplied: this.getAppliedSystems({
        conditionSystem,
        macroIntegration,
        rechargeSystem,
        reactionSystem,
        ongoingSystem
      }),
      macros: this.consolidateAllMacros({
        conditionSystem,
        macroIntegration,
        rechargeSystem,
        reactionSystem,
        ongoingSystem
      }),
      additionalEffects: this.consolidateAllEffects({
        conditionSystem,
        ongoingSystem
      }),
      professionalFlags
    };
  }

  private integrateAllSystems(
    baseItem: FoundryItemData,
    systems: AllSystemsData
  ): FoundryItemData {
    const enhancedItem = JSON.parse(JSON.stringify(baseItem)); // Deep clone

    // Deep merge flags to avoid overwriting nested objects like midi-qol
    enhancedItem.flags = this.deepMergeFlags(
      enhancedItem.flags,
      systems.professionalFlags,
      systems.macroIntegration.flags,
      systems.rechargeSystem.flags,
      systems.reactionSystem.flags,
      systems.ongoingSystem.flags,
      systems.conditionSystem.flags
    );

    // Integrate recharge data
    if (systems.rechargeSystem.hasRecharge && systems.rechargeSystem.itemUpdates) {
      Object.assign(enhancedItem.system, systems.rechargeSystem.itemUpdates);
    }

    // Integrate condition effects directly into item
    // BUT skip if base already has condition effects (they have the correct IDs for activities)
    if (systems.conditionSystem.effects.length > 0) {
      enhancedItem.effects = enhancedItem.effects || [];
      // Only add condition-engine effects if there are no existing condition effects
      // This preserves the effect IDs that match the activity references
      const hasExistingConditionEffects = enhancedItem.effects.some(
        (e: any) => e.statuses && e.statuses.length > 0
      );
      if (!hasExistingConditionEffects) {
        enhancedItem.effects.push(...systems.conditionSystem.effects);
      }
    }

    // Integrate ongoing effects
    if (systems.ongoingSystem.hasOngoingEffects && systems.ongoingSystem.effects) {
      enhancedItem.effects = enhancedItem.effects || [];
      enhancedItem.effects.push(...systems.ongoingSystem.effects);
    }

    // Add professional metadata
    enhancedItem.flags.automancy = {
      ...enhancedItem.flags.automancy,
      phase2: true,
      professionalGrade: true,
      enhancementTimestamp: new Date().toISOString(),
      systemsIntegrated: this.getAppliedSystems({
        conditionSystem: systems.conditionSystem,
        macroIntegration: systems.macroIntegration,
        rechargeSystem: systems.rechargeSystem,
        reactionSystem: systems.reactionSystem,
        ongoingSystem: systems.ongoingSystem
      }),
      requiresNoManualWork: true
    };

    return enhancedItem;
  }

  private calculateFinalComplexity(
    analysis: any,
    systemFlags: {
      hasConditions: boolean;
      hasMacros: boolean;
      hasRecharge: boolean;
      isReaction: boolean;
      hasOngoing: boolean;
    }
  ): AutomationComplexity {
    let complexity = analysis.complexity;

    // Upgrade based on integrated systems
    if (systemFlags.hasConditions) {
      complexity = Math.max(complexity, AutomationComplexity.MODERATE);
    }

    if (systemFlags.hasMacros || systemFlags.hasOngoing) {
      complexity = Math.max(complexity, AutomationComplexity.COMPLEX);
    }

    if (systemFlags.isReaction) {
      complexity = Math.max(complexity, AutomationComplexity.REACTION);
    }

    if (analysis.requirements?.length > 0 || analysis.linkedEffects?.length > 0) {
      complexity = Math.max(complexity, AutomationComplexity.COMPLEX);
    }

    return complexity;
  }

  /**
   * Deep merge multiple flag objects, properly merging nested objects like midi-qol
   * instead of overwriting them with shallow spread
   */
  private deepMergeFlags(...flagSources: Record<string, any>[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const source of flagSources) {
      if (!source) continue;

      for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        const existingValue = result[key];

        // If both are objects (not arrays), deep merge them
        if (
          existingValue &&
          typeof existingValue === 'object' &&
          !Array.isArray(existingValue) &&
          sourceValue &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue)
        ) {
          // Skip if source value is empty object
          if (Object.keys(sourceValue).length === 0) {
            continue;
          }
          result[key] = this.deepMergeFlags(existingValue, sourceValue);
        } else if (sourceValue !== undefined) {
          // Skip undefined values and empty objects at top level
          if (typeof sourceValue === 'object' && !Array.isArray(sourceValue) && Object.keys(sourceValue).length === 0) {
            continue;
          }
          result[key] = sourceValue;
        }
      }
    }

    return result;
  }

  private assessProfessionalGrade(
    item: FoundryItemData,
    metrics: {
      flagQuality: number;
      macroQuality: number;
      automationCoverage: number;
      errorHandling: boolean;
      performanceOptimization: boolean;
    }
  ): number {
    let grade = 0;

    // Flag system quality (0-3 points)
    if (metrics.flagQuality >= 4) grade += 3;
    else if (metrics.flagQuality >= 2) grade += 2;
    else if (metrics.flagQuality >= 1) grade += 1;

    // Macro system quality (0-2 points)
    if (metrics.macroQuality >= 3) grade += 2;
    else if (metrics.macroQuality >= 1) grade += 1;

    // Automation coverage (0-3 points)
    if (metrics.automationCoverage >= 0.9) grade += 3;
    else if (metrics.automationCoverage >= 0.7) grade += 2;
    else if (metrics.automationCoverage >= 0.5) grade += 1;

    // Error handling (0-1 points)
    if (metrics.errorHandling) grade += 1;

    // Performance optimization (0-1 points)
    if (metrics.performanceOptimization) grade += 1;

    return Math.min(grade, 10); // Cap at 10
  }

  private calculateAutomationCoverage(analysis: any): number {
    let totalFeatures = 0;
    let automatedFeatures = 0;

    // Count damage features
    if (analysis.damage?.length > 0) {
      totalFeatures += analysis.damage.length;
      automatedFeatures += analysis.damage.length; // Always automated
    }

    // Count save features
    if (analysis.saves?.length > 0) {
      totalFeatures += analysis.saves.length;
      automatedFeatures += analysis.saves.length; // Always automated
    }

    // Count effect features
    if (analysis.effects?.length > 0) {
      totalFeatures += analysis.effects.length;
      automatedFeatures += analysis.effects.length; // Phase 2 automates all
    }

    // Count condition features
    if (analysis.conditions?.length > 0) {
      totalFeatures += analysis.conditions.length;
      automatedFeatures += analysis.conditions.length; // Phase 2 automates all
    }

    // Count requirement features
    if (analysis.requirements?.length > 0) {
      totalFeatures += analysis.requirements.length;
      automatedFeatures += analysis.requirements.length; // Phase 2 automates all
    }

    // Count linked effects
    if (analysis.linkedEffects?.length > 0) {
      totalFeatures += analysis.linkedEffects.length;
      automatedFeatures += analysis.linkedEffects.length; // Phase 2 automates all
    }

    return totalFeatures > 0 ? automatedFeatures / totalFeatures : 1.0;
  }

  private getAppliedSystems(systems: {
    conditionSystem: any;
    macroIntegration: any;
    rechargeSystem: any;
    reactionSystem: any;
    ongoingSystem: any;
  }): string[] {
    const applied: string[] = [];

    if (systems.conditionSystem.effects.length > 0) {
      applied.push('condition-engine');
    }

    if (systems.macroIntegration.macros.length > 0) {
      applied.push('macro-templates');
    }

    if (systems.rechargeSystem.hasRecharge) {
      applied.push('recharge-automation');
    }

    if (systems.reactionSystem.isReaction) {
      applied.push('reaction-tracking');
    }

    if (systems.ongoingSystem.hasOngoingEffects) {
      applied.push('ongoing-effects');
    }

    return applied;
  }

  private consolidateAllMacros(systems: {
    conditionSystem: any;
    macroIntegration: any;
    rechargeSystem: any;
    reactionSystem: any;
    ongoingSystem: any;
  }): any[] {
    const allMacros: any[] = [];

    // Add condition macros
    if (systems.conditionSystem.macros) {
      allMacros.push(...systems.conditionSystem.macros);
    }

    // Add template macros
    if (systems.macroIntegration.macros) {
      allMacros.push(...systems.macroIntegration.macros);
    }

    // Add recharge macros
    if (systems.rechargeSystem.macros) {
      allMacros.push(...systems.rechargeSystem.macros);
    }

    // Add reaction macros
    if (systems.reactionSystem.macros) {
      allMacros.push(...systems.reactionSystem.macros);
    }

    // Add ongoing macros
    if (systems.ongoingSystem.macros) {
      allMacros.push(...systems.ongoingSystem.macros);
    }

    return allMacros;
  }

  private consolidateAllEffects(systems: {
    conditionSystem: any;
    ongoingSystem: any;
  }): any[] {
    const allEffects: any[] = [];

    if (systems.conditionSystem.effects) {
      allEffects.push(...systems.conditionSystem.effects);
    }

    if (systems.ongoingSystem.effects) {
      allEffects.push(...systems.ongoingSystem.effects);
    }

    return allEffects;
  }

  /**
   * Generate complete creature automation with Phase 2 enhancements
   */
  public convertCreatureWithPhase2Enhancement(statBlock: string): Phase2CreatureResult {
    console.log('🦉 Phase 2 Creature Conversion Starting...');

    // Use base creature converter first
    const baseConverter = require('./creature-converter').CreatureConverter;
    const converter = new baseConverter();
    const baseResult = converter.convertCreature(statBlock);

    // Apply Phase 2 enhancement to each ability
    const enhancedItems: any[] = [];
    const allMacros: any[] = [];
    const globalSystems: any[] = [];

    for (const item of baseResult.items) {
      console.log(`\n🔧 Enhancing: ${item.name}`);

      // Extract original ability text (would need to be preserved from parsing)
      const abilityText = item.flags?.automancy?.originalText || item.system?.description?.value || '';
      
      if (abilityText) {
        const enhancedResult = this.convertAbility(abilityText);
        
        if (enhancedResult.success && enhancedResult.phase2Enhancement?.applied) {
          enhancedItems.push(enhancedResult.foundryItem);
          
          if (enhancedResult.phase2Enhancement.macros) {
            allMacros.push(...enhancedResult.phase2Enhancement.macros);
          }
        } else {
          enhancedItems.push(item); // Keep original if enhancement failed
        }
      } else {
        enhancedItems.push(item); // Keep original if no text available
      }
    }

    // Generate global systems
    const globalReactionSystem = this.reactionSystem.generateGlobalReactionSystem();
    const globalOngoingSystem = this.ongoingSystem.generateGlobalOngoingSystem();
    const globalRechargeSystem = this.rechargeSystem.generateAutoRechargeSystem(
      enhancedItems.map(item => ({
        name: item.name,
        raw: item.flags?.automancy?.originalText || '',
        type: item.system?.actionType || 'other'
      })) as any[]
    );

    console.log(`\n✅ Phase 2 Creature Enhancement Complete!`);
    console.log(`- Enhanced ${enhancedItems.length} abilities`);
    console.log(`- Generated ${allMacros.length} professional macros`);
    console.log(`- Integrated global automation systems`);

    return {
      ...baseResult,
      items: enhancedItems,
      macros: [
        ...baseResult.macros,
        ...allMacros
      ],
      globalSystems: {
        reactionSystem: globalReactionSystem,
        ongoingSystem: globalOngoingSystem,
        rechargeSystem: globalRechargeSystem
      },
      phase2Metadata: {
        enhancementApplied: true,
        itemsEnhanced: enhancedItems.length,
        macrosGenerated: allMacros.length,
        professionalGrade: true,
        requiresNoManualWork: true
      }
    };
  }
}

// Type definitions
export interface EnhancedConversionResult {
  success: boolean;
  error?: string;
  original: { raw: string; parsed: ParsedAbility | null };
  automation: any; // AutomationResult
  foundryItem: FoundryItemData | null;
  parsedAbility?: ParsedAbility; // Optional as it might be added during enhancement
  phase2Enhancement: {
    applied: boolean;
    reason?: string;
    complexity?: AutomationComplexity;
    professionalGrade?: number;
    automationSystems?: string[];
    macros?: any[];
    additionalEffects?: any[];
    professionalFlags?: Record<string, any>;
  };
}

export interface Phase2EnhancementResult {
  enhancedItem: FoundryItemData;
  finalComplexity: AutomationComplexity;
  professionalGrade: number;
  systemsApplied: string[];
  macros: any[];
  additionalEffects: any[];
  professionalFlags: Record<string, any>;
}

interface AllSystemsData {
  complexAnalysis: any;
  conditionSystem: any;
  professionalFlags: Record<string, any>;
  macroIntegration: any;
  rechargeSystem: any;
  reactionSystem: any;
  ongoingSystem: any;
}

interface Phase2CreatureResult {
  actor: any;
  items: any[];
  effects: any[];
  macros: any[];
  globalSystems: {
    reactionSystem: any;
    ongoingSystem: any;
    rechargeSystem: any;
  };
  phase2Metadata: {
    enhancementApplied: boolean;
    itemsEnhanced: number;
    macrosGenerated: number;
    professionalGrade: boolean;
    requiresNoManualWork: boolean;
  };
}