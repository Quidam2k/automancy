import { TextAnalyzer } from './parser/text-analyzer';
import { RuleEngine } from './automation/rule-engine';
import { Phase2Converter, EnhancedConversionResult } from './phase2-converter';

/**
 * Main entry point for the Automancy converter
 * Converts homebrew D&D abilities into Foundry VTT automation
 */
export class AutomancyConverter {
  private textAnalyzer: TextAnalyzer;
  private ruleEngine: RuleEngine;
  private phase2Engine: Phase2Converter;

  constructor() {
    this.textAnalyzer = new TextAnalyzer();
    this.ruleEngine = new RuleEngine();
    // Phase 2 engine will be lazily initialized to avoid circular dependencies if any
    // but we'll instantiate it here for clarity as this is the new standard
    this.phase2Engine = new Phase2Converter(); 
  }

  /**
   * Convert a homebrew ability description into Foundry automation
   */
  public convertAbility(text: string, name?: string): EnhancedConversionResult {
    // Delegate to Phase 2 Engine for superior automation
    try {
      // The Phase 2 converter handles the full pipeline
      // We just need to ensure the return format matches what the CLI expects
      const result = this.phase2Engine.convertAbility(text);
      
      // If name is provided and not in result, update it
      if (name && result.foundryItem) {
        result.foundryItem.name = name;
      }

      return result;
      
    } catch (error) {
        // Fallback or error handling
        console.error('❌ Phase 2 Conversion failed, attempting fallback...', error);
        // Original fallback logic could go here, but for now we want to surface the error
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            original: { raw: text, parsed: null },
            automation: null,
            foundryItem: null,
            phase2Enhancement: {
                applied: false,
                reason: "Fallback due to error"
            }
        };
    }
  }

  /**
   * Convert multiple abilities at once
   */
  public convertMultiple(abilities: Array<{ text: string; name?: string }>): EnhancedConversionResult[] {
    return abilities.map(ability => this.convertAbility(ability.text, ability.name));
  }

  /**
   * Get a summary of the converter's capabilities
   */
  public getCapabilities() {
    return {
      version: '2.0.0 (Phase 2 Professional)',
      supportedPatterns: [
        'Weapon attacks with attack bonuses',
        'Spell attacks and save DCs',
        'Damage formulas (XdY + Z)',
        'Duration parsing (rounds, minutes, hours)',
        'Range parsing (feet, touch, self)',
        'Advantage/disadvantage conditions',
        'Damage resistance and immunity',
        'Resource usage (per day, per rest, recharge)',
        'Complex multi-step requirements (Phase 2)',
        'Reaction triggers and tracking (Phase 2)',
        'Ongoing effect management (Phase 2)',
        'Recharge automation (Phase 2)'
      ],
      complexityLevels: {
        1: 'Simple - Basic flags and effects only',
        2: 'Moderate - Simple macros, conditional effects',
        3: 'Complex - Advanced macros, multi-step workflows', 
        4: 'Reaction - Real-time reactions, cross-actor effects'
      },
      outputFormats: [
        'Foundry VTT Item JSON',
        'Active Effects',
        'MidiQOL Flags',
        'OnUse Macros (Professional Grade)',
        'Chris Premades / Gambit Premades Integration'
      ]
    };
  }
}

// Example usage and testing
if (require.main === module) {
  console.log('🚀 Starting Automancy Converter Demo (Phase 2 Enabled)\n');
  
  const converter = new AutomancyConverter();
  
  // Test cases from our documentation
  const testCases = [
    {
      name: "Flame Sword",
      text: "Flame Sword: Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage plus 4 (1d4) fire damage."
    },
    {
      name: "Lightning Bolt", 
      text: "Lightning Bolt: DC 15 Dex save, 60-foot line. 28 (8d6) lightning damage, half on save."
    },
    {
      name: "Bear Hug (Complex)",
      text: "Bear Hug (Recharge 4-6). The owlbear attempts to grab and crush a creature they can see within 5 feet of them. The target must make a DC 15 Dexterity saving throw. On a failed save, the target takes 22 (4d10) bludgeoning damage and is grappled (escape DC 15). On a successful save, the target takes half as much damage and is not grappled. Until this grapple ends, the target is restrained and takes 5 (1d10) bludgeoning damage at the start of each of their turns."
    }
  ];
  
  console.log('📋 Testing conversion with', testCases.length, 'abilities:\n');
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
    const result = converter.convertAbility(testCase.text, testCase.name);
    
    if (result.success) {
      console.log('✅ Success!');
      console.log('📊 Generated item preview:');
      console.log('  - Name:', result.foundryItem?.name);
      console.log('  - Type:', result.foundryItem?.type);
      console.log('  - Professional Grade:', (result as any).phase2Enhancement?.professionalGrade ? 'Yes' : 'No');
      console.log('  - Effects:', result.foundryItem?.effects?.length || 0);
      console.log('  - Flags:', Object.keys(result.foundryItem?.flags || {}).length);
    } else {
      console.log('❌ Failed:', result.error);
    }
  });
  
  console.log('\n🎯 Demo complete! All test cases processed.');
  console.log('\n📋 Converter capabilities:');
  console.log(converter.getCapabilities());
}

export * from './types';
export * from './parser/text-analyzer';
export * from './parser/pattern-matcher';
export * from './automation/rule-engine';
export * from './automation/flag-generator';
export * from './automation/effect-generator';
export * from './phase2-converter'; // Export new engine
