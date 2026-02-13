/**
 * Factory functions for complete, valid Foundry VTT JSON structures.
 * Templates derived from real items in midi-item-showcase-community.
 * Reference: fvtt-Item-agonizing-touch-EL0z1OFJwnKDnCig.json
 */

import { generateFoundryId, MIDI_PROPERTIES_DEFAULTS } from './constants';
import { FoundryItemData, ActiveEffectData } from '../types';

/**
 * Create a complete base Foundry item with all required fields.
 */
export function createBaseItem(name: string, type: FoundryItemData['type'] = 'feat'): FoundryItemData {
  return {
    _id: generateFoundryId(),
    name,
    type,
    img: 'icons/svg/mystery-man.svg',
    system: {
      description: {
        value: '',
        chat: '',
      },
      uses: {
        max: '',
        spent: 0,
        recovery: [],
      },
      requirements: '',
      activities: {},
      advancement: [],
      identifier: '',
      source: {
        revision: 1,
        rules: '2024',
      },
      crewed: false,
      enchant: {},
      prerequisites: {
        items: [],
        repeatable: false,
      },
      properties: [],
      type: {
        value: '',
        subtype: '',
      },
    },
    effects: [],
    flags: {},
    folder: null,
    sort: 0,
    ownership: { default: 0 },
  };
}

export interface ActivityOptions {
  id?: string;
  type: 'attack' | 'save' | 'damage' | 'heal' | 'utility' | 'check';
  activationType?: string;
  activationValue?: number;
}

/**
 * Create a complete base activity with all required fields.
 * Includes midiProperties, macroData, ignoreTraits, overTimeProperties.
 */
export function createBaseActivity(options: ActivityOptions): Record<string, any> {
  const id = options.id || generateFoundryId();
  const activationType = options.activationType || 'action';
  const activationValue = options.activationValue ?? 1;

  const base: Record<string, any> = {
    _id: id,
    type: options.type,
    activation: {
      type: activationType,
      value: activationValue,
      condition: '',
      override: false,
    },
    consumption: {
      targets: [],
      scaling: {
        allowed: false,
        max: '',
      },
      spellSlot: true,
    },
    description: {
      chatFlavor: '',
    },
    duration: {
      concentration: false,
      units: 'inst',
      special: '',
      override: false,
    },
    effects: [],
    range: {
      units: '',
      special: '',
      override: false,
    },
    target: {
      template: {
        count: '',
        contiguous: false,
        type: '',
        size: '',
        width: '',
        height: '',
        units: 'any',
      },
      affects: {
        count: '',
        type: '',
        choice: false,
        special: '',
      },
      prompt: true,
      override: false,
    },
    uses: {
      spent: 0,
      max: '',
      recovery: [],
    },
    sort: 0,
    flags: {},
    visibility: {
      level: {},
      requireAttunement: false,
      requireIdentification: false,
      requireMagic: false,
    },
    useConditionText: '',
    useConditionReason: '',
    effectConditionText: '',
    macroData: {
      name: '',
      command: '',
    },
    ignoreTraits: {
      idi: false,
      idr: false,
      idv: false,
      ida: false,
      idm: false,
    },
    midiProperties: { ...MIDI_PROPERTIES_DEFAULTS },
    isOverTimeFlag: false,
    overTimeProperties: {
      saveRemoves: true,
      preRemoveConditionText: '',
      postRemoveConditionText: '',
    },
    otherActivityId: '',
    otherActivityAsParentType: true,
  };

  // Add type-specific fields
  if (options.type === 'attack') {
    base.attack = {
      ability: '',
      bonus: '',
      critical: {
        threshold: null,
      },
      flat: false,
      type: {
        value: 'melee',
        classification: 'weapon',
      },
    };
    base.damage = {
      critical: {
        bonus: '',
      },
      includeBase: true,
      parts: [],
    };
    base.attackMode = 'oneHanded';
    base.ammunition = '';
    base.otherActivityUuid = '';
    base.attackRollPerTarget = 'default';
    base.fumbleThreshold = 1;
  }

  if (options.type === 'save') {
    base.save = {
      ability: [],
      dc: {
        calculation: '',
        formula: '',
      },
    };
    base.damage = {
      onSave: 'half',
      parts: [],
      critical: {
        allow: false,
      },
    };
    base.friendlySave = 'default';
    base.name = '';
    // Save activities have extended visibility
    base.visibility = {
      level: {
        min: null,
        max: null,
      },
      requireAttunement: false,
      requireIdentification: false,
      requireMagic: false,
      identifier: '',
    };
  }

  if (options.type === 'damage') {
    base.damage = {
      critical: {
        bonus: '',
      },
      includeBase: false,
      parts: [],
    };
  }

  if (options.type === 'heal') {
    base.healing = {
      custom: {
        enabled: false,
        formula: '',
      },
      number: null,
      denomination: null,
      bonus: '',
      types: [],
      scaling: {
        mode: '',
        number: null,
        formula: '',
      },
    };
  }

  return base;
}

/**
 * Create a damage part in the correct Foundry 5e 4.x format.
 */
export function createDamagePart(
  number: number | null,
  denomination: number | null,
  bonus: string,
  types: string[],
  scaling?: { mode?: string; number?: number | null; formula?: string }
): Record<string, any> {
  return {
    number: number,
    denomination: denomination,
    bonus: bonus,
    types: types,
    custom: {
      enabled: false,
      formula: '',
    },
    scaling: {
      mode: scaling?.mode || '',
      number: scaling?.number ?? null,
      formula: scaling?.formula || '',
    },
  };
}

/**
 * Create a complete base Active Effect.
 */
export function createBaseEffect(id: string, name: string): ActiveEffectData {
  return {
    _id: id,
    name,
    img: 'icons/svg/aura.svg',
    changes: [],
    duration: {
      rounds: null,
      turns: null,
      startTime: null,
      seconds: null,
      startRound: null,
      startTurn: null,
      combat: null,
    },
    flags: {
      dae: {
        stackable: 'noneName',
        specialDuration: [],
        macroRepeat: 'none',
        transfer: false,
      },
    },
    statuses: [],
    transfer: false,
    disabled: false,
    type: 'base',
    system: {},
    description: '',
    origin: null,
    tint: '#ffffff',
    sort: 0,
  };
}

/**
 * Create an effect reference for an activity's effects array.
 */
export function createEffectReference(effectId: string, onSave?: boolean): Record<string, any> {
  const ref: Record<string, any> = {
    _id: effectId,
    level: {},
  };
  if (onSave !== undefined) {
    ref.onSave = onSave;
    ref.level = { min: null, max: null };
  }
  return ref;
}
