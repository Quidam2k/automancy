# Audit-and-fix pass for the player characters (NOT a from-scratch redo).
# Re-runnable from input/. Each fix is targeted and logged; an audit of every
# remaining gap item is written to output/PC_AUDIT.md.
# Foundry v13.351 / dnd5e 5.3.x, Chris Premades-managed items.
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

IN = "input"
OUT = "output"

PCS = {
    "iryi-2024": "fvtt-Actor-iryi-2024-DXHpoJGuLzg71TPD(1).json",
    "bueller-von-ferris-2024": "fvtt-Actor-bueller-von-ferris-2024-1jC1ChIbcAKeqtf2.json",
    "grumph": "fvtt-Actor-grumph-zY8lKXEWXo4oBKDe.json",
    "henry-swiftfoot-2024": "fvtt-Actor-henry-swiftfoot-2024-OirMzwwBapII2T58.json",
    "ydraesk-barleyforge": "fvtt-Actor-ydrǣsk-barleyforge-FTH8hcrRuynSlRQT.json",
}


# --------------------------------------------------------------------------- helpers
def cpr_identifier(item):
    return (item.get("flags", {}).get("chris-premades", {}).get("info", {}).get("identifier")
            or item.get("system", {}).get("identifier"))


def find_name(data, name):
    return next((i for i in data["items"] if i["name"] == name), None)


def is_prepared(s):
    sy = s["system"]
    if sy.get("level") == 0:
        return True
    if sy.get("prepared") == 1:
        return True
    return sy.get("method") in ("atwill", "innate", "pact", "always", "ritual")


def has_auto(it):
    f = it.get("flags", {})
    if f.get("chris-premades"):
        return "cpr"
    for e in it.get("effects", []):
        if e.get("changes") or e.get("statuses"):
            return "effect"
    if f.get("midi-qol", {}).get("onUseMacroName"):
        return "midi"
    if f.get("dae", {}).get("macro"):
        return "itemmacro"
    return None


# --------------------------------------------------------------------------- fixes
def fix_agonizing_blast(data, log):
    ab = next((i for i in data["items"] if cpr_identifier(i) == "agonizingBlast"), None)
    if not ab:
        return
    cpr = ab.setdefault("flags", {}).setdefault("chris-premades", {})
    cantrips = [i["name"] for i in data["items"]
                if i["type"] == "spell" and i.get("system", {}).get("level") == 0]
    chosen = [n for n in cantrips if n == "Eldritch Blast"] or cantrips[:1]
    if cpr.get("agonizingBlast", {}).get("spells") == chosen:
        return
    cpr.setdefault("agonizingBlast", {})["spells"] = chosen
    log.append(f"Agonizing Blast: set CHA-damage cantrip list = {chosen} (was unset) — fixes bonus never applying")


def fix_repelling_blast(data, log):
    """CPR-ify the Repelling Blast invocation so CPR's push-on-hit macro runs
    (DDB imported it without CPR automation). Mirrors the Agonizing Blast item."""
    rb = next((i for i in data["items"]
               if i["type"] == "feat" and "Repelling Blast" in i["name"]), None)
    if not rb or rb.get("flags", {}).get("chris-premades", {}).get("info"):
        return
    cpr = rb.setdefault("flags", {}).setdefault("chris-premades", {})
    cpr["info"] = {"identifier": "repellingBlast", "source": "chris-premades",
                   "version": "1.3.156", "rules": "modern"}
    cpr["macros"] = {"midi": {"actor": ["repellingBlast"]}}
    log.append("Repelling Blast: added CPR automation flags (identifier=repellingBlast) — enables push 10ft on Eldritch Blast hit [SPOT-CHECK in Foundry]")


ADV_ATH_ACR = [
    {"key": "flags.adv-reminder.advantage.skill.ath", "mode": 0, "value": "1", "priority": 20},
    {"key": "flags.adv-reminder.advantage.skill.acr", "mode": 0, "value": "1", "priority": 20},
]


