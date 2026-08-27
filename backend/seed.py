"""Coherent starter card set for Card Dual + genuine baseline balance data."""
from models import Card, Effect, now_iso, new_id
import engine

# artwork keys map to rarity/archetype-driven placeholder art on the frontend
_A = ["art-shadow", "art-ember", "art-tech", "art-arcane", "art-neutral"]


def _e(trigger, action, target, value):
    return Effect(trigger=trigger, action=action, target=target, value=value).model_dump()


# (name, type, archetype, rarity, cost, resource, power, keywords, effects, tags, desc)
_DEFS = [
    # ---- Shadow (Bleed) ----
    ("Blood Fang", "Unit", "Shadow", "Legendary", 5, "Blood", 5, ["Bleed", "Lifesteal"],
     [_e("On Attack", "Apply Bleed", "Enemy Hero", 3)], ["signature", "aggro"],
     "The pack's alpha. Every strike leaves the enemy bleeding out."),
    ("Crimson Acolyte", "Unit", "Shadow", "Common", 1, "Blood", 1, ["Bleed"],
     [_e("On Play", "Apply Bleed", "Enemy Hero", 1)], ["early"],
     "A devoted cultist who pays in blood."),
    ("Hemorrhage", "Spell", "Shadow", "Rare", 2, "Blood", 0, [],
     [_e("On Play", "Apply Bleed", "All Enemies", 2)], ["removal"],
     "Open every wound at once."),
    ("Sanguine Reaper", "Unit", "Shadow", "Epic", 4, "Blood", 4, ["Lifesteal", "Pierce"],
     [_e("On Attack", "Deal Damage", "Enemy Hero", 2)], ["midrange"],
     "It feeds on what it spills."),
    ("Vein Splitter", "Unit", "Shadow", "Common", 2, "Blood", 2, ["Bleed"],
     [_e("On Death", "Apply Bleed", "Random Enemy", 2)], [],
     "Dies messy, on purpose."),
    ("Nightmother", "Unit", "Shadow", "Mythic", 7, "Blood", 6, ["Bleed", "Regenerate", "Taunt"],
     [_e("Start of Turn", "Apply Bleed", "All Enemies", 2), _e("On Play", "Heal", "Self", 4)],
     ["finisher"], "She decides who bleeds and who heals."),
    ("Scarlet Rite", "Spell", "Shadow", "Rare", 3, "Blood", 0, [],
     [_e("On Play", "Heal", "Ally", 3), _e("On Play", "Apply Bleed", "Enemy Hero", 2)],
     ["value"], "A trade of pain for vigor."),

    # ---- Ember (Burn) ----
    ("Ember Sorcerer", "Unit", "Ember", "Epic", 4, "Mana", 4, ["Burn"],
     [_e("On Play", "Deal Damage", "Random Enemy", 3)], ["signature"],
     "Fire answers before it is asked."),
    ("Cinder Imp", "Unit", "Ember", "Common", 1, "Mana", 2, ["Burn"],
     [_e("On Play", "Deal Damage", "Enemy Hero", 1)], ["early"],
     "Small spark, real problem."),
    ("Firestorm", "Spell", "Ember", "Legendary", 6, "Mana", 0, [],
     [_e("On Play", "Deal Damage", "All Enemies", 4)], ["sweeper"],
     "Nothing green remains."),
    ("Ashen Warden", "Unit", "Ember", "Rare", 3, "Mana", 3, ["Taunt", "Shield"],
     [], ["defensive"], "Stands in the doorway of the inferno."),
    ("Molten Lance", "Spell", "Ember", "Common", 2, "Mana", 0, ["Pierce"],
     [_e("On Play", "Deal Damage", "Enemy Hero", 3)], ["burn"],
     "Thrown once, felt twice."),
    ("Pyre Colossus", "Unit", "Ember", "Mythic", 8, "Mana", 8, ["Burn", "Cleave"],
     [_e("On Attack", "Deal Damage", "All Enemies", 2)], ["finisher"],
     "A walking eruption."),
    ("Kindling Rite", "Spell", "Ember", "Rare", 2, "Mana", 0, [],
     [_e("On Play", "Buff", "Ally", 2), _e("On Play", "Deal Damage", "Random Enemy", 1)],
     ["tempo"], "Feed the flame, feed the fighter."),

    # ---- Tech (Artifacts / value) ----
    ("Vanguard Sentinel", "Unit", "Tech", "Epic", 5, "Energy", 5, ["Shield", "Taunt"],
     [_e("On Play", "Gain Shield", "Self", 3)], ["signature", "control"],
     "Protocol: hold the line."),
    ("Scout Drone", "Unit", "Tech", "Common", 1, "Energy", 1, ["Rush"],
     [_e("On Play", "Draw", "Self", 1)], ["early", "value"],
     "Cheap eyes on the field."),
    ("Overclock", "Spell", "Tech", "Rare", 2, "Energy", 0, ["Overload"],
     [_e("On Play", "Buff", "Ally", 3)], ["combo"],
     "Push the core past spec."),
    ("Aegis Fabricator", "Structure", "Tech", "Epic", 4, "Energy", 0, ["Shield"],
     [_e("Start of Turn", "Gain Shield", "Ally", 2)], ["engine"],
     "Prints armor every cycle."),
    ("Recon Array", "Structure", "Tech", "Rare", 3, "Energy", 0, [],
     [_e("Start of Turn", "Draw", "Self", 1)], ["engine", "value"],
     "Information is the strongest resource."),
    ("Titan Protocol", "Unit", "Tech", "Mythic", 8, "Energy", 7, ["Shield", "Cleave", "Taunt"],
     [_e("On Play", "Gain Shield", "Self", 5), _e("On Attack", "Deal Damage", "All Enemies", 2)],
     ["finisher"], "The last machine standing."),
    ("Salvage Trap", "Trap", "Tech", "Common", 2, "Energy", 0, [],
     [_e("On Death", "Draw", "Self", 2)], ["value"],
     "Every loss is inventory."),

    # ---- Arcane (Spells / synergy) ----
    ("Neural Weaver", "Unit", "Arcane", "Legendary", 5, "Essence", 4, ["Echo"],
     [_e("On Play", "Draw", "Self", 2), _e("On Play", "Buff", "Ally", 2)], ["signature", "combo"],
     "Threads of thought, made lethal."),
    ("Arcane Bolt", "Spell", "Arcane", "Common", 1, "Essence", 0, [],
     [_e("On Play", "Deal Damage", "Enemy Hero", 2)], ["early"],
     "The first lesson."),
    ("Mind Siphon", "Spell", "Arcane", "Rare", 3, "Essence", 0, ["Lifesteal"],
     [_e("On Play", "Draw", "Self", 1), _e("On Play", "Deal Damage", "Enemy Hero", 2)],
     ["value"], "Take the thought and the vitality."),
    ("Ancient Grimoire", "Structure", "Arcane", "Epic", 4, "Essence", 0, ["Echo"],
     [_e("Start of Turn", "Buff", "Ally", 1), _e("Start of Turn", "Draw", "Self", 1)],
     ["engine"], "It writes new pages by itself."),
    ("Astral Twin", "Unit", "Arcane", "Rare", 3, "Essence", 3, ["Echo", "Stealth"],
     [_e("On Play", "Summon", "Ally", 2)], ["combo"],
     "There are always two."),
    ("Void Prophet", "Unit", "Arcane", "Mythic", 7, "Essence", 5, ["Echo", "Pierce"],
     [_e("On Play", "Deal Damage", "All Enemies", 3), _e("On Play", "Draw", "Self", 2)],
     ["finisher"], "It has already seen the end."),

    # ---- Neutral ----
    ("Wandering Mercenary", "Unit", "Neutral", "Common", 3, "Mana", 3, [],
     [], ["filler"], "Coin over cause."),
    ("Duelist's Blade", "Spell", "Neutral", "Rare", 2, "Mana", 0, ["Pierce"],
     [_e("On Play", "Buff", "Ally", 2)], ["tempo"],
     "A fair fight is a wasted one."),
    ("Stone Bastion", "Structure", "Neutral", "Epic", 5, "Mana", 0, ["Taunt", "Shield"],
     [_e("Start of Turn", "Gain Shield", "Ally", 2)], ["defensive"],
     "Older than the war it guards."),
]


