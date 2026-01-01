import { 
  AbilityDescription, 
  ParsedAbility, 
  AbilityType,
  AutomationComplexity,
  DamageData,
  SaveData,
  ActivationData,
  TargetData,
  RangeData,
  DurationData,
  EffectData,
  ConditionData,
  ResourceData
} from '../types';
import { PatternMatcher } from './pattern-matcher';

/**
 * Text analysis engine for parsing homebrew ability descriptions
 * Converts natural language into structured data for automation
 */
export class TextAnalyzer {
  private patternMatcher: PatternMatcher;

  constructor() {
    this.patternMatcher = new PatternMatcher();
  }

  /**
   * Analyze homebrew text and return structured ability data
   */
  public analyzeText(text: string, name?: string): AbilityDescription {
    const patterns = this.patternMatcher.extractPatterns(text);
    
    const parsed: ParsedAbility = {
      name: name || this.extractName(text),
      raw: text,
      type: this.determineAbilityType(patterns),
      attackType: this.extractAttackType(patterns),
      attackBonus: this.extractAttackBonus(patterns),
      activation: this.extractActivation(patterns),
      target: this.extractTarget(patterns, text),
      damage: this.extractDamage(patterns),
      saves: this.extractSaves(patterns),
      effects: this.extractEffects(patterns),
      conditions: this.extractConditions(patterns, text),
      resources: this.extractResources(patterns),
      duration: this.extractDuration(patterns),
      range: this.extractRange(patterns),
      complexity: AutomationComplexity.SIMPLE, // Will be calculated later
      requirements: [] // Added for Phase 2 support
    };

    // Calculate complexity based on extracted features
    parsed.complexity = this.assessComplexity(parsed);

    return {
      raw: text,
      parsed
    };
  }

  private extractName(text: string): string {
    // Try to extract name from first line or before colon
    const lines = text.split('\n');
    const firstLine = lines[0].trim();
    
    // Check for "Name:" pattern
    const colonMatch = firstLine.match(/^([^:]+):/);
    if (colonMatch) {
      return colonMatch[1].trim();
    }
    
    // Check for "Name. Description" pattern
    const periodMatch = firstLine.match(/^([^.]+)\./);
    if (periodMatch && periodMatch[1].length < 50) {
      return periodMatch[1].trim();
    }
    
    // Fallback to first few words if short enough
    const words = firstLine.split(' ');
    if (words.length <= 3 && firstLine.length < 30) {
      return firstLine;
    }
    
    return 'Unnamed Ability';
  }

  private determineAbilityType(patterns: Map<string, any[]>): AbilityType {
    // Check for attack patterns first
    if (patterns.has('weapon_attack')) {
      return AbilityType.WEAPON_ATTACK;
    }
    
    if (patterns.has('spell_attack')) {
      return AbilityType.SPELL_ATTACK;
    }
    
    // Check for save-based abilities
    if (patterns.has('save_dc')) {
      return AbilityType.SAVE_ABILITY;
    }
    
    // Check for healing
    const damage = patterns.get('damage_with_average') || patterns.get('damage_simple') || [];
    if (damage.some((d: any) => d.type === 'healing')) {
      return AbilityType.HEALING;
    }
    
    // Check for reaction
    if (patterns.has('activation_reaction')) {
      return AbilityType.REACTION;
    }
    
    // Check for passive abilities (no activation time)
    if (!patterns.has('activation_action') && 
        !patterns.has('activation_bonus') && 
        !patterns.has('activation_reaction')) {
      return AbilityType.PASSIVE;
    }
    
    // Default to utility
    return AbilityType.UTILITY;
  }

  private extractAttackType(patterns: Map<string, any[]>): "mwak" | "rwak" | "msak" | "rsak" | undefined {
    // Extract specific attack type from weapon_attack or spell_attack patterns
    if (patterns.has('weapon_attack')) {
      const attack = patterns.get('weapon_attack')![0];
      return attack.type; // mwak or rwak
    }
    if (patterns.has('spell_attack')) {
      const attack = patterns.get('spell_attack')![0];
      return attack.type; // msak or rsak
    }
    return undefined;
  }

  private extractAttackBonus(patterns: Map<string, any[]>): number | undefined {
    // Extract attack bonus from weapon_attack or spell_attack patterns
    if (patterns.has('weapon_attack')) {
      const attack = patterns.get('weapon_attack')![0];
      return attack.bonus;
    }
    if (patterns.has('spell_attack')) {
      const attack = patterns.get('spell_attack')![0];
      return attack.bonus;
    }
    return undefined;
  }

