import { ParsedAbility, ActiveEffectData, ChangeData, FoundryItemData } from '../types';

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
 * Professional-grade condition application engine
 * Based on analysis of chris-premades and gambits-premades patterns
 */
export class ConditionEngine {

  /**
   * Apply conditions automatically based on ability text analysis
   */
  public generateConditionEffects(ability: ParsedAbility): {
    effects: ActiveEffectData[];
    macros: string[];
    flags: Record<string, any>;
  } {
    const effects: ActiveEffectData[] = [];
    const macros: string[] = [];
    const flags: Record<string, any> = {};

    // Analyze ability text for condition keywords
    const conditionAnalysis = this.analyzeConditionText(ability.raw);
    
    // Generate prone condition for abilities like Deadly Leap
    if (conditionAnalysis.prone) {
      const proneEffect = this.generateProneEffect(ability, conditionAnalysis.prone);
      effects.push(proneEffect);
      flags['applyProneOnFailedSave'] = true;
    }

    // Generate grapple effects for abilities like Bear Hug
    if (conditionAnalysis.grapple) {
      const grappleEffects = this.generateGrappleEffects(ability, conditionAnalysis.grapple);
      effects.push(...grappleEffects);
      macros.push(this.generateGrappleMacro(ability, conditionAnalysis.grapple));
      flags['complexGrappleLogic'] = true;
    }

    // Generate ongoing damage for persistent effects
    if (conditionAnalysis.ongoingDamage) {
      const ongoingEffect = this.generateOngoingDamageEffect(ability, conditionAnalysis.ongoingDamage);
      effects.push(ongoingEffect);
      macros.push(this.generateOngoingDamageMacro(ability, conditionAnalysis.ongoingDamage));
    }

    // Generate MCDM dazed condition effects
    if (conditionAnalysis.dazed) {
      const dazedEffect = this.generateDazedEffect(ability, conditionAnalysis.dazed);
      effects.push(dazedEffect);
      if (conditionAnalysis.dazed.saveEnds) {
        macros.push(this.generateDazedSaveEndsMacro(ability, conditionAnalysis.dazed));
      }
      flags['mcdmDazed'] = true;
      flags['dazedSaveEnds'] = conditionAnalysis.dazed.saveEnds;
    }

    return { effects, macros, flags };
  }

  private analyzeConditionText(text: string): ConditionAnalysis {
    const analysis: ConditionAnalysis = {};

    // Prone detection
    if (text.match(/knocked prone|falls? prone|prone/i)) {
      analysis.prone = {
        trigger: 'save_failure',
        saveType: this.extractSaveType(text) || 'str'
      };
    }

    // Grapple detection with escape DC
    const grappleMatch = text.match(/grappled.*escape DC (\d+)/i);
    if (grappleMatch) {
      analysis.grapple = {
        escapeDC: parseInt(grappleMatch[1]),
        restrained: text.includes('restrained'),
        ongoingDamage: this.extractOngoingDamage(text) || undefined
      };
    }

    // Ongoing damage detection
    const ongoingMatch = text.match(/takes? (\d+) \(([^)]+)\) (\w+) damage at the start of (?:each of )?their turns?/i);
    if (ongoingMatch) {
      analysis.ongoingDamage = {
        formula: ongoingMatch[2],
        type: ongoingMatch[3].toLowerCase(),
        timing: 'start_of_turn'
      };
    }

    // MCDM Dazed condition detection (can only take action, bonus action, OR move - not all)
    if (text.match(/\bdazed\b/i)) {
      const dcMatch = text.match(/DC (\d+) (\w+)/i);
      const saveEndsMatch = text.match(/save ends(?: at (?:the )?end of (?:their )?turn)?/i);
      const saveEndsStartMatch = text.match(/save ends at (?:the )?(?:start|beginning) of (?:their )?turn/i);

      // Detect HP max reduction on failed saves
      const hpMaxReductionMatch = text.match(/hit point maximum (?:is )?halved|maximum (?:hit points?|hp) (?:is )?halved/i);
      const cumulativeMatch = text.match(/cumulative/i);
      const restRecoveryMatch = text.match(/(?:lasts?|reduction lasts?) until.*?(?:short|long) rest/i);

      analysis.dazed = {
        trigger: dcMatch ? 'save_failure' : 'automatic',
        saveType: dcMatch ? dcMatch[2].toLowerCase().slice(0, 3) : 'wis',
        saveDC: dcMatch ? parseInt(dcMatch[1]) : 10,
        saveEnds: !!saveEndsMatch || !!saveEndsStartMatch,
        saveEndsTiming: saveEndsStartMatch ? 'start_of_turn' : 'end_of_turn',
        hpMaxReductionOnFail: !!hpMaxReductionMatch,
        hpMaxReductionCumulative: !!cumulativeMatch,
        hpMaxRecovery: restRecoveryMatch ? 'short_or_long_rest' : undefined
      };
    }

