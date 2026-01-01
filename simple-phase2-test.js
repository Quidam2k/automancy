const { Phase2Converter } = require('./src/phase2-converter.ts');
const fs = require('fs');

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

async function runSimpleTest() {
  try {
    console.log('Creating Phase 2 converter...');
    const converter = new Phase2Converter();
    
    console.log('\n📊 TESTING PHASE 2 AUTOMATION SYSTEMS\n');
    
    const results = [];
    
    for (const [abilityName, abilityText] of Object.entries(testAbilities)) {
      console.log(`🔬 Testing: ${abilityName}`);
      console.log(`Text: ${abilityText.substring(0, 80)}...`);
      console.log('---');
      
      try {
        const result = converter.convertAbility(abilityText);
        
        console.log('Conversion result keys:', Object.keys(result || {}));
        
        if (result && result.success) {
          console.log(`✅ Base conversion successful`);
          
          if (result.phase2Enhancement && result.phase2Enhancement.applied) {
            const grade = result.phase2Enhancement.professionalGrade || 0;
            const systems = result.phase2Enhancement.automationSystems || [];
            const macros = result.phase2Enhancement.macros?.length || 0;
            
            console.log(`✅ Phase 2 Enhancement Applied`);
            console.log(`   - Professional Grade: ${grade}/10`);
            console.log(`   - Automation Systems: ${systems.join(', ')}`);
            console.log(`   - Macros Generated: ${macros}`);
            
            results.push({
              ability: abilityName,
              success: true,
              grade: grade,
              systems: systems,
              macros: macros
            });
          } else {
            console.log(`❌ Phase 2 enhancement not applied`);
            console.log(`   Reason: ${result.phase2Enhancement?.reason || 'Unknown'}`);
            
            results.push({
              ability: abilityName,
              success: false,
              reason: result.phase2Enhancement?.reason
            });
          }
        } else {
          console.log(`❌ Base conversion failed`);
          console.log(`   Error: ${result?.error || 'Unknown error'}`);
          
          results.push({
            ability: abilityName,
            success: false,
            error: result?.error
          });
        }
        
      } catch (error) {
        console.log(`❌ Test failed with error: ${error.message}`);
        results.push({
          ability: abilityName,
          success: false,
          error: error.message
        });
      }
      
      console.log('');
    }
    
    // Overall assessment
    const successful = results.filter(r => r.success);
    const totalGrade = successful.reduce((sum, r) => sum + (r.grade || 0), 0);
    const averageGrade = successful.length > 0 ? totalGrade / successful.length : 0;
    const successRate = (successful.length / results.length) * 100;
    
    console.log('🏆 OVERALL PHASE 2 ASSESSMENT');
    console.log('=============================');
    console.log(`Success Rate: ${Math.round(successRate)}%`);
    console.log(`Professional Grade Average: ${Math.round(averageGrade * 10) / 10}/10`);
    console.log(`Zero Manual Work: ${averageGrade >= 8.5 && successRate >= 95 ? '✅ YES' : '❌ NO'}`);
    console.log(`Production Ready: ${averageGrade >= 8.5 && successRate >= 95 ? '✅ YES' : '❌ NO'}`);
    
    // Save results
    const reportPath = './phase2-test-results.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: results,
      summary: {
        successRate: Math.round(successRate),
        averageGrade: Math.round(averageGrade * 10) / 10,
        zeroManualWork: averageGrade >= 8.5 && successRate >= 95,
        productionReady: averageGrade >= 8.5 && successRate >= 95
      }
    }, null, 2));
    
    console.log(`\n📄 Results saved to: ${reportPath}`);
    
    if (averageGrade >= 8.5 && successRate >= 95) {
      console.log('\n🎉 PHASE 2 SUCCESS: Professional-grade automation achieved!');
      console.log('No manual enhancement needed for these abilities.');
    } else {
      console.log('\n⚠️  PHASE 2 NEEDS IMPROVEMENT');
      console.log('Some abilities still require manual enhancement.');
    }
    
  } catch (error) {
    console.error('Test setup failed:', error);
  }
}

// Run the test
runSimpleTest().catch(console.error);