def fix_peerless_athlete(data, log):
    pa = find_name(data, "Peerless Athlete")
    if not pa:
        return
    effs = pa.get("effects", [])
    real = [e for e in effs if e.get("changes") or e.get("statuses")]
    if real:
        return  # already automated
    if effs:  # DDB placeholder effect with empty changes -> populate it
        eid = effs[0]["_id"]
        effs[0]["changes"] = list(ADV_ATH_ACR)
    else:
        eid = "PeerlessAthlete0"
        pa["effects"] = [{
            "_id": eid, "name": "Peerless Athlete", "img": pa.get("img"),
            "changes": list(ADV_ATH_ACR), "disabled": False, "duration": {"seconds": 3600},
            "description": "<p>Advantage on Athletics and Acrobatics checks for 1 hour.</p>",
            "origin": None, "transfer": False, "statuses": [], "flags": {"dae": {"stackable": "noneName"}},
        }]
    acts = pa.get("system", {}).get("activities", {})
    if acts:
        next(iter(acts.values()))["effects"] = [{"_id": eid}]
    log.append("Peerless Athlete: effect grants advantage on Athletics/Acrobatics for 1h (via adv-reminder)")


def fix_potent_cantrip(data, log):
    if not any(i["type"] == "feat" and i["name"] == "Potent Cantrip" for i in data["items"]):
        return  # only applies to a caster who actually has the Potent Cantrip feature
    changed = []
    for sp in data["items"]:
        if sp["type"] != "spell" or sp.get("system", {}).get("level") != 0:
            continue
        for a in sp.get("system", {}).get("activities", {}).values():
            dmg = a.get("damage")
            if a.get("save") and isinstance(dmg, dict) and dmg.get("onSave") == "none":
                dmg["onSave"] = "half"
                changed.append(sp["name"])
    if changed:
        log.append(f"Potent Cantrip: set save-cantrips to deal half on save: {sorted(set(changed))} "
                   f"(attack-cantrip half-on-miss still needs a macro — left manual)")


def fix_halfling_luck(data, log):
    luck = next((i for i in data["items"]
                 if i["type"] == "feat" and i["name"] == "Luck"), None)
    if not luck or luck.get("effects"):
        return
    eff = {
        "_id": "HalflingLuck0001", "name": "Lucky (Halfling)", "img": luck.get("img"),
        "changes": [{"key": "flags.dnd5e.halflingLucky", "mode": 0, "value": "1", "priority": 20}],
        "disabled": False, "duration": {},
        "description": "<p>Reroll any natural 1 on a d20 Test (automatic via the dnd5e system).</p>",
        "origin": None, "transfer": True, "statuses": [], "flags": {},
    }
    luck["effects"] = [eff]
    log.append("Halfling Luck: transfer effect sets flags.dnd5e.halflingLucky — auto-rerolls natural 1s")


def fix_acrobatic_movement(data, log):
    am = find_name(data, "Acrobatic Movement")
    if not am or am.get("effects"):
        return
    eff = {
        "_id": "AcrobaticMove001", "name": "Acrobatic Movement", "img": am.get("img"),
        "changes": [{"key": "system.attributes.movement.climb", "mode": 5,
                     "value": "@attributes.movement.walk", "priority": 20}],
        "disabled": False, "duration": {},
        "description": "<p>While unarmored and not wielding a shield: climb speed equals walking speed "
        "and you can move across liquids (water-walking is narrative — toggle off if armored).</p>",
        "origin": None, "transfer": True, "statuses": [], "flags": {},
    }
    am["effects"] = [eff]
    log.append("Acrobatic Movement: transfer effect grants climb speed = walk speed (water-walk noted)")


FIXES = [fix_agonizing_blast, fix_repelling_blast, fix_peerless_athlete,
         fix_potent_cantrip, fix_halfling_luck, fix_acrobatic_movement]