  private extractActivation(patterns: Map<string, any[]>): ActivationData {
    // Check for specific activation types
    if (patterns.has('activation_reaction')) {
      const reaction = patterns.get('activation_reaction')![0];
      return {
        type: 'reaction',
        cost: reaction.cost
      };
    }

    // For bonus action, only match if it appears in an activation context
    // (not in descriptions like "can take an action, a bonus action, OR move")
    if (patterns.has('activation_bonus')) {
      const bonus = patterns.get('activation_bonus')![0];
      const matchText = bonus.matchText || '';
      const matchIndex = bonus.index || 0;

      // Only consider it a bonus action activation if it's:
      // 1. At the start of the text (within first 50 chars)
      // 2. OR preceded by "as a" or "uses a" or similar activation indicators
      // Don't match if it's part of a list like "action, bonus action, or move"
      if (matchIndex < 50) {
        return {
          type: 'bonus',
          cost: bonus.cost
        };
      }
    }

    if (patterns.has('activation_action')) {
      const action = patterns.get('activation_action')![0];
      return {
        type: 'action',
        cost: action.cost
      };
    }

    // Default to action for attacks and most abilities
    return {
      type: 'action',
      cost: 1
    };
  }

  private extractTarget(patterns: Map<string, any[]>, text: string): TargetData {
    // Look for explicit target numbers
    const targetMatch = text.match(/(?:targets?\s+)?(\d+)\s+(?:creature|target|enemy|ally)/i);
    if (targetMatch) {
      return {
        value: parseInt(targetMatch[1]),
        type: 'creature',
        units: 'any'
      };
    }
    
    // Check for self-targeting
    if (patterns.has('range_self') || text.toLowerCase().includes('yourself')) {
      return {
        value: null,
        type: 'self',
        units: 'any'
      };
    }
    
    // Check for area effects
    const areas = ['area_radius', 'area_cone', 'area_line'];
    for (const areaType of areas) {
      if (patterns.has(areaType)) {
        const area = patterns.get(areaType)![0];
        return {
          value: area.value,
          type: 'space',
          width: area.value,
          units: 'ft'
        };
      }
    }
    
    // Default to single creature
    return {
      value: 1,
      type: 'creature',
      units: 'any'
    };
  }

  private extractDamage(patterns: Map<string, any[]>): DamageData[] {
    const damage: DamageData[] = [];
    
    // Extract damage with averages first (more specific)
    const damageWithAverage = patterns.get('damage_with_average') || [];
    for (const d of damageWithAverage) {
      damage.push({
        formula: d.formula,
        type: d.type,
        conditional: false
      });
    }
    
    // Extract simple damage patterns
    const damageSimple = patterns.get('damage_simple') || [];
    for (const d of damageSimple) {
      // Avoid duplicates from more specific patterns
      if (!damage.some(existing => existing.formula === d.formula)) {
        damage.push({
          formula: d.formula,
          type: d.type,
          conditional: false
        });
      }
    }
    
    return damage;
  }

  private extractSaves(patterns: Map<string, any[]>): SaveData[] {
    const saves: SaveData[] = [];
    
    const savePatterns = patterns.get('save_dc') || [];
    for (const save of savePatterns) {
      saves.push({
        ability: save.ability,
        dc: save.dc,
        scaling: 'flat'
      });
    }
    
    return saves;
  }

  private extractDuration(patterns: Map<string, any[]>): DurationData {
    // Check for instant duration first
    if (patterns.has('duration_instant')) {
      return {
        value: null,
        units: 'inst'
      };
    }
    
    // Check for concentration duration
    if (patterns.has('duration_concentration')) {
      const duration = patterns.get('duration_concentration')![0];
      return {
        value: duration.value,
        units: duration.units,
        concentration: duration.concentration
      };
    }
    
    // Check for rounds
    if (patterns.has('duration_rounds')) {
      const duration = patterns.get('duration_rounds')![0];
      return {
        value: duration.value,
        units: 'round'
      };
    }
    
    // Default to instantaneous
    return {
      value: null,
      units: 'inst'
    };
  }

  private extractRange(patterns: Map<string, any[]>): RangeData {
    // Check for specific range patterns
    if (patterns.has('range_touch')) {
      return {
        value: null,
        units: 'touch'
      };
    }
    
    if (patterns.has('range_self')) {
      return {
        value: null,
        units: 'self'
      };
    }
    
    if (patterns.has('range_distance')) {
      const range = patterns.get('range_distance')![0];
      return {
        value: range.value,
        long: range.long,
        units: range.units
      };
    }
    
    // Default range
    return {
      value: 5,
      units: 'ft'
    };
  }

