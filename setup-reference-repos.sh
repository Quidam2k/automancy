#!/bin/bash
# Clone reference repositories for studying automation patterns
# These are not runtime dependencies - they're for development reference only

set -e

mkdir -p reference
cd reference

echo "Cloning reference repositories..."

# Core automation engine
echo "Cloning midi-qol..."
git clone https://gitlab.com/tposney/midi-qol.git 2>/dev/null || echo "midi-qol already exists"

echo "Cloning dae..."
git clone https://gitlab.com/tposney/dae.git 2>/dev/null || echo "dae already exists"

# Major automation content modules
echo "Cloning chris-premades..."
git clone https://github.com/chrisk123999/chris-premades.git 2>/dev/null || echo "chris-premades already exists"

echo "Cloning gambits-premades..."
git clone https://github.com/gambit07/gambits-premades.git 2>/dev/null || echo "gambits-premades already exists"

# Community automation examples
echo "Cloning midi-item-showcase-community..."
git clone https://github.com/txm3278/midi-item-showcase-community.git 2>/dev/null || echo "midi-item-showcase-community already exists"

echo "Cloning FoundryMacros..."
git clone https://github.com/thatlonelybugbear/FoundryMacros.git 2>/dev/null || echo "FoundryMacros already exists"

echo "Cloning DnD5eAutomatedSpells..."
git clone https://github.com/JamesBrandts/DnD5eAutomatedSpells.git 2>/dev/null || echo "DnD5eAutomatedSpells already exists"

# Additional useful references
echo "Cloning dnd5e..."
git clone https://github.com/foundryvtt/dnd5e.git 2>/dev/null || echo "dnd5e already exists"

echo "Cloning adv-reminder..."
git clone https://github.com/kaelad02/adv-reminder.git 2>/dev/null || echo "adv-reminder already exists"

echo ""
echo "Reference repositories setup complete!"
echo "See repository_reference_guide.md for what to study in each repo."
