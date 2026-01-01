import { ParsingPattern, DamageData, SaveData, ActivationData, RangeData, DurationData } from '../types';

/**
 * Pattern matching engine for extracting structured data from homebrew text
 * Based on analysis of common D&D ability description formats
 */
export class PatternMatcher {
  private patterns: Map<string, ParsingPattern> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Attack patterns
    this.addPattern({
      name: 'weapon_attack',
      regex: /(?:Melee|Ranged) Weapon Attack: \+(\d+) to hit/i,
      extractor: (match) => ({
        type: match[0].toLowerCase().includes('melee') ? 'mwak' : 'rwak',
        bonus: parseInt(match[1])
      }),
      priority: 100
    });

    this.addPattern({
      name: 'spell_attack',
      regex: /(?:Melee|Ranged) Spell Attack: \+(\d+) to hit/i,
      extractor: (match) => ({
        type: match[0].toLowerCase().includes('melee') ? 'msak' : 'rsak',
        bonus: parseInt(match[1])
      }),
      priority: 100
    });

    // Damage patterns - multiple formats
    this.addPattern({
      name: 'damage_with_average',
      regex: /(\d+) \((\d+d\d+(?:\s*[\+\-]\s*\d+)?)\) (\w+) damage/gi,
      extractor: (match) => ({
        average: parseInt(match[1]),
        formula: match[2].replace(/\s+/g, ''),
        type: match[3].toLowerCase()
      }),
      priority: 90
    });

    this.addPattern({
      name: 'damage_simple',
      regex: /(\d+d\d+(?:\s*[\+\-]\s*\d+)?)\s+(\w+)\s+damage/gi,
      extractor: (match) => ({
        formula: match[1].replace(/\s+/g, ''),
        type: match[2].toLowerCase()
      }),
      priority: 85
    });

    // Save patterns
    this.addPattern({
      name: 'save_dc',
      regex: /DC (\d+) (\w+) (?:saving throw|save)/gi,
      extractor: (match) => ({
        dc: parseInt(match[1]),
        ability: match[2].toLowerCase().slice(0, 3) // str, dex, con, etc.
      }),
      priority: 95
    });

    // Duration patterns
    this.addPattern({
      name: 'duration_concentration',
      regex: /(?:concentration,?\s+)?(?:up to\s+)?(\d+)\s+(minute|hour|day)s?/i,
      extractor: (match) => ({
        value: parseInt(match[1]),
        units: match[2].toLowerCase(),
        concentration: match[0].toLowerCase().includes('concentration')
      }),
      priority: 80
    });

    this.addPattern({
      name: 'duration_rounds',
      regex: /(?:for|lasts?)\s+(\d+)\s+rounds?/i,
      extractor: (match) => ({
        value: parseInt(match[1]),
        units: 'round'
      }),
      priority: 85
    });

    this.addPattern({
      name: 'duration_instant',
      regex: /instantaneous/i,
      extractor: () => ({
        value: null,
        units: 'inst'
      }),
      priority: 90
    });

    // Range patterns
    this.addPattern({
      name: 'range_distance',
      regex: /range (\d+)(?:\/(\d+))?\s*(?:foot|feet|ft\.?)/i,
      extractor: (match) => ({
        value: parseInt(match[1]),
        long: match[2] ? parseInt(match[2]) : null,
        units: 'ft'
      }),
      priority: 90
    });

    this.addPattern({
      name: 'range_touch',
      regex: /\btouch\b/i,
      extractor: () => ({
        value: null,
        units: 'touch'
      }),
      priority: 95
    });

    this.addPattern({
      name: 'range_self',
      regex: /\bself\b/i,
      extractor: () => ({
        value: null,
        units: 'self'
      }),
      priority: 95
    });

    // Area effect patterns
    this.addPattern({
      name: 'area_radius',
      regex: /(\d+)(?:-|\s)(?:foot|ft\.?)\s+radius/i,
      extractor: (match) => ({
        type: 'radius',
        value: parseInt(match[1])
      }),
      priority: 85
    });

    this.addPattern({
      name: 'area_cone',
      regex: /(\d+)(?:-|\s)(?:foot|ft\.?)\s+cone/i,
      extractor: (match) => ({
        type: 'cone',
        value: parseInt(match[1])
      }),
      priority: 85
    });

    this.addPattern({
      name: 'area_line',
      regex: /(\d+)(?:-|\s)(?:foot|ft\.?)\s+line/i,
      extractor: (match) => ({
        type: 'line',
        value: parseInt(match[1])
      }),
      priority: 85
    });

    // Activation patterns
    this.addPattern({
      name: 'activation_action',
      regex: /\b(?:1\s+)?action\b/i,
      extractor: () => ({
        type: 'action',
        cost: 1
      }),
      priority: 80
    });

