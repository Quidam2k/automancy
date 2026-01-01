import { Phase2Converter } from './src/phase2-converter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Comprehensive Phase 2 Test with MCDM Owlbear
 * Validates professional-grade automation that requires zero manual work
 */

const phase2Converter = new Phase2Converter();

console.log('🚀 PHASE 2 PROFESSIONAL AUTOMATION TEST');
console.log('======================================');
console.log('Goal: Zero manual enhancement required');
console.log('Target: MCDM Owlbear abilities\n');

// Test abilities from MCDM Owlbear
const testAbilities = {
  deadlyLeap: `Deadly Leap. The owlbear's long jump is up to 30 feet and their high jump is 15 feet, with or without a running start. If the owlbear leaps at least 20 feet toward a target and then hits them with a Bite or Claw attack, the target must succeed on a DC 15 Strength saving throw or be knocked prone.`,
  
  bearHug: `Bear Hug (Recharge 4-6). The owlbear attempts to grab and crush a creature they can see within 5 feet of them. The target must make a DC 15 Dexterity saving throw. On a failed save, the target takes 22 (4d10) bludgeoning damage and is grappled (escape DC 15). On a successful save, the target takes half as much damage and is not grappled. Until this grapple ends, the target is restrained and takes 5 (1d10) bludgeoning damage at the start of each of their turns. The grapple ends when the owlbear uses Bear Hug on another target or makes a Claw attack against another target.`,
  
  hulkingRush: `Hulking Rush. When the owlbear takes damage, they can move up to half their speed without provoking opportunity attacks.`
};

// Professional automation validation criteria
const validationCriteria = {
  professionalGradeThreshold: 8.5, // Out of 10
  requiredSystems: ['condition-engine', 'macro-templates'],
  requiredFlags: ['midi-qol', 'dae', 'chris-premades'],
  zeroManualWorkRequired: true
};

async function runPhase2Test() {
  console.log('📊 TESTING PHASE 2 AUTOMATION SYSTEMS\n');
  
  const results: TestResult[] = [];
  
  for (const [abilityName, abilityText] of Object.entries(testAbilities)) {
    console.log(`🔬 Testing: ${abilityName}`);
    console.log(`Text: ${abilityText.substring(0, 80)}...`);
    console.log('---');
    
    try {
      const result = phase2Converter.convertAbility(abilityText);
      
      if (!result.success) {
        console.log(`❌ Base conversion failed: ${result.error}`);
        results.push({
          ability: abilityName,
          success: false,
          error: result.error,
          professionalGrade: 0
        });
        continue;
      }
      
      if (!result.phase2Enhancement?.applied) {
        console.log(`❌ Phase 2 enhancement failed: ${result.phase2Enhancement?.reason}`);
        results.push({
          ability: abilityName,
          success: false,
          error: result.phase2Enhancement?.reason || 'Enhancement not applied',
          professionalGrade: 0
        });
        continue;
      }
      
      // Validate professional grade
      const grade = result.phase2Enhancement.professionalGrade || 0;
      const systemsApplied = result.phase2Enhancement.automationSystems || [];
      const macrosGenerated = result.phase2Enhancement.macros?.length || 0;
      
      console.log(`✅ Phase 2 Enhancement Applied`);
      console.log(`   - Professional Grade: ${grade}/10`);
      console.log(`   - Automation Systems: ${systemsApplied.join(', ')}`);
      console.log(`   - Macros Generated: ${macrosGenerated}`);
      console.log(`   - Complexity: ${result.phase2Enhancement.complexity}`);
      
      // Detailed validation
      const validation = validateProfessionalAutomation(result, abilityName);
      console.log(`   - Professional Quality: ${validation.isProfessional ? '✅ YES' : '❌ NO'}`);
      
      if (!validation.isProfessional) {
        console.log(`   - Issues: ${validation.issues.join(', ')}`);
      }
      
      results.push({
        ability: abilityName,
        success: true,
        professionalGrade: grade,
        systemsApplied,
        macrosGenerated,
        validation,
        foundryItem: result.foundryItem
      });
      
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      results.push({
        ability: abilityName,
        success: false,
        error: error.message,
        professionalGrade: 0
      });
    }
    
    console.log('');
  }
  
  // Generate comprehensive test report
  await generateTestReport(results);
  
  // Overall assessment
  const overallAssessment = assessOverallQuality(results);
  console.log('🏆 OVERALL PHASE 2 ASSESSMENT');
  console.log('=============================');
  console.log(`Professional Grade Average: ${overallAssessment.averageGrade}/10`);
  console.log(`Success Rate: ${overallAssessment.successRate}%`);
  console.log(`Zero Manual Work Required: ${overallAssessment.zeroManualWork ? '✅ YES' : '❌ NO'}`);
  console.log(`Ready for Production: ${overallAssessment.productionReady ? '✅ YES' : '❌ NO'}`);
  
  if (overallAssessment.productionReady) {
    console.log('\n🎉 PHASE 2 SUCCESS: Professional-grade automation achieved!');
    console.log('No manual enhancement needed for these abilities.');
  } else {
    console.log('\n⚠️  PHASE 2 NEEDS IMPROVEMENT');
    console.log('Some abilities still require manual enhancement.');
  }
  
  return overallAssessment;
}