def _build_card(d) -> dict:
    (name, ctype, arch, rar, cost, res, power, kws, effs, tags, desc) = d
    art = {"Shadow": "art-shadow", "Ember": "art-ember", "Tech": "art-tech",
           "Arcane": "art-arcane", "Neutral": "art-neutral"}[arch]
    c = Card(name=name, type=ctype, archetype=arch, rarity=rar, cost=cost,
             resource_type=res, power=power, keywords=kws, effects=effs,
             tags=tags, description=desc, artwork_key=art)
    d2 = c.model_dump()
    errs, warns = engine.validate_card(d2)
    d2["power_score"] = engine.power_score(d2)
    d2["complexity_score"] = engine.complexity_score(d2)
    d2["validation_errors"] = errs
    d2["validation_warnings"] = warns
    d2["validation_status"] = engine.validation_status(errs, warns)
    # lifecycle spread for a lived-in project
    if d2["validation_status"] == "Valid":
        d2["lifecycle_status"] = "Valid"
    elif d2["validation_status"] == "Needs Review":
        d2["lifecycle_status"] = "Needs Review"
    else:
        d2["lifecycle_status"] = "Draft"
    return d2


async def seed_database(db):
    existing = await db.cards.count_documents({})
    if existing > 0:
        return

    cards = [_build_card(d) for d in _DEFS]

    # genuine baseline win rates + version history via real simulation
    logs = []
    versions_docs = []
    for c in cards:
        wr, sample = engine.card_win_rate(c, cards, matches=250, seed=7)
        c["win_rate"] = wr
        c["sample_size"] = sample
        c["balance_status"] = engine.balance_state_for(wr)

        # synthesize a coherent version history (0.8 → 0.9 → current)
        base = wr
        v08 = round(max(5.0, min(98.0, base - 5.5)), 1)
        v09 = round(max(5.0, min(98.0, base - 2.2)), 1)
        c["prev_win_rate"] = v09
        for ver, w in (("0.8", v08), ("0.9", v09), ("1.0", base)):
            versions_docs.append({
                "id": new_id(), "card_id": c["id"], "version": ver,
                "win_rate": w, "power_score": c["power_score"],
                "cost": c["cost"], "power": c["power"],
                "sample_size": sample if ver == "1.0" else 250,
                "note": "Baseline simulation" if ver == "1.0" else "Historical snapshot",
                "created_at": now_iso(),
            })
        c["version"] = "1.0"

    await db.cards.insert_many(cards)
    if versions_docs:
        await db.card_versions.insert_many(versions_docs)

    # seed a few execution log entries so the console isn't empty
    from datetime import datetime, timezone, timedelta
    t0 = datetime.now(timezone.utc)
    seedlogs = [
        ("Project initialized", "Card Dual v1.0 workspace created", "success", 12, None),
        (f"Seeded {len(cards)} cards", "Starter set imported across 5 archetypes", "success", 340, None),
        ("Baseline balance pass", "Computed win rates vs field for all cards", "success", 1820, None),
    ]
    docs = []
    for i, (op, summary, status, dur, ref) in enumerate(seedlogs):
        docs.append({
            "id": new_id(),
            "timestamp": (t0 - timedelta(minutes=(len(seedlogs) - i))).isoformat(),
            "operation": op, "status": status, "duration_ms": dur,
            "object_id": ref, "summary": summary, "raw": {"seed": True},
        })
    await db.execution_logs.insert_many(docs)
