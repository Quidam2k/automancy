# Adds MidiQOL/DAE automation to the remaining MCDM / homebrew monster exports.
# Re-runnable from input/: reads input/<export>.json, writes output/<slug>-automated.json.
# Foundry v13.351 / dnd5e 5.3.x. Conventions verified against midi-qol 13.0.63 source.
import json
import os
import re

IN = "input"
OUT = "output"

# ---------------------------------------------------------------------------
# Shared macros
# ---------------------------------------------------------------------------

# Necrotic HP-max drain + self-heal (Vampire Bite, Count Rhodar Sanguinus).
# Reduces the target's HP maximum by the necrotic damage taken; attacker heals
# the same amount. Mirrors the known-good vampire-spawn Bite macro.
NECROTIC_DRAIN_MACRO = r"""if (args[0].macroPass !== "postActiveEffects") return;
const workflow = args[0].workflow ?? MidiQOL.Workflow.getWorkflow(args[0].uuid);
if (!workflow) return;
const target = workflow.hitTargets?.first();
if (!target) return;

// Sum the necrotic damage actually applied to the target
let necrotic = 0;
const entry = workflow.damageList?.find(d => d.actorUuid === target.actor.uuid);
const details = (entry?.damageDetail ?? workflow.damageDetail ?? []).flat(Infinity);
for (const d of details) {
  if (d?.type === "necrotic") necrotic += Number(d.value ?? d.damage ?? 0);
}
necrotic = Math.max(0, Math.floor(necrotic));
if (!necrotic) return;

const effectData = {
  name: `HP Max Reduced by ${necrotic} (${workflow.item.name})`,
  img: "icons/svg/blood.svg",
  origin: workflow.item.uuid,
  changes: [{ key: "system.attributes.hp.tempmax", mode: 2, value: `-${necrotic}`, priority: 20 }],
  flags: { dae: { stackable: "multi", specialDuration: ["longRest"] } }
};
await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: target.actor.uuid, effects: [effectData] });

await workflow.actor.applyDamage([{ value: necrotic, type: "healing" }]);

const newMax = (target.actor.system.attributes.hp.max ?? 0) - necrotic;
let msg = `<p><strong>${target.name}</strong>'s hit point maximum is reduced by ${necrotic} (until they finish a long rest). <strong>${workflow.actor.name}</strong> regains ${necrotic} hit points.</p>`;
if (target.actor.system.attributes.hp.value > Math.max(newMax, 0)) {
  await target.actor.update({ "system.attributes.hp.value": Math.max(newMax, 0) });
}
if (newMax <= 0) {
  msg += `<p><strong>${target.name} dies &mdash; their hit point maximum has been reduced to 0.</strong></p>`;
  await target.actor.toggleStatusEffect("dead", { active: true, overlay: true });
}
ChatMessage.create({ content: msg, speaker: ChatMessage.getSpeaker({ actor: workflow.actor }) });"""

# Wight Vitality Theft: heal half the damage dealt + disadvantage on the
# target's attacks against anyone other than the wight, until the wight's
# next turn. The wight's uuid is baked into the condition at runtime.
VITALITY_THEFT_MACRO = r"""if (args[0].macroPass !== "postActiveEffects") return;
const workflow = args[0].workflow ?? MidiQOL.Workflow.getWorkflow(args[0].uuid);
if (!workflow) return;
const target = workflow.hitTargets?.first();
if (!target) return;

let dealt = 0;
const dl = workflow.damageList?.find(d => d.actorUuid === target.actor.uuid || d.targetUuid === target.document.uuid);
dealt = Math.max(0, Math.floor(Number(dl?.appliedDamage ?? dl?.hpDamage ?? workflow.damageTotal ?? 0)));
const heal = Math.floor(dealt / 2);
if (heal > 0) await workflow.actor.applyDamage([{ value: heal, type: "healing" }]);

const wightUuid = workflow.actor.uuid;
const effectData = {
  name: "Vitality Drained (disadvantage vs others)",
  img: "icons/svg/downgrade.svg",
  origin: workflow.item.uuid,
  duration: { turns: 1 },
  changes: [{ key: "flags.midi-qol.disadvantage.attack.all", mode: 0,
              value: `targetActorUuid !== "${wightUuid}"`, priority: 20 }],
  description: "<p>Disadvantage on attack rolls against any creature other than the wight, until the start of the wight's next turn.</p>",
  flags: { dae: { specialDuration: ["turnStartSource"] } }
};
await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: target.actor.uuid, effects: [effectData] });

ChatMessage.create({
  content: `<p><strong>${workflow.actor.name}</strong> drains <strong>${target.name}</strong>, regaining ${heal} hit points. ${target.name} has disadvantage on attacks against creatures other than ${workflow.actor.name} until the start of ${workflow.actor.name}'s next turn.</p>`,
  speaker: ChatMessage.getSpeaker({ actor: workflow.actor })
});"""