function validateProfessionalAutomation(result: any, abilityName: string): ValidationResult {
  const issues: string[] = [];
  const flags = result.foundryItem?.flags || {};
  const enhancement = result.phase2Enhancement;
  
  // Check professional grade threshold
  if ((enhancement.professionalGrade || 0) < validationCriteria.professionalGradeThreshold) {
    issues.push(`Grade too low: ${enhancement.professionalGrade}/10`);
  }
  
  // Check required flag categories
  for (const requiredFlag of validationCriteria.requiredFlags) {
    if (!flags[requiredFlag]) {
      issues.push(`Missing ${requiredFlag} flags`);
    }
  }
  
  // Check MidiQOL integration
  const midiFlags = flags['midi-qol'] || {};
  if (Object.keys(midiFlags).length < 2) {
    issues.push('Insufficient MidiQOL integration');
  }
  
  // Check macro generation for complex abilities
  if (abilityName === 'bearHug' && (!enhancement.macros || enhancement.macros.length < 2)) {
    issues.push('Complex ability missing required macros');
  }
  
  // Check reaction automation
  if (abilityName === 'hulkingRush' && !flags['gambits-premades']?.isReaction) {
    issues.push('Reaction ability missing gambits-premades integration');
  }
  
  // Check ongoing effects automation
  if (abilityName === 'bearHug' && !flags.dae?.macroRepeat) {
    issues.push('Ongoing damage missing DAE macro repeat');
  }
  
  // Check condition application
  if ((abilityName === 'deadlyLeap' || abilityName === 'bearHug') && 
      (!enhancement.additionalEffects || enhancement.additionalEffects.length === 0)) {
    issues.push('Missing condition effects automation');
  }
  
  return {
    isProfessional: issues.length === 0,
    issues,
    score: Math.max(0, 10 - issues.length * 2)
  };
}

function assessOverallQuality(results: TestResult[]): OverallAssessment {
  const successfulResults = results.filter(r => r.success);
  const totalGrade = successfulResults.reduce((sum, r) => sum + (r.professionalGrade || 0), 0);
  const averageGrade = successfulResults.length > 0 ? totalGrade / successfulResults.length : 0;
  const successRate = (successfulResults.length / results.length) * 100;
  
  // Check if all abilities meet professional standards
  const allProfessional = successfulResults.every(r => 
    (r.professionalGrade || 0) >= validationCriteria.professionalGradeThreshold
  );
  
  const zeroManualWork = allProfessional && successRate >= 95;
  const productionReady = zeroManualWork && averageGrade >= 8.5;
  
  return {
    averageGrade: Math.round(averageGrade * 10) / 10,
    successRate: Math.round(successRate),
    zeroManualWork,
    productionReady,
    totalTested: results.length,
    successfulConversions: successfulResults.length
  };
}

async function generateTestReport(results: TestResult[]): Promise<void> {
  const report = {
    testRun: {
      timestamp: new Date().toISOString(),
      phase: 2,
      goal: 'Professional-grade automation requiring zero manual work',
      criteria: validationCriteria
    },
    results: results.map(r => ({
      ability: r.ability,
      success: r.success,
      professionalGrade: r.professionalGrade,
      systemsApplied: r.systemsApplied,
      macrosGenerated: r.macrosGenerated,
      validation: r.validation,
      error: r.error
    })),
    summary: assessOverallQuality(results)
  };
  
  const reportPath = path.join(__dirname, 'phase2-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  // Also generate a complete creature package for testing
  if (results.some(r => r.success)) {
    await generateCompleteCreaturePackage(results.filter(r => r.success));
  }
}

async function generateCompleteCreaturePackage(successfulResults: TestResult[]): Promise<void> {
  console.log('\n📦 Generating Complete Creature Package...');
  
  try {
    const creatureResult = phase2Converter.convertCreatureWithPhase2Enhancement(`
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
`);
    
    const packagePath = path.join(__dirname, 'owlbear-phase2-complete.json');
    fs.writeFileSync(packagePath, JSON.stringify(creatureResult, null, 2));
    
    console.log(`✅ Complete creature package saved to: ${packagePath}`);
    console.log(`   - Actor: ${creatureResult.actor.name}`);
    console.log(`   - Items: ${creatureResult.items.length} abilities`);
    console.log(`   - Macros: ${creatureResult.macros.length} professional macros`);
    console.log(`   - Phase 2 Enhanced: ${creatureResult.phase2Metadata.enhancementApplied ? '✅' : '❌'}`);
    console.log(`   - Professional Grade: ${creatureResult.phase2Metadata.professionalGrade ? '✅' : '❌'}`);
    console.log(`   - Zero Manual Work: ${creatureResult.phase2Metadata.requiresNoManualWork ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log(`❌ Failed to generate creature package: ${error.message}`);
  }
}

// Type definitions
interface TestResult {
  ability: string;
  success: boolean;
  professionalGrade?: number;
  systemsApplied?: string[];
  macrosGenerated?: number;
  validation?: ValidationResult;
  foundryItem?: any;
  error?: string;
}

interface ValidationResult {
  isProfessional: boolean;
  issues: string[];
  score: number;
}

interface OverallAssessment {
  averageGrade: number;
  successRate: number;
  zeroManualWork: boolean;
  productionReady: boolean;
  totalTested: number;
  successfulConversions: number;
}

// Run the test
if (require.main === module) {
  runPhase2Test().catch(console.error);
}