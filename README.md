# 🔮 Automancy - Homebrew D&D to Foundry VTT Automation Converter

**Automancy** is a TypeScript-based converter that transforms natural language D&D homebrew ability descriptions into fully automated Foundry VTT items compatible with MidiQOL, DAE, Chris Premades, and Gambit's Premades.

## ✨ Features

- **🔍 Intelligent Text Analysis**: Advanced regex patterns extract structured data from natural language
- **⚙️ Automation Generation**: Creates MidiQOL flags, Active Effects, and macros automatically  
- **🎯 Complexity Assessment**: 4-level complexity system determines appropriate automation approach
- **🔧 Module Compatibility**: Follows established patterns from successful automation modules
- **💻 CLI Interface**: Easy-to-use command line tool for single and batch conversions
- **📤 Multiple Output Formats**: Generates Foundry JSON, Active Effects, and macro code

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/your-repo/automancy.git
cd automancy
npm install
npm run build
```

### Basic Usage

```bash
# Convert a single ability
npm run cli convert "Fireball: DC 15 Dex save, 8d6 fire damage" "Fireball"

# Run demo with test cases
npm run cli demo

# Show supported patterns
npm run cli capabilities

# Get help
npm run cli help
```

## 📋 Supported Patterns

✅ **Attack Patterns**
- Weapon attacks with attack bonuses
- Spell attacks and touch attacks
- Ranged and melee variations

✅ **Damage & Healing**
- Damage formulas (XdY + Z format)
- Multiple damage types
- Healing abilities

✅ **Saves & DCs**
- Save DCs with ability requirements
- Flat DC values and scaling

✅ **Duration & Range**
- Time-based durations (rounds, minutes, hours)
- Distance ranges and area effects
- Concentration tracking

✅ **Conditions & Effects**
- Advantage/disadvantage conditions
- Damage resistance and immunity
- Status effect application

✅ **Resource Management**
- Uses per day/rest tracking
- Recharge mechanics
- Resource consumption

## 🔧 Complexity Levels

| Level | Description | Features |
|-------|-------------|----------|
| **1 - Simple** | Basic flags and effects only | Item creation, basic MidiQOL flags |
| **2 - Moderate** | Simple macros, conditional effects | OnUse macros, Active Effects |
| **3 - Complex** | Advanced macros, multi-step workflows | Complex conditional logic |
| **4 - Reaction** | Real-time reactions, cross-actor effects | Advanced timing and triggers |

## 📖 Examples

### Weapon Attack
```bash
# Input
"Flame Sword: Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage plus 4 (1d4) fire damage."

# Output
✅ Weapon item with +7 attack, 1d8+4 slashing + 1d4 fire damage
🔧 Complexity: 2/4 (generates OnUse macro for multiple damage types)
```

### Save-Based Spell
```bash
# Input  
"Lightning Bolt: DC 15 Dex save, 60-foot line. 28 (8d6) lightning damage, half on save."

# Output
✅ Spell with DC 15 Dex save, 8d6 lightning damage, area template
🔧 Complexity: 1/4 (basic automation with flags only)
```

### Conditional Ability
```bash
# Input
"Bless: Target gains advantage on attack rolls and saves for 1 minute."

# Output  
✅ Feature with advantage flags, duration tracking, concentration
🔧 Complexity: 2/4 (generates macro for effect application)
```

## 🏗️ Architecture

The converter follows a three-phase pipeline:

```
📝 Input Parser → ⚙️ Automation Engine → 📤 Output Generator
```

### Core Components

- **`PatternMatcher`**: Regex-based text analysis with 20+ patterns
- **`TextAnalyzer`**: Converts raw text to structured ability data
- **`RuleEngine`**: Maps parsed data to Foundry automation structures
- **`FlagGenerator`**: Creates MidiQOL compatibility flags
- **`EffectGenerator`**: Builds Active Effects with proper change arrays

## 🔌 Module Compatibility

| Module | Status | Integration |
|--------|--------|-------------|
| **MidiQOL** | ✅ Full | Core automation flags and workflow integration |
| **DAE** | ✅ Full | Active Effects with transfer and duration handling |
| **Chris Premades** | ✅ Compatible | Follows established naming and flag patterns |
| **Gambit's Premades** | ✅ Compatible | Reaction timing and execution point support |
| **Convenient Effects** | ✅ Compatible | Status effect mapping and integration |

## 📂 CLI Commands

### Convert Single Ability
```bash
npm run cli convert "ability text" [name] [--output file.json]
```

### Batch Processing
```bash
npm run cli batch input.txt [--output output.json]
```

**Input file format:**
```
# Ability Name
Description text here

# Another Ability  
More description text
```

### Other Commands
```bash
npm run cli demo          # Run demonstration
npm run cli capabilities  # Show supported patterns
npm run cli help          # Show help message
```

## 🧪 Testing

The project includes comprehensive test cases:

```bash
npm test                  # Run test suite
npm run start            # Run built-in demo
npm run cli demo         # Run CLI demo
```

## 📚 Project Structure

```
src/
├── types/              # TypeScript interfaces and enums
├── parser/             # Text analysis and pattern matching
│   ├── pattern-matcher.ts
│   └── text-analyzer.ts
├── automation/         # Automation generation
│   ├── rule-engine.ts
│   ├── flag-generator.ts
│   └── effect-generator.ts
├── index.ts           # Main converter class
└── cli.ts             # Command line interface

reference/             # Cloned automation module repositories
├── midi-qol/         # Core automation engine
├── chris-premades/   # Professional automation examples  
├── gambits-premades/ # Advanced reaction systems
└── dae/              # Enhanced Active Effects
```

## 🔍 Technical Details

### Pattern Recognition
- **20+ regex patterns** for common D&D ability formats
- **Priority-based matching** ensures most specific patterns win
- **Flexible extraction** handles variations in text formatting

### Automation Generation
- **Type-safe TypeScript** with comprehensive interfaces
- **Foundry schema compliance** ensures valid item generation  
- **Module flag compatibility** follows established patterns
- **Error handling** with graceful degradation

### Output Quality
- **Schema validation** against Foundry VTT requirements
- **MidiQOL integration** with proper timing and workflow
- **Active Effects** with correct change modes and priorities
- **Macro generation** for complex behaviors

## 🤝 Contributing

We welcome contributions! The project follows established patterns from the Foundry VTT automation community.

1. **Fork the repository**
2. **Create a feature branch**
3. **Follow existing code patterns**
4. **Add tests for new functionality**
5. **Submit a pull request**

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with insights from the excellent work of:
- **MidiQOL** by tposney - Core automation framework
- **Chris Premades** by Chris - Professional automation examples
- **Gambit's Premades** by Gambit - Advanced reaction systems  
- **DAE** by tposney - Enhanced Active Effects system
- **Foundry VTT Community** - Automation patterns and best practices

## 📈 Roadmap

### Phase 2 (Planned)
- [ ] Advanced conditional logic parsing
- [ ] Area effect template automation
- [ ] Visual effect integration
- [ ] AI-enhanced text understanding

### Phase 3 (Future)
- [ ] Web-based interface
- [ ] Foundry module packaging
- [ ] Real-time collaboration features
- [ ] Community pattern sharing

---

**Made with ⚡ by the Automancy Project**

Transform your homebrew into professional automation! 🔮