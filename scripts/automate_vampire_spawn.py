# Adds MidiQOL/DAE automation to the MCDM Vampire Spawn actor export.
import json

PATH = r"Q:\Development\automancy\fvtt-Actor-vampire-spawn-(mcdm)-automated.json"

BITE_MACRO = r"""if (args[0].macroPass !== "postActiveEffects") return;
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

// Reduce the target's HP maximum until they finish a long rest
const effectData = {
  name: `HP Max Reduced by ${necrotic} (Vampire Bite)`,
  img: "icons/svg/blood.svg",
  origin: workflow.item.uuid,
  changes: [{ key: "system.attributes.hp.tempmax", mode: 2, value: `-${necrotic}`, priority: 20 }],
  flags: { dae: { stackable: "multi", specialDuration: ["longRest"] } }
};
await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: target.actor.uuid, effects: [effectData] });

// The spawn regains hit points equal to the necrotic damage dealt
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

with open(PATH, encoding="utf-8") as f:
    data = json.load(f)

items = {i["name"]: i for i in data["items"]}

# --- 1. Radiant Aversion: transfer effect, +10 radiant damage taken ---
ra = items["Radiant Aversion"]
ra["img"] = "icons/svg/sun.svg"
ra["effects"] = [{
    "_id": "RadiantAvers0001",
    "name": "Radiant Aversion",
    "img": "icons/svg/sun.svg",
    "changes": [
        {"key": "system.traits.dm.amount.radiant", "mode": 5, "value": "10", "priority": 20}
    ],
    "disabled": False,
    "duration": {},
    "description": "<p>Each time the spawn takes radiant damage, they take an extra 10 radiant damage.</p>",
    "origin": None,
    "transfer": True,
    "statuses": [],
    "flags": {}
}]

# --- 2. Claw: grapple-on-hit effect, gated to Large or smaller targets ---
claw = items["Claw. Melee Weapon Attack:"]
claw["name"] = "Claw"
claw["img"] = "icons/svg/net.svg"
claw["effects"] = [{
    "_id": "ClawGrapple00001",
    "name": "Grappled (Escape DC 15)",
    "img": "icons/svg/net.svg",
    "changes": [
        {"key": "system.attributes.movement.all", "mode": 0, "value": "0", "priority": 20}
    ],
    "disabled": False,
    "duration": {},
    "description": ("<p>Grappled by the vampire spawn (escape DC 15). The target can use an action to "
                    "attempt a Strength (Athletics) or Dexterity (Acrobatics) check against DC 15 to escape. "
                    "The spawn can have only one target grappled this way at a time.</p>"),
    "origin": None,
    "transfer": False,
    "statuses": ["grappled"],
    "flags": {"dae": {"stackable": "noneName"}}
}]
claw_act = claw["system"]["activities"]["dnd5eactivity000"]
claw_act["effects"] = [{"_id": "ClawGrapple00001"}]
claw_act["effectConditionText"] = "['tiny','sm','med','lg'].includes(target.system?.traits?.size ?? target.traits?.size)"

# --- 3. Bite: hard-block use condition + HP-max-drain / self-heal macro ---
bite = items["Bite. Melee Weapon Attack:"]
bite["name"] = "Bite"
bite["img"] = "icons/svg/blood.svg"
bite_act = bite["system"]["activities"]["dnd5eactivity000"]
bite_act["useConditionText"] = ("!!target && (target.statuses?.has('grappled') || "
                                "target.statuses?.has('incapacitated') || target.statuses?.has('restrained'))")
bite_act["useConditionReason"] = "Bite can only target a creature that is grappled by the spawn, incapacitated, or restrained."
bite["flags"]["midi-qol"] = {"onUseMacroName": "[postActiveEffects]ItemMacro"}
bite["flags"]["dae"] = {"macro": {
    "name": "Bite",
    "img": "icons/svg/blood.svg",
    "type": "script",
    "scope": "global",
    "command": BITE_MACRO
}}

with open(PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

# Validate round-trip and report
with open(PATH, encoding="utf-8") as f:
    check = json.load(f)
names = [i["name"] for i in check["items"]]
print("items:", names)
for i in check["items"]:
    acts = i.get("system", {}).get("activities", {})
    act = acts.get("dnd5eactivity000", {})
    print(f"- {i['name']}: effects={len(i['effects'])}, "
          f"useCond={bool(act.get('useConditionText'))}, "
          f"effectCond={bool(act.get('effectConditionText'))}, "
          f"onUse={i['flags'].get('midi-qol', {}).get('onUseMacroName', '')}")
