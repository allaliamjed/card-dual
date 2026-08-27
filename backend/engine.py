"""Card Dual Rules / Simulation / Balance Engine.

This is the authoritative game-systems layer. The UI never contains balance
logic; every validation result, power score, simulation, and balance number
originates here so the same engine can back the web UI, AI agents and Godot.
"""
import random
from typing import List, Dict, Tuple

# ---- Weights (deterministic, transparent) ----
TRIGGER_MULT = {"On Play": 1.0, "On Death": 0.7, "Start of Turn": 1.35,
                "On Attack": 1.1, "Passive": 1.4}
ACTION_WEIGHT = {"Deal Damage": 1.0, "Apply Bleed": 1.25, "Draw": 1.6,
                 "Gain Shield": 0.85, "Heal": 0.9, "Buff": 1.15, "Summon": 1.4}
TARGET_MULT = {"Enemy Hero": 1.0, "Random Enemy": 0.8, "All Enemies": 1.7,
               "Self": 0.7, "Ally": 0.95}
KEYWORD_BONUS = {"Bleed": 2.0, "Burn": 2.2, "Shield": 2.0, "Lifesteal": 3.0,
                 "Rush": 2.0, "Taunt": 1.5, "Pierce": 2.2, "Regenerate": 2.5,
                 "Overload": -2.0, "Echo": 3.2, "Stealth": 1.8, "Cleave": 2.4}

RARITY_MAX_EFFECTS = {"Common": 1, "Rare": 2, "Epic": 3, "Legendary": 4, "Mythic": 5}
HERO_HP = 30
MAX_TURNS = 40


def _effects(card: dict) -> List[dict]:
    return card.get("effects", []) or []


def power_score(card: dict) -> float:
    score = float(card.get("power", 0))
    for e in _effects(card):
        w = ACTION_WEIGHT.get(e.get("action"), 1.0)
        t = TRIGGER_MULT.get(e.get("trigger"), 1.0)
        tg = TARGET_MULT.get(e.get("target"), 1.0)
        score += float(e.get("value", 0)) * w * t * tg
    for k in card.get("keywords", []) or []:
        score += KEYWORD_BONUS.get(k, 1.0)
    return round(score, 2)


def complexity_score(card: dict) -> float:
    score = len(_effects(card)) * 2.0
    score += len(card.get("keywords", []) or []) * 1.0
    score += len(card.get("abilities", []) or []) * 1.5
    for e in _effects(card):
        if e.get("trigger") in ("Passive", "Start of Turn"):
            score += 1.0
        if e.get("target") == "All Enemies":
            score += 1.0
    return round(score, 2)


def expected_power_for_cost(cost: int) -> float:
    """The design power curve. Cards should sit close to this line."""
    return round(cost * 2.4 + 1.0, 2)


def validate_card(card: dict) -> Tuple[List[str], List[str]]:
    errors: List[str] = []
    warnings: List[str] = []

    name = (card.get("name") or "").strip()
    if not name:
        errors.append("Card name is required.")
    cost = int(card.get("cost", 0))
    if cost < 0 or cost > 12:
        errors.append(f"Cost {cost} is outside the legal range 0–12.")
    power = int(card.get("power", 0))
    if power < 0:
        errors.append("Power cannot be negative.")

    effs = _effects(card)
    for i, e in enumerate(effs):
        if int(e.get("value", 0)) < 0:
            errors.append(f"Effect #{i+1} has a negative value.")
        if e.get("action") not in ACTION_WEIGHT:
            errors.append(f"Effect #{i+1} uses an unknown action.")

    rarity = card.get("rarity", "Common")
    max_eff = RARITY_MAX_EFFECTS.get(rarity, 3)
    if len(effs) > max_eff:
        warnings.append(
            f"{rarity} cards should have at most {max_eff} effect(s); this has {len(effs)}.")

    ps = power_score(card)
    exp = expected_power_for_cost(cost)
    dev = ps - exp
    if dev > 4.5:
        warnings.append(
            f"Power score {ps} is well above the {exp} curve for cost {cost} (+{round(dev,1)}). Likely overpowered.")
    elif dev < -4.5:
        warnings.append(
            f"Power score {ps} is well below the {exp} curve for cost {cost} ({round(dev,1)}). Likely underpowered.")

    if rarity in ("Legendary", "Mythic") and ps < exp - 1 and not effs:
        warnings.append(f"{rarity} card has no effects and a modest power score.")

    if "Overload" in (card.get("keywords") or []) and cost <= 1:
        warnings.append("Overload on a low-cost card rarely provides meaningful drawback.")

    return errors, warnings


def validation_status(errors: List[str], warnings: List[str]) -> str:
    if errors:
        return "Invalid"
    if warnings:
        return "Needs Review"
    return "Valid"


