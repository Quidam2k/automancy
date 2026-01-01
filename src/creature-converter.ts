import { CreatureDescription, FoundryActorData, CreatureAutomationResult } from './types/creature-types';
import { AutomancyConverter } from './index';

// Generate 16-character alphanumeric ID for Foundry VTT
function generateFoundryId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Converts full creature stat blocks into complete Foundry actors with automation
 * Extends the basic ability converter to handle complete creatures
 */
export class CreatureConverter {
  private abilityConverter: AutomancyConverter;

  constructor() {
    this.abilityConverter = new AutomancyConverter();
  }

  /**
   * Parse a creature stat block and convert to Foundry actor
   */
  public convertCreature(statBlock: string): CreatureAutomationResult {
    console.log('🦉 Parsing creature stat block...');
    
    // Parse the stat block into structured data
    const creature = this.parseStatBlock(statBlock);
    
    console.log(`✅ Parsed creature: ${creature.name} (CR ${creature.challengeRating})`);
    
    // Generate the base actor
    const actor = this.generateActor(creature);
    
    // Convert all abilities to items
    const items = this.convertAbilities(creature);
    
    // Generate any creature-wide effects
    const effects = this.generateCreatureEffects(creature);
    
    // Generate macros for complex behaviors
    const macros = this.generateCreatureMacros(creature);
    
    console.log(`🔧 Generated complete creature with ${items.length} abilities`);
    
    return {
      actor,
      items,
      effects,
      macros
    };
  }

  private parseStatBlock(statBlock: string): CreatureDescription {
    const lines = statBlock.split('\n').map(line => line.trim()).filter(line => line);

    const creature: CreatureDescription = {
      name: 'Unknown Creature',
      type: 'monstrosity',
      size: 'Medium',
      alignment: 'Unaligned',
      armorClass: 10,
      hitPoints: 10,
      hitDie: '1d8',
      speed: { walk: 30 },
      abilities: {
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
      },
      challengeRating: '0',
      experiencePoints: 0,
      proficiencyBonus: 2,
      actions: [],
      reactions: [],
      traits: [],
      legendaryActions: [],
      bonusActions: []
    };

    // Extract creature name (first non-empty line)
    if (lines.length > 0) {
      creature.name = lines[0].trim();
    }

    // Parse size, type, alignment from second line
    const typeLineMatch = statBlock.match(/^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+(\w+)(?:\s*\([^)]+\))?,?\s*(.+)?$/im);
    if (typeLineMatch) {
      creature.size = typeLineMatch[1];
      creature.type = typeLineMatch[2].toLowerCase();
      if (typeLineMatch[3]) {
        creature.alignment = typeLineMatch[3].trim();
      }
    }

    // Parse CR and XP - MCDM format: "CR 5 Controller" on one line, "1,800 XP" on next
    const crMatch = statBlock.match(/CR\s+(\d+(?:\/\d+)?)/i);
    if (crMatch) {
      creature.challengeRating = crMatch[1];
    }
    const xpMatch = statBlock.match(/([\d,]+)\s*XP/i);
    if (xpMatch) {
      creature.experiencePoints = parseInt(xpMatch[1].replace(/,/g, ''));
    }

    // Parse AC
    const acMatch = statBlock.match(/Armor Class\s+(\d+)/i);
    if (acMatch) {
      creature.armorClass = parseInt(acMatch[1]);
    }

