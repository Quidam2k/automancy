# Adds the Inhuman Speed bonus action missing from the original export.
import copy
import json

PATH = r"Q:\Development\automancy\fvtt-Actor-vampire-spawn-(mcdm)-automated.json"

with open(PATH, encoding="utf-8") as f:
    data = json.load(f)

names = [i["name"] for i in data["items"]]
if "Inhuman Speed" in names:
    print("Inhuman Speed already present; nothing to do.")
    raise SystemExit

# Clone Multiattack as a template — same feat/utility-activity shape, then retarget.
template = next(i for i in data["items"] if i["name"] == "Multiattack")
feat = copy.deepcopy(template)
feat["name"] = "Inhuman Speed"
feat["img"] = "icons/svg/wing.svg"
feat["_id"] = "InhumanSpeed0001"
feat["sort"] = 200000
feat["system"]["description"]["value"] = (
    "<p><em>Inhuman Speed (Bonus Action).</em> The spawn moves up to their speed.</p>"
)
activity = feat["system"]["activities"]["dnd5eactivity000"]
activity["activation"]["type"] = "bonus"

data["items"].append(feat)

with open(PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

with open(PATH, encoding="utf-8") as f:
    check = json.load(f)
inh = next(i for i in check["items"] if i["name"] == "Inhuman Speed")
print("items:", [i["name"] for i in check["items"]])
print("Inhuman Speed activation:", inh["system"]["activities"]["dnd5eactivity000"]["activation"]["type"])