# ---------------- Simulation ----------------
def _combat_profile(card: dict) -> dict:
    # power is the body; cost contributes board tempo so support cards still fight
    dmg = float(card.get("power", 0)) + float(card.get("cost", 1)) * 0.6
    bleed = 0.0
    heal = 0.0
    shield = 0.0
    lifesteal = False
    pierce = False
    for e in _effects(card):
        v = float(e.get("value", 0))
        a = e.get("action")
        scale = 0.6 if e.get("target") in ("Random Enemy",) else 1.0
        if a == "Deal Damage":
            dmg += v * scale
        elif a == "Apply Bleed":
            bleed += v
        elif a == "Heal":
            heal += v
        elif a == "Gain Shield":
            shield += v
        elif a == "Buff":
            dmg += v * 0.5
        elif a == "Summon":
            dmg += v * 0.7
        elif a == "Draw":
            dmg += v * 0.3  # card advantage → tempo
    kw = card.get("keywords", []) or []
    if "Bleed" in kw:
        bleed += 1
    if "Burn" in kw:
        bleed += 2
    if "Shield" in kw:
        shield += 3
    if "Lifesteal" in kw:
        lifesteal = True
    if "Pierce" in kw:
        pierce = True
    if "Regenerate" in kw:
        heal += 2
    if "Rush" in kw:
        dmg += 1
    return {"dmg": dmg, "bleed": bleed, "heal": heal, "shield": shield,
            "lifesteal": lifesteal, "pierce": pierce,
            "cost": int(card.get("cost", 1))}


def _aggregate_profile(cards: List[dict]) -> dict:
    if not cards:
        return {"dmg": 5, "bleed": 0, "heal": 0, "shield": 0,
                "lifesteal": False, "pierce": False, "cost": 3}
    profs = [_combat_profile(c) for c in cards]
    n = len(profs)
    return {
        "dmg": sum(p["dmg"] for p in profs) / n,
        "bleed": sum(p["bleed"] for p in profs) / n,
        "heal": sum(p["heal"] for p in profs) / n,
        "shield": sum(p["shield"] for p in profs) / n,
        "lifesteal": any(p["lifesteal"] for p in profs),
        "pierce": any(p["pierce"] for p in profs),
        "cost": sum(p["cost"] for p in profs) / n,
    }


def _turn_output(prof: dict, rng: random.Random) -> float:
    # variance + occasional crit for genuine spread
    base = prof["dmg"] * rng.uniform(0.75, 1.25)
    if rng.random() < 0.12:
        base *= 1.6
    return max(0.0, base)


def simulate_match(pa: dict, pb: dict, rng: random.Random) -> Tuple[str, int, float]:
    """Return (winner in {A,B,Draw}, turns, total_damage_dealt)."""
    hp_a = HERO_HP + pa["shield"]
    hp_b = HERO_HP + pb["shield"]
    bleed_on_a = 0.0
    bleed_on_b = 0.0
    total_damage = 0.0
    # tempo: cheaper side acts first more often
    a_first = pa["cost"] <= pb["cost"]
    turn = 0
    while hp_a > 0 and hp_b > 0 and turn < MAX_TURNS:
        turn += 1
        hp_a -= bleed_on_a
        hp_b -= bleed_on_b

        order = [("A", pa), ("B", pb)] if a_first else [("B", pb), ("A", pa)]
        for side, prof in order:
            if hp_a <= 0 or hp_b <= 0:
                break
            out = _turn_output(prof, rng)
            total_damage += out
            if side == "A":
                dealt = out
                if not pa["pierce"]:
                    dealt = out  # shields already folded into hp
                hp_b -= dealt
                bleed_on_b += prof["bleed"]
                if prof["lifesteal"]:
                    hp_a += out * 0.4
            else:
                hp_a -= out
                bleed_on_a += prof["bleed"]
                if prof["lifesteal"]:
                    hp_b += out * 0.4

    if hp_a <= 0 and hp_b <= 0:
        return "Draw", turn, total_damage
    if hp_b <= 0:
        return "A", turn, total_damage
    if hp_a <= 0:
        return "B", turn, total_damage
    # timeout → higher remaining hp wins, else draw
    if abs(hp_a - hp_b) < 1.5:
        return "Draw", turn, total_damage
    return ("A" if hp_a > hp_b else "B"), turn, total_damage


