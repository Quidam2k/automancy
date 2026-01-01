#!/usr/bin/env node

import { AutomancyConverter } from './index';
import { CreatureConverter } from './creature-converter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Command Line Interface for the Automancy Converter
 */
class AutomancyCLI {
  private converter: AutomancyConverter;
  private creatureConverter: CreatureConverter;

  constructor() {
    this.converter = new AutomancyConverter();
    this.creatureConverter = new CreatureConverter();
  }

  public async run(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      this.showHelp();
      return;
    }

    const command = args[0];

    switch (command) {
      case 'convert':
        await this.handleConvert(args.slice(1));
        break;
      case 'batch':
        await this.handleBatch(args.slice(1));
        break;
      case 'creature':
        await this.handleCreature(args.slice(1));
        break;
      case 'demo':
        await this.handleDemo();
        break;
      case 'capabilities':
        this.showCapabilities();
        break;
      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        this.showHelp();
        process.exit(1);
    }
  }

  private async handleConvert(args: string[]): Promise<void> {
    if (args.length < 1) {
      console.error('❌ Convert command requires ability text');
      console.log('Usage: automancy convert "ability text" [name] [--output file.json]');
      return;
    }

    const text = args[0];
    const name = args[1] || undefined;
    const outputIndex = args.indexOf('--output');
    const outputFile = outputIndex >= 0 ? args[outputIndex + 1] : null;

    console.log('🔄 Converting ability...\n');
    
    const result = this.converter.convertAbility(text, name);
    
    if (result.success) {
      console.log('✅ Conversion successful!\n');
      console.log('📊 Result Summary:');
      console.log(`  Name: ${result.foundryItem?.name}`);
      console.log(`  Type: ${result.foundryItem?.type}`);
      console.log(`  Complexity: ${result.automation?.complexity}/4`);
      console.log(`  Effects: ${result.foundryItem?.effects?.length || 0}`);
      console.log(`  Flags: ${Object.keys(result.foundryItem?.flags || {}).length}`);
      console.log(`  Macros: ${result.automation?.macros?.length || 0}`);

      if (outputFile) {
        await this.saveResult(result, outputFile);
      } else {
        console.log('\n📋 Generated Foundry Item JSON:');
        console.log(JSON.stringify(result.foundryItem, null, 2));
      }
    } else {
      console.error('❌ Conversion failed:', result.error);
      process.exit(1);
    }
  }

  private async handleBatch(args: string[]): Promise<void> {
    if (args.length < 1) {
      console.error('❌ Batch command requires input file');
      console.log('Usage: automancy batch input.txt [--output output.json]');
      return;
    }

    const inputFile = args[0];
    const outputIndex = args.indexOf('--output');
    const outputFile = outputIndex >= 0 ? args[outputIndex + 1] : 'batch-output.json';

    try {
      const content = fs.readFileSync(inputFile, 'utf-8');
      const abilities = this.parseInputFile(content);
      
      console.log(`🔄 Processing ${abilities.length} abilities from ${inputFile}...\n`);
      
      const results = this.converter.convertMultiple(abilities);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`✅ Converted ${successful.length}/${results.length} abilities successfully`);
      
      if (failed.length > 0) {
        console.log(`❌ Failed conversions: ${failed.length}`);
        failed.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.error}`);
        });
      }

      // Save successful results
      const foundryItems = successful.map(r => r.foundryItem);
      await this.saveBatchResults(foundryItems, outputFile);
      
    } catch (error) {
      console.error('❌ Error processing batch file:', error);
      process.exit(1);
    }
  }

  private async handleCreature(args: string[]): Promise<void> {
    if (args.length < 1) {
      console.error('❌ Creature command requires stat block file');
      console.log('Usage: automancy creature statblock.txt [--output creature.json]');
      return;
    }

    const inputFile = args[0];
    const outputIndex = args.indexOf('--output');
    const outputFile = outputIndex >= 0 ? args[outputIndex + 1] : null;

    try {
      const statBlock = fs.readFileSync(inputFile, 'utf-8');
      
      console.log(`🦉 Converting creature from ${inputFile}...\n`);
      
      const result = this.creatureConverter.convertCreature(statBlock);
      
      console.log('\n✅ Creature conversion successful!\n');
      console.log('📊 Result Summary:');
      console.log(`  Name: ${result.actor.name}`);
      console.log(`  Type: ${result.actor.system.details.type.value}`);
      console.log(`  CR: ${result.actor.system.details.cr}`);
      console.log(`  HP: ${result.actor.system.attributes.hp.max}`);
      console.log(`  AC: ${result.actor.system.attributes.ac.flat}`);
      console.log(`  Abilities: ${result.items.length}`);

      if (outputFile) {
        // Save complete creature package
        const creaturePackage = {
          actor: result.actor,
          items: result.items,
          effects: result.effects,
          macros: result.macros,
          metadata: {
            generated: new Date().toISOString(),
            version: "0.1.0",
            type: "complete-creature"
          }
        };
        
        await this.saveResult(creaturePackage, outputFile);
      } else {
        console.log('\n📋 Generated Actor JSON (use --output to save):');
        console.log(JSON.stringify(result.actor, null, 2));
      }
      
    } catch (error) {
      console.error('❌ Error processing creature file:', error);
      process.exit(1);
    }
  }

  private async handleDemo(): Promise<void> {
    console.log('🚀 Running Automancy Converter Demo\n');
    
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
        name: "Dragon Slayer",
        text: "Dragon Slayer: +1 attack and damage rolls. Against dragons, +3d6 extra damage."
      },
      {
        name: "Bless",
        text: "Bless: Target gains advantage on attack rolls and saves for 1 minute."
      }
    ];

    const results = this.converter.convertMultiple(testCases);
    const successful = results.filter(r => r.success);

    console.log(`✅ Demo complete! Successfully converted ${successful.length}/${results.length} test abilities.`);
  }

  private parseInputFile(content: string): Array<{ text: string; name?: string }> {
    const abilities: Array<{ text: string; name?: string }> = [];
    const lines = content.split('\n');
    
    let currentAbility = '';
    let currentName = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '' && currentAbility) {
        // End of current ability
        abilities.push({
          text: currentAbility.trim(),
          name: currentName || undefined
        });
        currentAbility = '';
        currentName = '';
      } else if (trimmed.startsWith('# ')) {
        // Ability name
        currentName = trimmed.substring(2).trim();
      } else if (trimmed && !trimmed.startsWith('#')) {
        // Ability text
        currentAbility += (currentAbility ? ' ' : '') + trimmed;
      }
    }
    
    // Handle last ability if file doesn't end with empty line
    if (currentAbility) {
      abilities.push({
        text: currentAbility.trim(),
        name: currentName || undefined
      });
    }
    
    return abilities;
  }

  private async saveResult(result: any, outputFile: string): Promise<void> {
    try {
      const dir = path.dirname(outputFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Handle both single item results and creature packages
      const dataToSave = result.foundryItem || result;
      fs.writeFileSync(outputFile, JSON.stringify(dataToSave, null, 2));
      console.log(`💾 Saved to ${outputFile}`);
    } catch (error) {
      console.error('❌ Error saving file:', error);
    }
  }

  private async saveBatchResults(items: any[], outputFile: string): Promise<void> {
    try {
      const dir = path.dirname(outputFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(outputFile, JSON.stringify(items, null, 2));
      console.log(`💾 Saved ${items.length} items to ${outputFile}`);
    } catch (error) {
      console.error('❌ Error saving batch file:', error);
    }
  }

  private showHelp(): void {
    console.log(`
🔮 Automancy - Homebrew D&D to Foundry VTT Automation Converter

USAGE:
  automancy <command> [options]

COMMANDS:
  convert <text> [name]           Convert single ability text to Foundry automation
  batch <input.txt>               Convert multiple abilities from file
  creature <statblock.txt>        Convert complete creature stat block to Foundry actor
  demo                           Run demonstration with test cases
  capabilities                   Show supported patterns and features
  help                           Show this help message

EXAMPLES:
  automancy convert "Fireball: DC 15 Dex save, 8d6 fire damage" "Fireball"
  automancy convert "Sword +1: +1 to attack and damage" --output sword.json
  automancy batch abilities.txt --output my-homebrew.json
  automancy creature owlbear.txt --output owlbear-complete.json
  automancy demo

INPUT FILE FORMAT (for batch):
  # Ability Name
  Description text here
  
  # Another Ability
  More description text
  
OUTPUT:
  Generated Foundry VTT item JSON with MidiQOL automation, Active Effects, and macros

For more information, visit: https://github.com/your-repo/automancy
`);
  }

  private showCapabilities(): void {
    const caps = this.converter.getCapabilities();
    console.log('\n🎯 Automancy Converter Capabilities\n');
    console.log(`Version: ${caps.version}\n`);
    
    console.log('📋 Supported Patterns:');
    caps.supportedPatterns.forEach(pattern => {
      console.log(`  ✅ ${pattern}`);
    });
    
    console.log('\n🔧 Complexity Levels:');
    Object.entries(caps.complexityLevels).forEach(([level, desc]) => {
      console.log(`  ${level}: ${desc}`);
    });
    
    console.log('\n📤 Output Formats:');
    caps.outputFormats.forEach(format => {
      console.log(`  📄 ${format}`);
    });
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new AutomancyCLI();
  cli.run().catch(error => {
    console.error('❌ CLI Error:', error);
    process.exit(1);
  });
}