  private extractEffects(patterns: Map<string, any[]>): EffectData[] {
    const effects: EffectData[] = [];
    
    // Extract resistance effects
    if (patterns.has('damage_resistance')) {
      const resistances = patterns.get('damage_resistance')!;
      for (const resistance of resistances) {
        effects.push({
          type: 'damage_resistance',
          damageTypes: resistance.damageTypes
        });
      }
    }
    
    // Extract immunity effects
    if (patterns.has('damage_immunity')) {
      const immunities = patterns.get('damage_immunity')!;
      for (const immunity of immunities) {
        effects.push({
          type: 'damage_resistance', // Will be handled as immunity in generation
          damageTypes: immunity.damageTypes,
          amount: 0 // 0 = immunity
        });
      }
    }
    
    return effects;
  }

  private extractConditions(patterns: Map<string, any[]>, text: string): ConditionData[] {
    const conditions: ConditionData[] = [];
    const lowerText = text.toLowerCase();

    // Standard D&D conditions
    const standardConditions = [
      'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened',
      'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified',
      'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
    ];

    // MCDM custom conditions
    const mcdmConditions = ['dazed', 'bleeding', 'weakened', 'slowed'];

    // Check for standard and MCDM conditions
    const allConditions = [...standardConditions, ...mcdmConditions];
    for (const condName of allConditions) {
      // Look for "be <condition>" or "is <condition>" or "becomes <condition>"
      const condPattern = new RegExp(`(?:be|is|becomes?|are)\\s+(?:<[^>]+>)?\\s*${condName}`, 'i');
      if (condPattern.test(text)) {
        // Check for "save ends" pattern
        const saveEnds = /save\s*ends|saving throw.*ends|ends?.*saving throw/i.test(text);
        // Check for end of turn patterns - various phrasings
        const endOfTurn = /(?:at\s+)?(?:the\s+)?end\s+of\s+(?:its|their|the target's|each|the|your)?\s*turn/i.test(text);

        conditions.push({
          type: condName,
          name: condName,
          value: true,
          saveEnds: saveEnds,
          saveEndsTiming: endOfTurn ? 'end_of_turn' : 'start_of_turn'
        });
      }
    }

    // Extract advantage conditions from patterns
    if (patterns.has('advantage')) {
      const advantages = patterns.get('advantage')!;
      for (const adv of advantages) {
        conditions.push({
          type: 'advantage',
          name: 'Advantage',
          value: adv.target
        });
      }
    }

    // Extract disadvantage conditions from patterns
    if (patterns.has('disadvantage')) {
      const disadvantages = patterns.get('disadvantage')!;
      for (const dis of disadvantages) {
        conditions.push({
          type: 'disadvantage',
          name: 'Disadvantage',
          value: dis.target
        });
      }
    }

    return conditions;
  }

  private extractResources(patterns: Map<string, any[]>): ResourceData {
    // Check for per-day usage
    if (patterns.has('uses_per_day')) {
      const usage = patterns.get('uses_per_day')![0];
      return {
        consumesResource: true,
        type: 'per_day',
        amount: usage.amount
      };
    }
    
    // Check for per-rest usage
    if (patterns.has('uses_per_rest')) {
      const usage = patterns.get('uses_per_rest')![0];
      return {
        consumesResource: true,
        type: 'per_rest',
        amount: usage.amount
      };
    }
    
    // Check for recharge
    if (patterns.has('recharge')) {
      const recharge = patterns.get('recharge')![0];
      return {
        consumesResource: true,
        type: 'recharge',
        recharge: `${recharge.min}-${recharge.max}`
      };
    }
    
    return {
      consumesResource: false
    };
  }

  private assessComplexity(ability: ParsedAbility): AutomationComplexity {
    let score = 1;
    
    // Conditional logic increases complexity
    if (ability.conditions.length > 0) score++;
    
    // Multiple damage types or complex calculations
    if (ability.damage.length > 1) score++;
    
    // Reactions require advanced handling
    if (ability.activation.type === 'reaction') score = 4;
    
    // Multi-step effects (save + condition + damage over time)
    if (ability.effects.length > 1) score++;
    
    // Save-based abilities with effects are more complex
    if (ability.saves.length > 0 && ability.effects.length > 0) score++;
    
    // Resource consumption adds complexity
    if (ability.resources.consumesResource) score++;
    
    return Math.min(score, 4) as AutomationComplexity;
  }
}