    return analysis;
  }

  private generateProneEffect(ability: ParsedAbility, proneData: ProneCondition): ActiveEffectData {
    return {
      _id: generateFoundryId(),
      name: `${ability.name} - Prone`,
      img: "systems/dnd5e/icons/conditions/prone.svg",
      changes: [
        {
          key: "flags.midi-qol.disadvantage.attack.all",
          mode: 5, // OVERRIDE
          value: "1",
          priority: 20
        },
        {
          key: "flags.midi-qol.grants.advantage.attack.mwak",
          mode: 5, // OVERRIDE  
          value: "1",
          priority: 20
        },
        {
          key: "system.attributes.movement.walk",
          mode: 5, // OVERRIDE
          value: "0",
          priority: 20
        }
      ],
      duration: {
        seconds: null, // Until manually removed
        rounds: null
      },
      flags: {
        dae: {
          stackable: "noneName",
          specialDuration: ["turnStart"] // Removed at start of creature's turn
        },
        "chris-premades": {
          condition: true,
          conditionType: "prone"
        },
        automancy: {
          generated: true,
          triggerType: proneData.trigger,
          saveType: proneData.saveType
        }
      },
      statuses: ["prone"],
      transfer: false,
      disabled: false
    };
  }

  private generateGrappleEffects(ability: ParsedAbility, grappleData: GrappleCondition): ActiveEffectData[] {
    const effects: ActiveEffectData[] = [];

    // Main grapple effect on target
    const grappleEffect: ActiveEffectData = {
      _id: generateFoundryId(),
      name: `${ability.name} - Grappled`,
      img: "systems/dnd5e/icons/conditions/grappled.svg",
      changes: [
        {
          key: "system.attributes.movement.walk",
          mode: 5, // OVERRIDE
          value: "0",
          priority: 20
        },
        {
          key: "flags.midi-qol.disadvantage.attack.all",
          mode: 5, // OVERRIDE
          value: grappleData.restrained ? "1" : "0",
          priority: 20
        }
      ],
      duration: {
        seconds: null // Maintained until escaped or grappler acts differently
      },
      flags: {
        dae: {
          stackable: "noneName",
          macroRepeat: "startEveryTurn" // Check for ongoing damage
        },
        "chris-premades": {
          condition: true,
          conditionType: "grappled",
          escapeDC: grappleData.escapeDC,
          sourceAbility: ability.name
        },
        automancy: {
          generated: true,
          escapeDC: grappleData.escapeDC,
          hasOngoingDamage: !!grappleData.ongoingDamage,
          restrained: grappleData.restrained
        }
      },
      statuses: grappleData.restrained ? ["grappled", "restrained"] : ["grappled"],
      transfer: false,
      disabled: false
    };

    effects.push(grappleEffect);

    // If restrained, add additional restrictions
    if (grappleData.restrained) {
      const restrainedEffect: ActiveEffectData = {
        _id: generateFoundryId(),
        name: `${ability.name} - Restrained`,
        img: "systems/dnd5e/icons/conditions/restrained.svg",
        changes: [
          {
            key: "flags.midi-qol.disadvantage.attack.all",
            mode: 5, // OVERRIDE
            value: "1",
            priority: 20
          },
          {
            key: "flags.midi-qol.disadvantage.ability.save.dex",
            mode: 5, // OVERRIDE
            value: "1", 
            priority: 20
          },
          {
            key: "flags.midi-qol.grants.advantage.attack.all",
            mode: 5, // OVERRIDE
            value: "1",
            priority: 20
          }
        ],
        duration: {
          seconds: null
        },
        flags: {
          dae: {
            stackable: "noneName"
          },
          automancy: {
            generated: true,
            linkedToGrapple: true
          }
        },
        statuses: ["restrained"],
        transfer: false,
        disabled: false
      };

      effects.push(restrainedEffect);
    }

    return effects;
  }

  private generateOngoingDamageEffect(ability: ParsedAbility, damageData: OngoingDamageCondition): ActiveEffectData {
    return {
      _id: generateFoundryId(),
      name: `${ability.name} - Ongoing Damage`,
      img: "systems/dnd5e/icons/spells/debuff-red-1.jpg",
      changes: [], // No direct changes, handled by macro
      duration: {
        seconds: null // Linked to parent grapple effect
      },
      flags: {
        dae: {
          macroRepeat: "startEveryTurn",
          stackable: "noneName"
        },
        "chris-premades": {
          ongoingDamage: true,
          damageFormula: damageData.formula,
          damageType: damageData.type
        },
        automancy: {
          generated: true,
          ongoingDamage: damageData,
          executionTiming: damageData.timing
        }
      },
      statuses: [],
      transfer: false,
      disabled: false
    };
  }

  /**
   * Generate MCDM Dazed condition effect
   * Dazed: Can only take an action, bonus action, OR move - not all three
   */
  private generateDazedEffect(ability: ParsedAbility, dazedData: DazedCondition): ActiveEffectData {
    return {
      _id: generateFoundryId(),
      name: `${ability.name} - Dazed`,
      img: "icons/svg/daze.svg",
      changes: [
        // Flag to indicate dazed state for action economy enforcement
        {
          key: "flags.midi-qol.dazed",
          mode: 5, // OVERRIDE
          value: "1",
          priority: 20
        },
        // Visual indicator - can use with token effects module
        {
          key: "macro.tokenMagic",
          mode: 0, // CUSTOM
          value: "blur",
          priority: 20
        }
      ],
      duration: dazedData.saveEnds ? {
        rounds: 100, // Long duration, removed by save
        turns: 0
      } : {
        seconds: null
      },
      flags: {
        dae: {
          stackable: "noneName",
          specialDuration: dazedData.saveEnds && dazedData.saveEndsTiming === 'end_of_turn'
            ? ["turnEndSource"]
            : dazedData.saveEnds ? ["turnStart"] : [],
          macroRepeat: dazedData.saveEnds ? "endEveryTurn" : "none"
        },
        "chris-premades": {
          condition: true,
          conditionType: "dazed",
          customCondition: true
        },
        "convenient-effects": {
          isCustom: true,
          description: "Dazed: Can only take an action, a bonus action, OR move on your turn - not all three."
        },
        automancy: {
          generated: true,
          mcdmCondition: true,
          conditionType: "dazed",
          saveEnds: dazedData.saveEnds,
          saveEndsTiming: dazedData.saveEndsTiming,
          saveDC: dazedData.saveDC,
          saveType: dazedData.saveType,
          description: "Can only take an action, bonus action, OR move - not all three."
        }
      },
      statuses: ["dazed"],
      transfer: false,
      disabled: false
    };
  }

  /**
   * Generate macro for "save ends at end of turn" for dazed condition
   */
  private generateDazedSaveEndsMacro(ability: ParsedAbility, dazedData: DazedCondition): string {
    const timing = dazedData.saveEndsTiming === 'end_of_turn' ? 'end' : 'start';
    return `
// MCDM Dazed Save-Ends Automation for ${ability.name}
// Executes at ${timing} of each turn to allow saving throw
// Generated by Automancy Phase 2

const macroPass = args[0]?.macroPass ?? args[0];
if (macroPass !== "isDamaged" && macroPass !== "on") return;

const actor = args[0]?.actor ?? canvas.tokens.controlled[0]?.actor;
if (!actor) return;

try {
  // Find the dazed effect from this ability
  const dazedEffect = actor.effects.find(e =>
    e.name === "${ability.name} - Dazed" &&
    e.flags?.automancy?.conditionType === "dazed"
  );

  if (!dazedEffect) {
    console.log("No dazed effect found from ${ability.name}");
    return;
  }

  // Prompt for saving throw
  const saveType = "${dazedData.saveType}";
  const saveDC = ${dazedData.saveDC};

  // Show dialog to confirm save attempt
  const proceed = await Dialog.confirm({
    title: "Dazed - Saving Throw",
    content: \`<p>You are <strong>Dazed</strong> by ${ability.name}.</p>
              <p>Make a DC \${saveDC} \${saveType.toUpperCase()} saving throw to end the effect?</p>
              <p><em>Dazed: You can only take an action, bonus action, OR move on your turn - not all three.</em></p>\`,
    yes: () => true,
    no: () => false,
    defaultYes: true
  });

  if (!proceed) return;

  // Roll the saving throw
  const saveRoll = await actor.rollAbilitySave(saveType, {
    targetValue: saveDC,
    fastForward: false,
    chatMessage: true,
    messageData: {
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: \`${ability.name} - Dazed (Save Ends)\`
    }
  });

  if (saveRoll.total >= saveDC) {
    // Success - remove the dazed effect
    await dazedEffect.delete();

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: \`<strong>\${actor.name}</strong> shakes off the dazed condition from ${ability.name}!\`,
      type: CONST.CHAT_MESSAGE_TYPES.EMOTE
    });

    console.log(\`\${actor.name} saved against dazed from ${ability.name}\`);
  } else {
    // Failure - effect continues
    let hpMaxMessage = "";
${dazedData.hpMaxReductionOnFail ? `
    // Apply HP max reduction on failed save
    const currentHpMax = actor.system.attributes.hp.max;
    const currentEffectiveMax = actor.system.attributes.hp.effectiveMax ?? currentHpMax;

    // Find existing HP reduction effect or create tracking
    let reductionEffect = actor.effects.find(e =>
      e.name === "${ability.name} - HP Max Reduction" &&
      e.flags?.automancy?.hpMaxReduction
    );

    let reductionCount = reductionEffect?.flags?.automancy?.reductionCount ?? 0;
    reductionCount++;

    // Calculate new HP max (halved cumulatively)
    const reductionMultiplier = Math.pow(0.5, reductionCount);
    const newHpMax = Math.floor(currentHpMax * reductionMultiplier);
    const totalReduction = currentHpMax - newHpMax;

    // Create or update the HP reduction effect
    const hpReductionEffectData = {
      name: "${ability.name} - HP Max Reduction",
      img: "icons/svg/downgrade.svg",
      changes: [
        {
          key: "system.attributes.hp.max",
          mode: 2, // ADD
          value: String(-totalReduction),
          priority: 20
        }
      ],
      duration: { seconds: null },
      flags: {
        dae: {
          stackable: "noneName",
          specialDuration: ["shortRest", "longRest"]
        },
        automancy: {
          generated: true,
          hpMaxReduction: true,
          reductionCount: reductionCount,
          originalHpMax: currentHpMax,
          currentReduction: totalReduction,
          sourceAbility: "${ability.name}",
          recoversOn: "short_or_long_rest"
        }
      }
    };

    if (reductionEffect) {
      // Update existing effect
      await reductionEffect.update({
        changes: hpReductionEffectData.changes,
        "flags.automancy.reductionCount": reductionCount,
        "flags.automancy.currentReduction": totalReduction
      });
    } else {
      // Create new effect
      await actor.createEmbeddedDocuments("ActiveEffect", [hpReductionEffectData]);
    }

    // If current HP exceeds new max, reduce it
    if (actor.system.attributes.hp.value > newHpMax) {
      await actor.update({ "system.attributes.hp.value": newHpMax });
    }

    hpMaxMessage = \` Their hit point maximum is now \${newHpMax} (halved \${reductionCount} time\${reductionCount > 1 ? 's' : ''})!\`;
    console.log(\`Applied HP max reduction to \${actor.name}: \${currentHpMax} -> \${newHpMax} (reduction #\${reductionCount})\`);
` : ''}
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: \`<strong>\${actor.name}</strong> remains dazed by ${ability.name}. (Rolled \${saveRoll.total} vs DC \${saveDC})\${hpMaxMessage}\`,
      type: CONST.CHAT_MESSAGE_TYPES.EMOTE
    });

    console.log(\`\${actor.name} failed save against dazed, effect continues\`);
  }

} catch (error) {
  console.error("Dazed save-ends automation failed:", error);
  ui.notifications.error("Dazed save automation failed - see console for details");
}
`;
  }

  private generateGrappleMacro(ability: ParsedAbility, grappleData: GrappleCondition): string {
    return `
// Professional Grapple Automation for ${ability.name}
// Generated by Automancy Phase 2

if (args[0].macroPass !== "postSave") return;

const { workflow, failedSaves, saves } = args[0];
if (!workflow || !failedSaves) return;

for (const target of failedSaves) {
  try {
    // Apply grapple condition with professional error handling
    const grappleEffectData = {
      name: "${ability.name} - Grappled",
      img: "systems/dnd5e/icons/conditions/grappled.svg",
      origin: workflow.item.uuid,
      duration: { seconds: null },
      changes: [
        { key: "system.attributes.movement.walk", mode: 5, value: "0", priority: 20 }
      ],
      flags: {
        "chris-premades": {
          condition: true,
          escapeDC: ${grappleData.escapeDC},
          sourceToken: workflow.token.uuid
        },
        dae: { stackable: "noneName" }
      },
      statuses: ["grappled"]
    };

    // Apply with socket for GM execution
    await MidiQOL.socket().executeAsGM("createEffects", {
      actorUuid: target.actor.uuid,
      effects: [grappleEffectData]
    });

    // Add escape action to target
    const escapeActionData = {
      name: "Escape Grapple (${ability.name})",
      type: "feat",
      system: {
        activation: { type: "action", cost: 1 },
        actionType: "abil",
        ability: "str", // Can use STR or DEX
        save: { ability: "str", dc: ${grappleData.escapeDC}, scaling: "flat" }
      },
      flags: {
        automancy: { temporaryEscapeAction: true, sourceEffect: grappleEffectData.name }
      }
    };

    await target.actor.createEmbeddedDocuments("Item", [escapeActionData]);
    
    console.log(\`Applied grapple to \${target.name} with escape DC ${grappleData.escapeDC}\`);
    
  } catch (error) {
    console.error(\`Failed to apply grapple to \${target.name}:\`, error);
    ui.notifications.error(\`Grapple automation failed for \${target.name}\`);
  }
}
`;
  }

  private generateOngoingDamageMacro(ability: ParsedAbility, damageData: OngoingDamageCondition): string {
    return `
// Ongoing Damage Automation for ${ability.name}
// Executes at start of each turn while grappled

if (args[0] !== "on" && !args[0].macroPass) return;

const { actor, token } = args[0];
if (!actor || !token) return;

try {
  // Check if still grappled by this ability
  const grappleEffect = actor.effects.find(e => 
    e.name.includes("${ability.name}") && e.name.includes("Grappled")
  );
  
  if (!grappleEffect) {
    console.log("Grapple ended, removing ongoing damage");
    return;
  }

  // Roll ongoing damage
  const damageRoll = await new Roll("${damageData.formula}").evaluate({ async: true });
  
  // Apply damage using MidiQOL damage workflow
  await new MidiQOL.DamageOnlyWorkflow(
    actor, // Source actor (the grappler)
    token, // Target token (the grappled)
    damageRoll.total,
    "${damageData.type}",
    [token],
    damageRoll,
    {
      flavor: "${ability.name} - Ongoing ${damageData.type.charAt(0).toUpperCase() + damageData.type.slice(1)} Damage",
      itemCardId: "ongoing-damage"
    }
  );
  
  console.log(\`Applied \${damageRoll.total} ongoing ${damageData.type} damage to \${token.name}\`);
  
} catch (error) {
  console.error("Ongoing damage automation failed:", error);
}
`;
  }

  private extractSaveType(text: string): string | null {
    const saveMatch = text.match(/DC \d+ (\w+) (?:saving throw|save)/i);
    return saveMatch ? saveMatch[1].toLowerCase().slice(0, 3) : null;
  }

  private extractOngoingDamage(text: string): OngoingDamageCondition | null {
    const match = text.match(/takes? (\d+) \(([^)]+)\) (\w+) damage at the start/i);
    if (match) {
      return {
        formula: match[2],
        type: match[3].toLowerCase(),
        timing: 'start_of_turn'
      };
    }
    return null;
  }
}

// Type definitions for condition analysis
interface ConditionAnalysis {
  prone?: ProneCondition;
  grapple?: GrappleCondition;
  ongoingDamage?: OngoingDamageCondition;
  dazed?: DazedCondition;
}

interface ProneCondition {
  trigger: 'save_failure' | 'automatic';
  saveType: string;
}

interface GrappleCondition {
  escapeDC: number;
  restrained: boolean;
  ongoingDamage?: OngoingDamageCondition;
  dazed?: DazedCondition;
}

interface OngoingDamageCondition {
  formula: string;
  type: string;
  timing: 'start_of_turn' | 'end_of_turn';
}
interface DazedCondition {
  trigger: 'save_failure' | 'automatic';
  saveType: string;
  saveDC: number;
  saveEnds: boolean;
  saveEndsTiming: 'start_of_turn' | 'end_of_turn';
  hpMaxReductionOnFail?: boolean;
  hpMaxReductionCumulative?: boolean;
  hpMaxRecovery?: 'short_or_long_rest' | 'long_rest';
}