    this.addPattern({
      name: 'activation_bonus',
      regex: /\bbonus action\b/i,
      extractor: () => ({
        type: 'bonus',
        cost: 1
      }),
      priority: 85
    });

    this.addPattern({
      name: 'activation_reaction',
      regex: /\breaction\b/i,
      extractor: () => ({
        type: 'reaction',
        cost: 1
      }),
      priority: 85
    });

    // Condition patterns
    this.addPattern({
      name: 'advantage',
      regex: /advantage on (?:attack rolls?|(?:(\w+)\s+)?(?:ability checks?|checks?|saving throws?|saves?))/i,
      extractor: (match) => ({
        type: 'advantage',
        target: match[1] ? match[1].toLowerCase() : 'all'
      }),
      priority: 75
    });

    this.addPattern({
      name: 'disadvantage',
      regex: /disadvantage on (?:attack rolls?|(?:(\w+)\s+)?(?:ability checks?|checks?|saving throws?|saves?))/i,
      extractor: (match) => ({
        type: 'disadvantage',
        target: match[1] ? match[1].toLowerCase() : 'all'
      }),
      priority: 75
    });

    // Resistance patterns
    this.addPattern({
      name: 'damage_resistance',
      regex: /(?:resistant?|resistance) to (\w+(?:,\s*\w+)*) damage/i,
      extractor: (match) => ({
        type: 'resistance',
        damageTypes: match[1].split(/,\s*/).map(type => type.toLowerCase())
      }),
      priority: 70
    });

    this.addPattern({
      name: 'damage_immunity',
      regex: /(?:immune|immunity) to (\w+(?:,\s*\w+)*) damage/i,
      extractor: (match) => ({
        type: 'immunity',
        damageTypes: match[1].split(/,\s*/).map(type => type.toLowerCase())
      }),
      priority: 70
    });

    // Resource usage patterns
    this.addPattern({
      name: 'uses_per_day',
      regex: /(\d+)\/day/i,
      extractor: (match) => ({
        type: 'per_day',
        amount: parseInt(match[1])
      }),
      priority: 60
    });

    this.addPattern({
      name: 'uses_per_rest',
      regex: /(\d+)\/(short|long) rest/i,
      extractor: (match) => ({
        type: 'per_rest',
        amount: parseInt(match[1]),
        restType: match[2].toLowerCase()
      }),
      priority: 60
    });

    this.addPattern({
      name: 'recharge',
      regex: /(?:Recharge|recharges on) (\d+)(?:-(\d+))?/i,
      extractor: (match) => ({
        type: 'recharge',
        min: parseInt(match[1]),
        max: match[2] ? parseInt(match[2]) : 6
      }),
      priority: 65
    });
  }

  private addPattern(pattern: ParsingPattern): void {
    this.patterns.set(pattern.name, pattern);
  }

  /**
   * Extract all matching patterns from text
   */
  public extractPatterns(text: string): Map<string, any[]> {
    const results = new Map<string, any[]>();
    
    // Sort patterns by priority (highest first)
    const sortedPatterns = Array.from(this.patterns.entries())
      .sort(([,a], [,b]) => b.priority - a.priority);

    for (const [name, pattern] of sortedPatterns) {
      const matches = [];
      let match;
      
      // Reset regex global state
      pattern.regex.lastIndex = 0;
      
      while ((match = pattern.regex.exec(text)) !== null) {
        try {
          const extracted = pattern.extractor(match);
          matches.push({
            ...extracted,
            matchText: match[0],
            index: match.index
          });
        } catch (error) {
          console.warn(`Error extracting pattern ${name}:`, error);
        }
        
        // Prevent infinite loops on global regexes
        if (!pattern.regex.global) break;
      }
      
      if (matches.length > 0) {
        results.set(name, matches);
      }
    }
    
    return results;
  }

  /**
   * Get the first match for a specific pattern
   */
  public getFirstMatch(text: string, patternName: string): any | null {
    const pattern = this.patterns.get(patternName);
    if (!pattern) return null;
    
    pattern.regex.lastIndex = 0;
    const match = pattern.regex.exec(text);
    
    if (match) {
      try {
        return pattern.extractor(match);
      } catch (error) {
        console.warn(`Error extracting pattern ${patternName}:`, error);
      }
    }
    
    return null;
  }

  /**
   * Check if text contains a specific pattern
   */
  public hasPattern(text: string, patternName: string): boolean {
    const pattern = this.patterns.get(patternName);
    if (!pattern) return false;
    
    pattern.regex.lastIndex = 0;
    return pattern.regex.test(text);
  }

  /**
   * Get all available pattern names
   */
  public getPatternNames(): string[] {
    return Array.from(this.patterns.keys());
  }
}