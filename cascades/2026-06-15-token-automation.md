# Game Token Automation — 2026-06-15

Goal: improve MidiQOL/DAE automation on every actor exported from the live game
(Foundry **v13.351 / dnd5e 5.3.x**, all modules current). Inputs in `input/`,
automated outputs to `output/fvtt-Actor-<slug>-automated.json`. Worst case the
user re-imports the raw `input/` exports, so scripts must be re-runnable from input.

Reference repos updated to match the live game:
midi-qol 13.0.63 · dae 13.0.29 · dnd5e 5.3.3 · chris-premades (Jun 13) ·
gambits 2.1.43 · adv-reminder/MISC latest. (DnD5eAutomatedSpells & FoundryMacros stale upstream.)

Verified-good conventions (midi-qol v13 source):
- Item macro: `flags.midi-qol.onUseMacroName = "[postActiveEffects]ItemMacro"` +
  command in `flags.dae.macro.command` (resolveItemMacro utils.ts:1361).
- Activities live in `system.activities.<id>`; on-hit effects via `activity.effects=[{_id}]`.
- Use-gate: `activity.useConditionText` / `useConditionReason`. Effect-gate: `activity.effectConditionText`.
- Conditional adv/dis flag values are expressions over rollData (`targetActorUuid`, `raceOrType`, `target.system…`).

## Phase 1 — Monsters (bespoke, like the done vampire spawn)  → scripts/automate_monsters.py
Status legend: ✅ automated · ➖ left manual (narrative/reaction, no clean trigger)

- **Vampire (MCDM)**: ✅Radiant Aversion (transfer +10 radiant taken) ✅Claw (grapple DC18 + restrained, size≤Lg gate) ✅Bite (use-gate grappled/incap/restrained + necrotic HP-max drain & self-heal). ➖Turn Resistance, Resting Place, Exsanguinating Mist, Run My Child, Lair.
- **Wight (MCDM)**: ✅Vitality Theft (self-heal ½ dmg + 1-rd disadvantage on victim's attacks vs non-wight). Longsword/Crossbow plain (fine). ➖Decaying Guard (reaction redirect).
- **Devil Magistrate**: ✅Infernal Knife (frightened to end of target's next turn) ✅Obsidian Kris (effect-gate: if target frightened → no-reactions effect). ➖True Name, Devilish Charm (reaction).
- **Shade**: ✅Minion (preTargetDamageApplication macro: any attack/failed-save dmg → 0 HP; other dmg ≥max → die). Life Drain plain. ➖Incorporeal Move, Terrifying aura, Dazed Immunity, Challenge.
- **Count Rhodar (vampire lord)**: ✅Sanguinus (necrotic HP-max drain & self-heal) ✅Spear of the Damned (prone + restrained, DC20 esc note). ➖Spear Sacrifice, Withering Stare (reaction), villain actions (Bloodstained/Fire Drake/Mist of Blades), Lair, Flanked Immunity, Resting Place.

## Phase 2 — PCs (AUDIT & FIX, not redo)  — bueller, grumph, henry, iryi, ydræsk + ioko(npc)
- 2024 schema note: prepared = `system.prepared==1` OR `system.method in (atwill,innate,pact,always,ritual)`; cantrips always.
- **PCs are ~90% covered by Chris Premades already** (47–56 automated items each). Remaining gap is small.
- ✅ **Agonizing Blast (Iryi) FIXED**: modern CPR adds CHA only to cantrips listed by exact name in
  `flags.chris-premades.agonizingBlast.spells`; DDB left it unset → bonus never applied. Set to ["Eldritch Blast"].
  → `scripts/fix_pcs.py`, output `output/fvtt-Actor-iryi-2024-automated.json`.
- Remaining true gaps (per corrected scan):
  - Save+damage spells (Cone of Cold, Thunderclap, Gust): already work natively in midi (save activity) — no macro needed.
  - Buff/condition spells (Greater Invisibility, Invisibility, See Invisibility): need a status-granting Active Effect.
  - Passive feats (Fey Ancestry=adv vs charmed, Aura of Courage, Brave, Evocation Savant, Potent Cantrip, metamagic): mostly passive; a few warrant simple transfer effects.
  - Mundane weapons flagged as "unautomated" need nothing (basic attacks already work).
- ⚠️ NEXT: decide depth — hand-build effects for the buff/passive items vs. Medkit-apply in Foundry. Then ioko (npc) cleanup.
- ⚠️ NOTE: ioko export has a messy duplicated 2024-default-action list (Dash/Dodge/Hide… ×2) + garbled names (`Euphoria Breath (Recharge 5–6)*`). Needs cleanup, not just automation.

## STATUS — 2026-06-15: Phases 1 & 2 complete
All 12 actors written to `output/` + `output/PC_AUDIT.md`. Final integrity check: every item I
edited validates (round-trip + effect-ref). Pre-existing DDB/CPR dangling effect-refs on untouched
spells (bueller 16, grumph 2, henry 6, iryi 3) confirmed identical input↔output — not introduced here.

Phase 1 monsters: ✅ vampire(mcdm), wight, devil-magistrate, shade, count-rhodar  (scripts/automate_monsters.py)
Phase 2 PCs (scripts/fix_pcs.py): ✅ Iryi (Agonizing Blast + Repelling Blast CPR-ify) · Bueller (Peerless Athlete)
  · Grumph (Potent Cantrip → save-cantrips half-on-save) · Henry (Halfling Luck flag) · Ydræsk (Acrobatic Movement).
Phase 2 ioko (scripts/automate_ioko.py): ✅ cleaned 41→30 items, automated Euphoria Breath / Superior
  Invisibility / Magic Resistance.
Left manual (documented in PC_AUDIT.md + monster notes): per-condition save-advantage (Fey Ancestry, Brave),
auras (Aura of Courage), summons (Find Steed), reactions/resources (Lucky, metamagic, Bend Luck, villain
actions), narrative abilities. Recommend CPR Medkit in-app for those CPR maintains.

## Testing note
No live Foundry instance available here → validation = JSON round-trip + structural/schema
checks + pattern-match vs known-good spawn output and current midi-qol/chris source.
In-Foundry behavior still needs a spot-check by the user.