    // Parse HP
    const hpMatch = statBlock.match(/Hit Points\s+(\d+)\s*\(([^)]+)\)/i);
    if (hpMatch) {
      creature.hitPoints = parseInt(hpMatch[1]);
      creature.hitDie = hpMatch[2];
    }

    // Parse Speed
    const speedMatch = statBlock.match(/Speed\s+(.+?)(?:\n|$)/i);
    if (speedMatch) {
      creature.speed = this.parseSpeed(speedMatch[1]);
    }

    // Parse Proficiency Bonus
    const profMatch = statBlock.match(/Proficiency Bonus\s*\+(\d+)/i);
    if (profMatch) {
      creature.proficiencyBonus = parseInt(profMatch[1]);
    }

    // Parse ability scores - handle vertical format (each stat on separate lines)
    creature.abilities = this.parseAbilityScores(statBlock);

    // Parse damage immunities
    const diMatch = statBlock.match(/Damage Immunities\s+(.+?)(?:\n|$)/i);
    if (diMatch) {
      creature.damageImmunities = diMatch[1].split(/,\s*/).map(d => d.trim().toLowerCase());
    }

    // Parse condition immunities
    const ciMatch = statBlock.match(/Condition Immunities\s+(.+?)(?:\n|$)/i);
    if (ciMatch) {
      creature.conditionImmunities = ciMatch[1].split(/,\s*/).map(c => c.trim().toLowerCase());
    }

    // Parse senses
    const sensesMatch = statBlock.match(/Senses\s+(.+?)(?:\n|$)/i);
    if (sensesMatch) {
      creature.senses = this.parseSenses(sensesMatch[1]);
    }

    // Parse languages
    const langMatch = statBlock.match(/Languages\s+(.+?)(?:\n|$)/i);
    if (langMatch) {
      creature.languages = langMatch[1].split(/,\s*/).map(l => l.trim());
    }

    // Parse sections and abilities
    const sections = this.extractSections(statBlock);

    creature.traits = sections.traits || [];
    creature.actions = sections.actions || [];
    creature.bonusActions = sections.bonusActions || [];
    creature.reactions = sections.reactions || [];
    creature.legendaryActions = sections.legendaryActions || [];

    return creature;
  }

  private parseAbilityScores(statBlock: string): CreatureDescription['abilities'] {
    const abilities: CreatureDescription['abilities'] = {
      str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
    };

    // Try horizontal format first: "STR DEX CON INT WIS CHA" followed by scores
    const horizontalMatch = statBlock.match(/STR\s+DEX\s+CON\s+INT\s+WIS\s+CHA\s*\n\s*(\d+)\s*\([^)]+\)\s*(\d+)\s*\([^)]+\)\s*(\d+)\s*\([^)]+\)\s*(\d+)\s*\([^)]+\)\s*(\d+)\s*\([^)]+\)\s*(\d+)\s*\([^)]+\)/i);
    if (horizontalMatch) {
      abilities.str = parseInt(horizontalMatch[1]);
      abilities.dex = parseInt(horizontalMatch[2]);
      abilities.con = parseInt(horizontalMatch[3]);
      abilities.int = parseInt(horizontalMatch[4]);
      abilities.wis = parseInt(horizontalMatch[5]);
      abilities.cha = parseInt(horizontalMatch[6]);
      return abilities;
    }

    // Vertical format: each ability on its own line(s)
    const abilityNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    for (const abilityName of abilityNames) {
      const pattern = new RegExp(`${abilityName}\\s*\\n\\s*(\\d+)\\s*\\([^)]+\\)`, 'i');
      const match = statBlock.match(pattern);
      if (match) {
        abilities[abilityName as keyof typeof abilities] = parseInt(match[1]);
      }
    }

    return abilities;
  }

  private parseSpeed(speedText: string): Record<string, number> {
    const speed: Record<string, number> = {};

    // Parse different movement types
    const walkMatch = speedText.match(/^(\d+)\s*ft\.?/);
    if (walkMatch) {
      speed.walk = parseInt(walkMatch[1]);
    }

    const flyMatch = speedText.match(/fly\s+(\d+)\s*ft\.?/i);
    if (flyMatch) {
      speed.fly = parseInt(flyMatch[1]);
    }

    const swimMatch = speedText.match(/swim\s+(\d+)\s*ft\.?/i);
    if (swimMatch) {
      speed.swim = parseInt(swimMatch[1]);
    }

    const climbMatch = speedText.match(/climb\s+(\d+)\s*ft\.?/i);
    if (climbMatch) {
      speed.climb = parseInt(climbMatch[1]);
    }

    const burrowMatch = speedText.match(/burrow\s+(\d+)\s*ft\.?/i);
    if (burrowMatch) {
      speed.burrow = parseInt(burrowMatch[1]);
    }

    return speed;
  }

  private parseSenses(sensesText: string): Record<string, any> {
    const senses: Record<string, any> = {};

    const darkvisionMatch = sensesText.match(/darkvision\s+(\d+)\s*ft\.?/i);
    if (darkvisionMatch) {
      senses.darkvision = parseInt(darkvisionMatch[1]);
    }

    const blindsightMatch = sensesText.match(/blindsight\s+(\d+)\s*ft\.?/i);
    if (blindsightMatch) {
      senses.blindsight = parseInt(blindsightMatch[1]);
    }

    const truesightMatch = sensesText.match(/truesight\s+(\d+)\s*ft\.?/i);
    if (truesightMatch) {
      senses.truesight = parseInt(truesightMatch[1]);
    }

    const tremorMatch = sensesText.match(/tremorsense\s+(\d+)\s*ft\.?/i);
    if (tremorMatch) {
      senses.tremorsense = parseInt(tremorMatch[1]);
    }

    const passiveMatch = sensesText.match(/passive Perception\s+(\d+)/i);
    if (passiveMatch) {
      senses.passivePerception = parseInt(passiveMatch[1]);
    }

    return senses;
  }

  private extractSections(statBlock: string): {
    traits: string[];
    actions: string[];
    bonusActions: string[];
    reactions: string[];
    legendaryActions: string[]
  } {
    const result = {
      traits: [] as string[],
      actions: [] as string[],
      bonusActions: [] as string[],
      reactions: [] as string[],
      legendaryActions: [] as string[]
    };

    // Find section boundaries
    const sectionHeaders = ['Actions', 'Bonus Actions', 'Reactions', 'Legendary Actions'];
    const sectionPattern = new RegExp(`^(${sectionHeaders.join('|')})\\s*$`, 'gim');

    // Find all section header positions
    const sections: { name: string; start: number; end: number }[] = [];
    let match;
    while ((match = sectionPattern.exec(statBlock)) !== null) {
      sections.push({ name: match[1], start: match.index + match[0].length, end: statBlock.length });
    }

    // Set end positions
    for (let i = 0; i < sections.length - 1; i++) {
      sections[i].end = sections[i + 1].start - sections[i + 1].name.length - 1;
    }

    // Find where traits end (before first section header or at Proficiency Bonus)
    const firstSectionStart = sections.length > 0 ?
      statBlock.indexOf(sections[0].name) : statBlock.length;

    // Extract traits (abilities before any section header, after Proficiency Bonus)
    const profBonusMatch = statBlock.match(/Proficiency Bonus\s*\+\d+/i);
    if (profBonusMatch) {
      const traitsStart = profBonusMatch.index! + profBonusMatch[0].length;
      const traitsText = statBlock.substring(traitsStart, firstSectionStart).trim();
      if (traitsText) {
        result.traits = this.parseAbilitiesFromText(traitsText);
      }
    }

    // Extract abilities from each section
    for (const section of sections) {
      const sectionText = statBlock.substring(section.start, section.end).trim();
      const abilities = this.parseAbilitiesFromText(sectionText);

      switch (section.name.toLowerCase()) {
        case 'actions':
          result.actions = abilities;
          break;
        case 'bonus actions':
          result.bonusActions = abilities;
          break;
        case 'reactions':
          result.reactions = abilities;
          break;
        case 'legendary actions':
          result.legendaryActions = abilities;
          break;
      }
    }

    return result;
  }

  private parseAbilitiesFromText(text: string): string[] {
    const abilities: string[] = [];

    // Pattern: Ability names start with a capitalized word(s) followed by a period
    // e.g., "Agonizing Touch." or "Melee Spell Attack:"
    // We need to match complete ability blocks, not split on every period

    // Split on ability name patterns: Word(s). or Word(s) (Recharge X-Y).
    // But keep the name with its description
    const abilityPattern = /([A-Z][a-zA-Z\s]+(?:\([^)]+\))?)\.\s+/g;

    let lastIndex = 0;
    let currentAbilityName = '';
    let currentAbilityStart = 0;
    const matches: { name: string; start: number }[] = [];

    let m;
    while ((m = abilityPattern.exec(text)) !== null) {
      // Check if this looks like an ability name (not mid-sentence)
      const name = m[1].trim();
      // Skip if it's clearly mid-sentence (preceded by lowercase or common words)
      const precedingChar = m.index > 0 ? text[m.index - 1] : '\n';
      if (precedingChar === '\n' || precedingChar === ' ' && m.index < 3) {
        matches.push({ name, start: m.index });
      } else if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s*\([^)]+\))?$/.test(name)) {
        // Looks like a proper ability name
        matches.push({ name, start: m.index });
      }
    }

    // Now extract complete abilities
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].start;
      const end = i < matches.length - 1 ? matches[i + 1].start : text.length;
      const abilityText = text.substring(start, end).trim();

      // Only add if it has substantial content
      if (abilityText.length > 10) {
        abilities.push(abilityText);
      }
    }

    // If no abilities found with pattern, return the whole text as one ability
    if (abilities.length === 0 && text.trim().length > 10) {
      abilities.push(text.trim());
    }

    return abilities;
  }

  private generateActor(creature: CreatureDescription): FoundryActorData {
    return {
      _id: generateFoundryId(),
      name: creature.name,
      type: "npc",
      img: this.getCreatureIcon(creature.type),
      system: {
        abilities: this.generateAbilities(creature.abilities),
        attributes: {
          ac: {
            flat: creature.armorClass,
            calc: "natural",
            formula: ""
          },
          hp: {
            value: creature.hitPoints,
            max: creature.hitPoints,
            temp: 0,
            tempmax: 0,
            formula: creature.hitDie
          },
          movement: creature.speed,
          senses: creature.senses || {},
          spellcasting: "",
          prof: creature.proficiencyBonus
        },
        details: {
          biography: {
            value: `<p>Generated by Automancy Converter</p>`,
            public: ""
          },
          alignment: creature.alignment,
          race: "",
          type: {
            value: creature.type,
            subtype: "",
            swarm: "",
            custom: ""
          },
          environment: "",
          cr: this.parseCR(creature.challengeRating),
          spellLevel: 0,
          xp: { value: creature.experiencePoints },
          source: "Automancy"
        },
        skills: {},
        traits: {
          size: creature.size.toLowerCase(),
          di: { value: creature.damageImmunities || [], custom: "" },
          dr: { value: creature.damageResistances || [], custom: "" },
          dv: { value: [], custom: "" },
          ci: { value: creature.conditionImmunities || [], custom: "" },
          languages: { value: creature.languages || [], custom: "" }
        },
        currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
        spells: {},
        bonuses: {},
        resources: {
          legact: { value: 0, max: 0 },
          legres: { value: 0, max: 0 },
          lair: { value: false, initiative: 20 }
        }
      },
      effects: [],
      items: [],
      flags: {
        automancy: {
          generated: true,
          creatureType: creature.type,
          challengeRating: creature.challengeRating
        }
      },
      folder: null,
      sort: 0,
      ownership: { default: 0 }
    };
  }

  private generateAbilities(abilities: CreatureDescription['abilities']) {
    const result: Record<string, any> = {};
    
    Object.entries(abilities).forEach(([key, value]) => {
      result[key] = {
        value: value,
        proficient: 0,
        bonuses: {
          check: "",
          save: ""
        }
      };
    });
    
    return result;
  }

  private convertAbilities(creature: CreatureDescription): any[] {
    const items: any[] = [];

    // Convert traits (passive abilities)
    creature.traits?.forEach(trait => {
      const result = this.abilityConverter.convertAbility(trait);
      if (result.success && result.foundryItem) {
        // Set activation type in all activities
        this.setActivationType(result.foundryItem, 'none');
        items.push(result.foundryItem);
      }
    });

    // Convert actions
    creature.actions?.forEach(action => {
      const result = this.abilityConverter.convertAbility(action);
      if (result.success && result.foundryItem) {
        // Actions default to 'action' activation
        this.setActivationType(result.foundryItem, 'action');
        items.push(result.foundryItem);
      }
    });

    // Convert bonus actions
    creature.bonusActions?.forEach(bonusAction => {
      const result = this.abilityConverter.convertAbility(bonusAction);
      if (result.success && result.foundryItem) {
        this.setActivationType(result.foundryItem, 'bonus');
        items.push(result.foundryItem);
      }
    });

    // Convert reactions
    creature.reactions?.forEach(reaction => {
      const result = this.abilityConverter.convertAbility(reaction);
      if (result.success && result.foundryItem) {
        this.setActivationType(result.foundryItem, 'reaction');
        items.push(result.foundryItem);
      }
    });

    // Convert legendary actions
    creature.legendaryActions?.forEach(legendary => {
      const result = this.abilityConverter.convertAbility(legendary);
      if (result.success && result.foundryItem) {
        this.setActivationType(result.foundryItem, 'legendary');
        items.push(result.foundryItem);
      }
    });

    return items;
  }

  /**
   * Set activation type in D&D5e 4.x activities structure
   */
  private setActivationType(item: any, activationType: string): void {
    // D&D5e 4.x uses system.activities for activation
    if (item.system?.activities) {
      for (const activityId of Object.keys(item.system.activities)) {
        if (item.system.activities[activityId]?.activation) {
          item.system.activities[activityId].activation.type = activationType;
        }
      }
    }
  }

  private generateCreatureEffects(creature: CreatureDescription): any[] {
    // Generate creature-wide effects (passive abilities, auras, etc.)
    return [];
  }

  private generateCreatureMacros(creature: CreatureDescription): any[] {
    // Generate creature-specific macros
    return [];
  }

  private parseCR(cr: string): number {
    // Convert CR string to number (e.g., "1/4" -> 0.25, "3" -> 3)
    if (cr.includes('/')) {
      const [num, den] = cr.split('/').map(Number);
      return num / den;
    }
    return Number(cr);
  }

  private getCreatureIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'monstrosity': 'systems/dnd5e/icons/creatures/beast-bear.jpg',
      'beast': 'systems/dnd5e/icons/creatures/beast-wolf.jpg',
      'dragon': 'systems/dnd5e/icons/creatures/dragon-red.jpg',
      'humanoid': 'systems/dnd5e/icons/creatures/humanoid-commoner.jpg',
      'undead': 'systems/dnd5e/icons/creatures/undead-skeleton.jpg'
    };
    
    return iconMap[type.toLowerCase()] || 'systems/dnd5e/icons/creatures/beast-bear.jpg';
  }
}