# --------------------------------------------------------------------------- audit
def strip(h):
    t = re.sub(r"<[^>]+>", " ", h or "")
    t = re.sub(r"@?\w*\[?[Rr]eference\]?\[[^\]]*\]\{([^}]+)\}", r"\1", t)
    t = re.sub(r"&[a-z]+;", " ", t)
    return re.sub(r"\s+", " ", t).strip()


SCAFFOLD = ("spellcasting", "pact magic", "font of magic", "metamagic", "sorcery point",
            "sorcerous restoration", "magical cunning", "sorcery incarnate", "eldritch invocations",
            "ritual adept", "scholar", "skilled", "thieves' cant", "trance", "extra attack",
            "naturally stealthy", "halfling nimbleness", "spell sniper", "lineage", "savant",
            "improved illusion", "faithful steed", "oath of glory", "evocation savant")
MANUAL = ("lucky", "luck points", "bend luck", "tides of chaos", "metamagic:", "wild magic surge",
          "inspiring smite", "fey ancestry", "brave", "abjure foes", "adrenaline rush",
          "sorcerous burst")


def classify(it):
    n = it["name"].lower()
    if it["type"] == "spell":
        txt = strip(it.get("system", {}).get("description", {}).get("value", "")).lower()
        if any(k in n for k in ("invisib",)) or "invisible" in txt[:120]:
            return ("NATIVE/EFFECT", "applies via its own status effect or vision (no change needed)")
        if "saving throw" in txt or "/save" in txt or "spell attack" in txt or "make a ranged" in txt:
            return ("NATIVE", "save/attack + damage already resolves in midi-qol")
        if any(k in txt for k in ("regains", "hit points", "revive")):
            return ("NATIVE", "heal activity resolves natively")
        return ("UTILITY", "narrative/utility spell — no combat automation needed")
    if any(k in n for k in MANUAL):
        return ("MANUAL", "player-invoked reaction/resource or no per-condition trigger exists")
    if any(k in n for k in SCAFFOLD):
        return ("PASSIVE", "class/resource/proficiency scaffolding — nothing to automate")
    return ("REVIEW", "needs a closer look")


def write_audit(all_gaps):
    lines = ["# PC automation audit — remaining gap items", "",
             "Generated by scripts/fix_pcs.py. BUILT items are now automated in the output exports.",
             "Everything else is classified with why it was left.", ""]
    for pcname, built, gaps in all_gaps:
        lines.append(f"## {pcname}")
        if built:
            lines.append("**Built this pass:**")
            for b in built:
                lines.append(f"- ✅ {b}")
        lines.append("")
        lines.append("**Remaining (not auto-built):**")
        for it in gaps:
            cat, why = classify(it)
            lines.append(f"- `{cat}` **{it['name']}** — {why}")
        lines.append("")
    dest = os.path.join(OUT, "PC_AUDIT.md")
    with open(dest, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\nAudit written: {dest}")


def main():
    all_gaps = []
    for slug, fname in PCS.items():
        src = os.path.join(IN, fname)
        if not os.path.exists(src):
            print(f"### {slug}: SOURCE MISSING"); continue
        with open(src, encoding="utf-8") as f:
            data = json.load(f)
        log = []
        for fix in FIXES:
            fix(data, log)
        dest = os.path.join(OUT, f"fvtt-Actor-{slug}-automated.json")
        with open(dest, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        with open(dest, encoding="utf-8") as f:
            json.load(f)  # round-trip validation
        print(f"\n### {data['name']}  ->  {os.path.basename(dest)}")
        for entry in (log or ["(no builds; see audit)"]):
            print("   -", entry)
        # collect remaining gaps for audit
        prep = [s for s in data["items"] if s["type"] == "spell" and is_prepared(s)]
        feats = [i for i in data["items"] if i["type"] == "feat"]
        gaps = [i for i in prep + feats if not has_auto(i)]
        all_gaps.append((data["name"], log, gaps))
    write_audit(all_gaps)


if __name__ == "__main__":
    main()
