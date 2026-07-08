# Cleans up and automates the Ioko (Faerie Dragon) export.
# Re-runnable from input/. Foundry v13.351 / dnd5e 5.3.x.
import json
import os
import re

SRC = "input/fvtt-Actor-ioko-xD9HjZditxxBc0dj.json"
DEST = "output/fvtt-Actor-ioko-automated.json"


def strip(h):
    t = re.sub(r"<[^>]+>", " ", h or "")
    return re.sub(r"\s+", " ", re.sub(r"&[a-z]+;", " ", t)).strip()


def main():
    with open(SRC, encoding="utf-8") as f:
        data = json.load(f)
    items = data["items"]
    log = []

    # 1. Fold the d6 behavior-table fragments ("1–4", "5–6") into Euphoria Breath, then drop them.
    table = {}
    for it in items:
        if it["name"] in ("1–4", "1-4", "5–6", "5-6"):
            table[it["name"].replace("-", "–")] = strip(it["system"]["description"]["value"])
    breath = next(i for i in items if i["name"].startswith("Euphoria Breath"))
    # clean the name (drop trailing '*')
    breath["name"] = "Euphoria Breath (Recharge 5–6)"
    if table:
        extra = "".join(f"<p><strong>{k}.</strong> {v}</p>" for k, v in sorted(table.items()))
        breath["system"]["description"]["value"] += (
            "<p><em>Behavior (roll a d6 at the start of each turn):</em></p>" + extra)
        log.append(f"Euphoria Breath: folded behavior table {sorted(table)} into description; cleaned name")

    # 2. Remove the standalone fragment items + de-duplicate repeated standard-action items.
    seen = set()
    cleaned = []
    removed = []
    for it in items:
        nm = it["name"]
        if nm in ("1–4", "1-4", "5–6", "5-6"):
            removed.append(nm)
            continue
        if nm in seen:
            removed.append(nm)
            continue
        seen.add(nm)
        cleaned.append(it)
    data["items"] = cleaned
    log.append(f"Removed {len(removed)} items (fragments + duplicate standard actions): "
               f"{sorted(set(removed))}")

    by_name = {i["name"]: i for i in cleaned}

    # 3. Euphoria Breath effect: populate the placeholder (1-minute, can't take reactions + behavior).
    eff = breath["effects"][0]
    eff["name"] = "Euphoria"
    eff["img"] = "icons/svg/daze.svg"
    eff["duration"] = {"seconds": 60}
    eff["description"] = ("<p>Euphoric: can't take reactions, and at the start of each turn roll a d6 to "
                          "determine behavior (1–4: move randomly, no action; 5–6: act only to repeat the "
                          "DC 11 Wis save to end). Lasts 1 minute. (Random behavior is rolled by the GM; "
                          "midi-qol has no clean 'no reactions' enforcement — track manually.)</p>")
    eff.setdefault("flags", {}).setdefault("dae", {})["specialDuration"] = ["isSave"]
    eff["flags"]["dae"]["stackable"] = "noneName"
    log.append("Euphoria Breath: DC11 Wis save applies a 1-min 'Euphoria' effect on failure "
               "(special-duration ends on a later successful save)")

    # 4. Superior Invisibility -> self invisible (bonus action, until concentration ends).
    si = by_name["Superior Invisibility"]
    si["effects"] = [{
        "_id": "IokoSuperInvis01", "name": "Superior Invisibility", "img": "icons/svg/invisible.svg",
        "changes": [], "statuses": ["invisible"], "disabled": False, "duration": {},
        "description": "<p>Invisible until concentration ends (equipment is invisible too).</p>",
        "origin": None, "transfer": False, "flags": {"dae": {"stackable": "noneName"}},
    }]
    sa = next(iter(si["system"]["activities"].values()))
    sa["effects"] = [{"_id": "IokoSuperInvis01"}]
    if not sa.get("target", {}).get("affects", {}).get("type"):
        sa.setdefault("target", {}).setdefault("affects", {})["type"] = "self"
    log.append("Superior Invisibility: bonus action applies invisible to self (self-target set)")

    # 5. Magic Resistance -> transfer effect granting advantage on saves vs magic.
    mr = by_name["Magic Resistance"]
    mr["effects"] = [{
        "_id": "IokoMagicResist0", "name": "Magic Resistance", "img": "icons/svg/shield.svg",
        "changes": [{"key": "flags.midi-qol.magicResistance.save.all", "mode": 0, "value": "1", "priority": 20}],
        "statuses": [], "disabled": False, "duration": {},
        "description": "<p>Advantage on saving throws against spells and other magical effects.</p>",
        "origin": None, "transfer": True, "flags": {},
    }]
    log.append("Magic Resistance: transfer effect sets flags.midi-qol.magicResistance.save.all")

    log.append("MANUAL: Limited Telepathy (narrative); Innate Spellcasting (color-keyed spells not "
               "present as items — add the spell items if you want them rollable)")

    with open(DEST, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    with open(DEST, encoding="utf-8") as f:
        json.load(f)
    print(f"### {data['name']}  ->  {DEST}  ({len(cleaned)} items, was {len(items)})")
    for entry in log:
        print("   -", entry)


if __name__ == "__main__":
    main()