// Demo usage
if (require.main === module) {
  const converter = new CreatureConverter();
  
  const owlbearStatBlock = `
OWLBEAR
Large Monstrosity, Unaligned

Armor Class 13 (natural armor)
Hit Points 82 (11d10 + 22)
Speed 40 ft.

STR DEX CON INT WIS CHA
21 (+5) 12 (+1) 15 (+2) 5 (-3) 12 (+1) 6 (-2)

Skills Perception +3
Condition Immunities frightened
Senses darkvision 60 ft., passive Perception 13
Languages —
Proficiency Bonus +2

Traits

Deadly Leap. The owlbear's long jump is up to 30 feet and their high jump is 15 feet, with or without a running start. If the owlbear leaps at least 20 feet toward a target and then hits them with a Bite or Claw attack, the target must succeed on a DC 15 Strength saving throw or be knocked prone.

Keen Sight and Smell. The owlbear has advantage on Wisdom (Perception) checks that rely on sight or smell.

Actions

Multiattack. The owlbear makes one Bite and one Claw attack.

Bite. Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 11 (1d12 + 5) piercing damage, and the owlbear can move the target 5 feet in any direction.

Claw. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage.

Bear Hug (Recharge 4-6). The owlbear attempts to grab and crush a creature they can see within 5 feet of them. The target must make a DC 15 Dexterity saving throw. On a failed save, the target takes 22 (4d10) bludgeoning damage and is grappled (escape DC 15). On a successful save, the target takes half as much damage and is not grappled. Until this grapple ends, the target is restrained and takes 5 (1d10) bludgeoning damage at the start of each of their turns. The grapple ends when the owlbear uses Bear Hug on another target or makes a Claw attack against another target.

Reactions

Hulking Rush. When the owlbear takes damage, they can move up to half their speed without provoking opportunity attacks.
`;

  console.log('🦉 Converting MCDM Owlbear to full Foundry actor...\n');
  
  const result = converter.convertCreature(owlbearStatBlock);
  
  console.log('\n📊 Conversion Results:');
  console.log(`- Actor: ${result.actor.name} (CR ${result.actor.system.details.cr})`);
  console.log(`- Items: ${result.items.length} abilities converted`);
  console.log(`- Effects: ${result.effects.length} creature-wide effects`);
  console.log(`- Macros: ${result.macros.length} advanced macros`);
  
  console.log('\n🎯 Ready for Foundry import!');
}

// Export already handled in class declaration