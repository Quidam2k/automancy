import { TextAnalyzer } from './parser/text-analyzer';
import { AutomationEngine, AutomationEngineResult } from './automation/automation-engine';
import { ReviewNote } from './automation/flag-builder';
import { FoundryItemData, AutomationComplexity } from './types';

/**
 * Result returned by the public API.
 * Backwards-compatible with old EnhancedConversionResult shape used by CLI.
 */
export interface ConversionResult {
  success: boolean;
  error?: string;
  original: { raw: string; parsed: any };
  automation: {
    complexity: AutomationComplexity;
    macros: never[];
  } | null;
  foundryItem: FoundryItemData | null;
  reviewNotes: ReviewNote[];
  validation?: { valid: boolean; errors: string[]; warnings: string[] };
}

/**
 * Main entry point for the Automancy converter.
 * Converts homebrew D&D abilities into Foundry VTT automation.
 */
export class AutomancyConverter {
  private textAnalyzer: TextAnalyzer;
  private automationEngine: AutomationEngine;

  constructor() {
    this.textAnalyzer = new TextAnalyzer();
    this.automationEngine = new AutomationEngine();
  }

  /**
   * Convert a homebrew ability description into Foundry automation.
   */
  public convertAbility(text: string, name?: string): ConversionResult {
    try {
      // Step 1: Parse the text
      const abilityDescription = this.textAnalyzer.analyzeText(text);
      const parsed = abilityDescription.parsed;

      // Override name if provided
      if (name) {
        parsed.name = name;
      }

      // Step 2: Generate automation
      const engineResult = this.automationEngine.convert(parsed);

      return {
        success: engineResult.success,
        original: { raw: text, parsed },
        automation: {
          complexity: engineResult.complexity,
          macros: [],
        },
        foundryItem: engineResult.item,
        reviewNotes: engineResult.reviewNotes,
        validation: engineResult.validation,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        original: { raw: text, parsed: null },
        automation: null,
        foundryItem: null,
        reviewNotes: [],
      };
    }
  }

  /**
   * Convert multiple abilities at once.
   */
  public convertMultiple(abilities: Array<{ text: string; name?: string }>): ConversionResult[] {
    return abilities.map(ability => this.convertAbility(ability.text, ability.name));
  }

  /**
   * Get a summary of the converter's capabilities.
   */
  public getCapabilities() {
    return {
      version: '3.0.0',
      supportedPatterns: [
        'Weapon attacks (melee/ranged, weapon/spell)',
        'Save abilities with DC',
        'Damage formulas (XdY + Z)',
        'Duration parsing (rounds, minutes, hours)',
        'Range parsing (feet, touch, self)',
        'Standard conditions (prone, grappled, restrained, etc.)',
        'Custom conditions (dazed, bleeding)',
        'Advantage/disadvantage effects',
        'Damage resistance',
        'Resource usage (per day, per rest, recharge)',
        'Recharge mechanics (Recharge 4-6, 5-6)',
        'Reaction triggers',
      ],
      complexityLevels: {
        1: 'Simple - Flags and effects only',
        2: 'Moderate - Conditions, inline macros',
        3: 'Complex - Multi-step workflows, AoE',
        4: 'Reaction - Real-time triggers, cross-actor',
      },
      outputFormats: [
        'Foundry VTT Item JSON (D&D5e 4.x Activities)',
        'Active Effects with DAE/midi-qol flags',
        'MidiQOL Flags (validated against reference)',
        'Chris Premades integration flags',
      ],
    };
  }
}

// Example usage and testing
if (require.main === module) {
  console.log('Starting Automancy Converter Demo (v3.0)\n');

  const converter = new AutomancyConverter();

  const testCases = [
    {
      name: 'Flame Sword',
      text: 'Flame Sword: Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage plus 4 (1d4) fire damage.',
    },
    {
      name: 'Lightning Bolt',
      text: 'Lightning Bolt: DC 15 Dex save, 60-foot line. 28 (8d6) lightning damage, half on save.',
    },
    {
      name: 'Bear Hug',
      text: 'Bear Hug (Recharge 4-6). The owlbear attempts to grab and crush a creature they can see within 5 feet of them. The target must make a DC 15 Dexterity saving throw. On a failed save, the target takes 22 (4d10) bludgeoning damage and is grappled (escape DC 15). On a successful save, the target takes half as much damage and is not grappled. Until this grapple ends, the target is restrained and takes 5 (1d10) bludgeoning damage at the start of each of their turns.',
    },
  ];

  console.log(`Testing ${testCases.length} abilities:\n`);

  testCases.forEach((testCase, index) => {
    console.log(`--- Test ${index + 1}: ${testCase.name} ---`);
    const result = converter.convertAbility(testCase.text, testCase.name);

    if (result.success) {
      console.log('  Success');
      console.log(`  Type: ${result.foundryItem?.type}`);
      const activityCount = Object.keys(result.foundryItem?.system?.activities || {}).length;
      console.log(`  Activities: ${activityCount}`);
      console.log(`  Effects: ${result.foundryItem?.effects?.length || 0}`);
      console.log(`  Validation: ${result.validation?.valid ? 'PASS' : 'FAIL'}`);
      if (result.validation?.errors.length) {
        result.validation.errors.forEach(e => console.log(`    Error: ${e}`));
      }
      if (result.reviewNotes.length) {
        result.reviewNotes.forEach(n => console.log(`    [${n.severity}] ${n.message}`));
      }
    } else {
      console.log(`  Failed: ${result.error}`);
    }
    console.log('');
  });

  console.log('Demo complete.');
}

export * from './types';
export * from './parser/text-analyzer';
export * from './parser/pattern-matcher';
export { AutomationEngine } from './automation/automation-engine';
export { ReviewNote } from './automation/flag-builder';