def run_simulation(cards_a: List[dict], cards_b: List[dict],
                   matches: int, seed: int,
                   progress_cb=None) -> dict:
    pa = _aggregate_profile(cards_a)
    pb = _aggregate_profile(cards_b)
    wins_a = wins_b = draws = 0
    turn_sum = 0
    dmg_sum = 0.0
    for i in range(matches):
        rng = random.Random(seed + i)
        w, turns, dmg = simulate_match(pa, pb, rng)
        if w == "A":
            wins_a += 1
        elif w == "B":
            wins_b += 1
        else:
            draws += 1
        turn_sum += turns
        dmg_sum += dmg
        if progress_cb and (i % max(1, matches // 50) == 0):
            progress_cb(i + 1)
    if progress_cb:
        progress_cb(matches)

    total = max(1, matches)
    win_rate = round(100 * wins_a / total, 1)
    resource = round((pa["cost"] + pb["cost"]) / 2 * (turn_sum / total) / 3, 1)
    # per-card usage from side A
    card_usage = []
    for c in cards_a:
        prof = _combat_profile(c)
        influence = power_score(c)
        card_usage.append({
            "id": c.get("id"), "name": c.get("name"),
            "usage": round(prof["dmg"], 1), "influence": round(influence, 1),
        })
    card_usage.sort(key=lambda x: x["influence"], reverse=True)

    return {
        "win_rate": win_rate,
        "loss_rate": round(100 * wins_b / total, 1),
        "draw_rate": round(100 * draws / total, 1),
        "wins_a": wins_a, "wins_b": wins_b, "draws": draws,
        "avg_match_length": round(turn_sum / total, 1),
        "avg_damage": round(dmg_sum / total, 1),
        "avg_resource_usage": resource,
        "sample_size": matches,
        "card_usage": card_usage[:8],
    }


def field_baseline(all_cards: List[dict], exclude_id: str = None) -> List[dict]:
    return [c for c in all_cards if c.get("id") != exclude_id] or all_cards


def card_win_rate(card: dict, all_cards: List[dict], matches: int, seed: int) -> Tuple[float, int]:
    """Genuine win rate: card played against each other card, averaged.

    Simulating vs individual opponents (rather than one averaged blob) yields a
    smooth, meaningful 0–100 distribution for balancing.
    """
    field = field_baseline(all_cards, card.get("id"))
    if not field:
        return 50.0, 0
    per = max(6, matches // len(field))
    pa = _combat_profile(card)
    total = 0
    wins = 0.0
    for idx, opp in enumerate(field):
        pb = _combat_profile(opp)
        for i in range(per):
            rng = random.Random(seed + idx * 1009 + i)
            w, _, _ = simulate_match(pa, pb, rng)
            if w == "A":
                wins += 1
            elif w == "Draw":
                wins += 0.5
            total += 1
    return round(100 * wins / max(1, total), 1), total


def balance_state_for(win_rate: float) -> str:
    if win_rate is None:
        return "Not Simulated"
    if win_rate >= 58.0 or win_rate <= 42.0:
        return "Unbalanced"
    return "Balanced"


def confidence_label(sample: int) -> str:
    if sample >= 1000:
        return "High"
    if sample >= 300:
        return "Medium"
    if sample > 0:
        return "Low"
    return "None"


# ---------------- Godot export ----------------
def _gd_str(s: str) -> str:
    return '"' + (s or "").replace('"', '\\"').replace("\n", " ") + '"'


def _gd_array(items: List[str]) -> str:
    return "[" + ", ".join(_gd_str(i) for i in items) + "]"


def generate_gdscript(cards: List[dict], version: str) -> str:
    lines = []
    lines.append("# Auto-generated by Card Dual Studio")
    lines.append(f"# Export version: {version}")
    lines.append(f"# Cards: {len(cards)} — deterministic, do not edit by hand")
    lines.append("class_name CardDualDatabase")
    lines.append("extends Resource")
    lines.append("")
    lines.append("const CARDS: Array[Dictionary] = [")
    for c in cards:
        effs = []
        for e in _effects(c):
            effs.append(
                '{ "trigger": %s, "action": %s, "target": %s, "value": %d }' % (
                    _gd_str(e.get("trigger")), _gd_str(e.get("action")),
                    _gd_str(e.get("target")), int(e.get("value", 0))))
        eff_str = "[" + ", ".join(effs) + "]"
        lines.append("\t{")
        lines.append(f'\t\t"id": {_gd_str(c.get("id"))},')
        lines.append(f'\t\t"name": {_gd_str(c.get("name"))},')
        lines.append(f'\t\t"type": {_gd_str(c.get("type"))},')
        lines.append(f'\t\t"archetype": {_gd_str(c.get("archetype"))},')
        lines.append(f'\t\t"rarity": {_gd_str(c.get("rarity"))},')
        lines.append(f'\t\t"cost": {int(c.get("cost", 0))},')
        lines.append(f'\t\t"resource_type": {_gd_str(c.get("resource_type"))},')
        lines.append(f'\t\t"power": {int(c.get("power", 0))},')
        lines.append(f'\t\t"keywords": {_gd_array(c.get("keywords", []))},')
        lines.append(f'\t\t"tags": {_gd_array(c.get("tags", []))},')
        lines.append(f'\t\t"effects": {eff_str},')
        lines.append(f'\t\t"description": {_gd_str(c.get("description"))},')
        lines.append(f'\t\t"version": {_gd_str(c.get("version"))},')
        lines.append("\t},")
    lines.append("]")
    lines.append("")
    lines.append("static func get_card(card_id: String) -> Dictionary:")
    lines.append("\tfor c in CARDS:")
    lines.append("\t\tif c.id == card_id:")
    lines.append("\t\t\treturn c")
    lines.append("\treturn {}")
    lines.append("")
    return "\n".join(lines)