# Shade Minion (MCDM): runs as a TargetOnUse [preTargetDamageApplication] macro
# on the shade when it is about to take damage.
#  - damage from an attack OR a failed save -> HP reduced to 0 (dies)
#  - damage from anything else -> dies if total >= HP max, otherwise no damage
MINION_MACRO = r"""if (args[0].macroPass !== "preTargetDamageApplication") return;
const workflow = args[0].workflow ?? MidiQOL.Workflow.getWorkflow(args[0].uuid);
const di = args[0].damageItem;
if (!workflow || !di) return;

const token = canvas.tokens.get(di.tokenId) ?? canvas.tokens.placeables.find(t => t.actor?.uuid === di.actorUuid);
const actor = token?.actor;
if (!actor) return;

const fromAttack = !!workflow.activity?.attack && (workflow.hitTargets?.has(token) || workflow.hitTargetsEC?.has(token));
const failedSave = !!workflow.activityHasSave && Array.from(workflow.failedSaves ?? []).some(t => t.actor?.uuid === di.actorUuid);

const setHP = (hp) => {
  const oldHP = di.oldHP ?? actor.system.attributes.hp.value;
  di.newHP = hp;
  di.hpDamage = oldHP - hp;
  di.totalDamage = di.hpDamage;
  di.appliedDamage = di.hpDamage;
  di.newTempHP = 0;
};

if (fromAttack || failedSave) {
  setHP(0);  // minion drops to 0 from any attack or failed save
} else {
  const max = actor.system.attributes.hp.max ?? 0;
  const incoming = Math.abs(Number(di.totalDamage ?? di.hpDamage ?? 0));
  if (incoming >= max) setHP(0); else setHP(di.oldHP ?? actor.system.attributes.hp.value);
}"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def items_by_prefix(data):
    return data["items"]


def find(data, prefix):
    for it in data["items"]:
        if it["name"].lower().startswith(prefix.lower()):
            return it
    raise KeyError(prefix)


def first_activity(item):
    acts = item.get("system", {}).get("activities", {})
    if not acts:
        return None
    return next(iter(acts.values()))


def attach_drain_macro(item, label):
    """Wire the necrotic-drain ItemMacro to a weapon item."""
    item.setdefault("flags", {})
    item["flags"]["midi-qol"] = {"onUseMacroName": "[postActiveEffects]ItemMacro"}
    item["flags"]["dae"] = {"macro": {
        "name": label, "img": item.get("img"), "type": "script",
        "scope": "global", "command": NECROTIC_DRAIN_MACRO,
    }}


def status_effect(eid, name, img, statuses, changes, description, transfer=False, stackable="noneName"):
    return {
        "_id": eid, "name": name, "img": img, "changes": changes,
        "disabled": False, "duration": {}, "description": description,
        "origin": None, "transfer": transfer, "statuses": statuses,
        "flags": {"dae": {"stackable": stackable}},
    }


# ---------------------------------------------------------------------------
# Per-monster automation
# ---------------------------------------------------------------------------

def automate_vampire_mcdm(data):
    notes = []
    # Radiant Aversion -- transfer effect, +10 radiant damage taken
    ra = find(data, "Radiant Aversion")
    ra["img"] = "icons/svg/sun.svg"
    ra["effects"] = [{
        "_id": "VampRadiantAv001", "name": "Radiant Aversion", "img": "icons/svg/sun.svg",
        "changes": [{"key": "system.traits.dm.amount.radiant", "mode": 5, "value": "10", "priority": 20}],
        "disabled": False, "duration": {},
        "description": "<p>Each time the vampire takes radiant damage, they take an extra 10 radiant damage.</p>",
        "origin": None, "transfer": True, "statuses": [], "flags": {},
    }]
    notes.append("Radiant Aversion: transfer +10 radiant taken")

    # Claw -- grapple (escape DC 18) + restrained, gated to Large or smaller
    claw = find(data, "Claw")
    claw["img"] = "icons/svg/net.svg"
    claw["effects"] = [status_effect(
        "VampClawGrap0001", "Grappled by Vampire (Escape DC 18)", "icons/svg/net.svg",
        ["grappled", "restrained"],
        [{"key": "system.attributes.movement.all", "mode": 0, "value": "0", "priority": 20}],
        "<p>Grappled (escape DC 18) and restrained by the vampire. The vampire can have only one "
        "target grappled this way at a time. Moving while grappling a Medium or smaller creature "
        "doesn't halve the vampire's speed.</p>")]
    ca = first_activity(claw)
    ca["effects"] = [{"_id": "VampClawGrap0001"}]
    ca["effectConditionText"] = "['tiny','sm','med','lg'].includes(target?.system?.traits?.size)"
    notes.append("Claw: grapple DC18 + restrained, size<=Large gate")

    # Bite -- use-gate + necrotic HP-max drain / self-heal
    bite = find(data, "Bite")
    bite["img"] = "icons/svg/blood.svg"
    ba = first_activity(bite)
    ba["useConditionText"] = ("!!target && (target.statuses?.has('grappled') || "
                              "target.statuses?.has('incapacitated') || target.statuses?.has('restrained'))")
    ba["useConditionReason"] = ("Bite can only target a creature that is grappled by the vampire, "
                                "incapacitated, or restrained.")
    attach_drain_macro(bite, "Bite")
    notes.append("Bite: use-gate (grappled/incap/restrained) + necrotic HP-max drain & self-heal")

    notes.append("MANUAL: Turn Resistance, Resting Place, Exsanguinating Mist, Run My Child, Lair (narrative/reaction)")
    return notes


def automate_wight(data):
    notes = []
    vt = find(data, "Vitality Theft")
    vt["img"] = "icons/svg/blood.svg"
    vt.setdefault("flags", {})
    vt["flags"]["midi-qol"] = {"onUseMacroName": "[postActiveEffects]ItemMacro"}
    vt["flags"]["dae"] = {"macro": {
        "name": "Vitality Theft", "img": "icons/svg/blood.svg", "type": "script",
        "scope": "global", "command": VITALITY_THEFT_MACRO}}
    notes.append("Vitality Theft: self-heal half damage + 1-round disadvantage vs non-wight targets")
    notes.append("Longsword / Heavy Crossbow: plain attacks (already correct)")
    notes.append("MANUAL: Decaying Guard (reaction redirect)")
    return notes


def automate_devil_magistrate(data):
    notes = []
    knife = find(data, "Infernal Knife")
    knife["effects"] = [status_effect(
        "DevilKnifeFear01", "Frightened (Infernal Knife)", "icons/svg/terror.svg",
        ["frightened"], [],
        "<p>Frightened of their allies until the end of their next turn. (Foundry applies the "
        "standard frightened condition; the 'of their allies' flavor is narrative.)</p>")]
    ka = first_activity(knife)
    ka["effects"] = [{"_id": "DevilKnifeFear01"}]
    # frightened until the end of the target's next turn
    knife["effects"][0]["flags"]["dae"]["specialDuration"] = ["turnEnd"]
    knife["effects"][0]["duration"] = {"turns": 1}
    notes.append("Infernal Knife: applies frightened until end of target's next turn")
    notes.append("Obsidian Kris: plain attack (already correct)")
    notes.append("MANUAL: True Name; Devilish Charm (reaction); Obsidian Kris 'no reactions while "
                 "frightened' (no clean midi enforcement -- track manually)")
    return notes


def automate_shade(data):
    notes = []
    minion = find(data, "Minion")
    minion["effects"] = [{
        "_id": "ShadeMinion00001", "name": "Minion", "img": "icons/svg/skull.svg",
        "changes": [{"key": "flags.midi-qol.onUseMacroName", "mode": 0,
                     "value": "[preTargetDamageApplication]ItemMacro.Minion", "priority": 20}],
        "disabled": False, "duration": {},
        "description": "<p>Minion: damage from an attack or failed save reduces the shade to 0 HP. "
        "Damage from another effect kills the shade only if it equals or exceeds their HP maximum; "
        "otherwise they take no damage.</p>",
        "origin": None, "transfer": True, "statuses": [], "flags": {},
    }]
    minion.setdefault("flags", {})
    minion["flags"]["dae"] = {"macro": {
        "name": "Minion", "img": "icons/svg/skull.svg", "type": "script",
        "scope": "global", "command": MINION_MACRO}}
    notes.append("Minion: transfer effect -> preTargetDamageApplication macro (any attack/failed-save "
                 "dmg = drop to 0; other dmg kills only if >= max)")
    notes.append("Life Drain: plain attack (already correct)")
    notes.append("MANUAL: Incorporeal Movement, Terrifying aura, Dazed Immunity, Challenge")
    return notes


def automate_count_rhodar(data):
    notes = []
    # Sanguinus -- necrotic HP-max drain / self-heal (same as vampire Bite)
    sang = find(data, "Sanguinus")
    sang["img"] = "icons/svg/blood.svg"
    attach_drain_macro(sang, "Sanguinus")
    notes.append("Sanguinus: necrotic HP-max drain & self-heal")

    # Spear of the Damned -- prone + restrained (escape DC 20 Str/Athletics)
    spear = find(data, "Spear of the Damned")
    spear["effects"] = [status_effect(
        "RhodarSpearPin01", "Impaled (Prone & Restrained)", "icons/svg/trap.svg",
        ["prone", "restrained"],
        [{"key": "system.attributes.movement.all", "mode": 0, "value": "0", "priority": 20}],
        "<p>Knocked prone and restrained by a spear of darkness. A creature can free themself or "
        "another within reach by using an action or bonus action to make a DC 20 Strength (Athletics) "
        "check.</p>")]
    sa = first_activity(spear)
    sa["effects"] = [{"_id": "RhodarSpearPin01"}]
    notes.append("Spear of the Damned: applies prone + restrained (DC20 Str/Athletics escape, manual)")

    notes.append("MANUAL: Spear Sacrifice, Withering Stare (reaction), Villain Actions "
                 "(Bloodstained/Fire Drake/Mist of Blades), Lair Actions, Flanked Immunity, Resting Place")
    return notes


JOBS = [
    ("fvtt-Actor-vampire-(mcdm)-FJDvF1wmZ7KXdCCU.json", "vampire-(mcdm)", automate_vampire_mcdm),
    ("fvtt-Actor-wight-(mcdm)-x8rHaDMhS68MTswI.json", "wight-(mcdm)", automate_wight),
    ("fvtt-Actor-devil-magistrate-EGZHes5fK2y5Pnjc.json", "devil-magistrate", automate_devil_magistrate),
    ("fvtt-Actor-shade-nYyo3XyhgRcGooqY.json", "shade", automate_shade),
    ("fvtt-Actor-count-rhodar-von-glauer-2IPHebsrEXHLcM0p.json", "count-rhodar-von-glauer", automate_count_rhodar),
]


def main():
    for fname, slug, fn in JOBS:
        src = os.path.join(IN, fname)
        data = load(src)
        notes = fn(data)
        dest = os.path.join(OUT, f"fvtt-Actor-{slug}-automated.json")
        save(dest, data)
        # round-trip validation
        load(dest)
        print(f"\n### {data['name']}  ->  {dest}")
        for n in notes:
            print("   -", n)


if __name__ == "__main__":
    main()
