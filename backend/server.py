from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone

from models import (Card, CardCreate, CardUpdate, StatusTransition,
                    SimulationConfig, new_id, now_iso,
                    CARD_TYPES, ARCHETYPES, RARITIES, RESOURCE_TYPES, KEYWORDS,
                    EFFECT_TRIGGERS, EFFECT_ACTIONS, EFFECT_TARGETS,
                    LIFECYCLE, VALIDATION, BALANCE)
import engine
import seed as seed_module

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Card Dual Studio API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("card_dual")

PROJECT = {"name": "Card Dual Studio", "project": "Card Dual", "version": "1.0"}
CLEAN = {"_id": 0}


async def log_op(operation: str, status: str, summary: str,
                 duration_ms: int = 0, object_id: Optional[str] = None,
                 raw: Optional[dict] = None):
    doc = {
        "id": new_id(), "timestamp": now_iso(), "operation": operation,
        "status": status, "duration_ms": duration_ms, "object_id": object_id,
        "summary": summary, "raw": raw or {},
    }
    await db.execution_logs.insert_one(dict(doc))
    return doc


def apply_engine(card: dict) -> dict:
    errs, warns = engine.validate_card(card)
    card["power_score"] = engine.power_score(card)
    card["complexity_score"] = engine.complexity_score(card)
    card["validation_errors"] = errs
    card["validation_warnings"] = warns
    card["validation_status"] = engine.validation_status(errs, warns)
    return card


# ---------------- Meta ----------------
@api_router.get("/")
async def root():
    return {"service": "Card Dual Studio", "status": "ok"}


@api_router.get("/project")
async def get_project():
    counts = {
        "cards": await db.cards.count_documents({}),
        "approved": await db.cards.count_documents({"lifecycle_status": "Approved"}),
        "exported": await db.cards.count_documents({"lifecycle_status": "Exported"}),
        "simulations": await db.simulations.count_documents({}),
    }
    return {**PROJECT, "counts": counts}


@api_router.get("/meta")
async def get_meta():
    return {
        "card_types": CARD_TYPES, "archetypes": ARCHETYPES, "rarities": RARITIES,
        "resource_types": RESOURCE_TYPES, "keywords": KEYWORDS,
        "effect_triggers": EFFECT_TRIGGERS, "effect_actions": EFFECT_ACTIONS,
        "effect_targets": EFFECT_TARGETS, "lifecycle": LIFECYCLE,
        "validation": VALIDATION, "balance": BALANCE,
        "power_curve_hint": "expected_power = cost * 2.4 + 1",
    }


@api_router.get("/archetypes")
async def list_archetypes():
    out = []
    for a in ARCHETYPES:
        cards = await db.cards.find({"archetype": a}, CLEAN).to_list(1000)
        wrs = [c["win_rate"] for c in cards if c.get("win_rate") is not None]
        out.append({
            "name": a, "card_count": len(cards),
            "avg_win_rate": round(sum(wrs) / len(wrs), 1) if wrs else None,
        })
    return out


# ---------------- Cards ----------------
@api_router.get("/cards")
async def list_cards(search: Optional[str] = None, type: Optional[str] = None,
                     archetype: Optional[str] = None, rarity: Optional[str] = None,
                     status: Optional[str] = None, balance: Optional[str] = None,
                     cost: Optional[int] = None, sort: str = "name"):
    q = {}
    if type:
        q["type"] = type
    if archetype:
        q["archetype"] = archetype
    if rarity:
        q["rarity"] = rarity
    if status:
        q["lifecycle_status"] = status
    if balance:
        q["balance_status"] = balance
    if cost is not None:
        q["cost"] = cost
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
        ]
    cards = await db.cards.find(q, CLEAN).to_list(2000)

    sort_key = {
        "name": lambda c: c.get("name", "").lower(),
        "power": lambda c: -(c.get("power_score") or 0),
        "win_rate": lambda c: -(c.get("win_rate") or -1),
        "modified": lambda c: c.get("updated_at", ""),
    }.get(sort, lambda c: c.get("name", "").lower())
    reverse = sort == "modified"
    cards.sort(key=sort_key, reverse=reverse)
    return cards


@api_router.get("/cards/{card_id}")
async def get_card(card_id: str):
    card = await db.cards.find_one({"id": card_id}, CLEAN)
    if not card:
        raise HTTPException(404, "Card not found")
    return card


@api_router.post("/cards")
async def create_card(payload: CardCreate):
    card = Card(**payload.model_dump())
    d = card.model_dump()
    d = apply_engine(d)
    d["lifecycle_status"] = "Draft"
    await db.cards.insert_one(dict(d))
    await log_op("Card generated" if payload.ai_generated else "Card created",
                 "success", f"{d['name']} ({d['archetype']} {d['rarity']})",
                 object_id=d["id"], raw={"power_score": d["power_score"]})
    return await db.cards.find_one({"id": d["id"]}, CLEAN)


@api_router.put("/cards/{card_id}")
async def update_card(card_id: str, payload: CardUpdate):
    card = await db.cards.find_one({"id": card_id}, CLEAN)
    if not card:
        raise HTTPException(404, "Card not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    card.update(updates)
    card = apply_engine(card)
    card["updated_at"] = now_iso()
    # editing an approved/exported card sends it back for review
    if card["lifecycle_status"] in ("Approved", "Exported", "Valid"):
        card["lifecycle_status"] = card["validation_status"] if card["validation_status"] in ("Valid", "Needs Review", "Invalid") else "Draft"
    await db.cards.replace_one({"id": card_id}, dict(card))
    return await db.cards.find_one({"id": card_id}, CLEAN)


@api_router.post("/cards/{card_id}/validate")
async def validate_card_endpoint(card_id: str):
    start = datetime.now(timezone.utc)
    card = await db.cards.find_one({"id": card_id}, CLEAN)
    if not card:
        raise HTTPException(404, "Card not found")
    await log_op("Validation started", "running", f"Validating {card['name']}",
                 object_id=card_id)
    card = apply_engine(card)
    vs = card["validation_status"]
    if vs == "Valid" and card["lifecycle_status"] in ("Draft", "Proposed", "Needs Review", "Invalid"):
        card["lifecycle_status"] = "Valid"
    elif vs == "Needs Review":
        card["lifecycle_status"] = "Needs Review"
    elif vs == "Invalid":
        card["lifecycle_status"] = "Draft"
    card["updated_at"] = now_iso()
    await db.cards.replace_one({"id": card_id}, dict(card))
    dur = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    await log_op("Validation completed",
                 "success" if vs == "Valid" else ("warning" if vs == "Needs Review" else "error"),
                 f"{card['name']} → {vs} ({len(card['validation_errors'])} errors, {len(card['validation_warnings'])} warnings)",
                 duration_ms=dur, object_id=card_id,
                 raw={"errors": card["validation_errors"], "warnings": card["validation_warnings"]})
    return await db.cards.find_one({"id": card_id}, CLEAN)


@api_router.post("/cards/{card_id}/status")
async def transition_status(card_id: str, t: StatusTransition):
    card = await db.cards.find_one({"id": card_id}, CLEAN)
    if not card:
        raise HTTPException(404, "Card not found")
    action = t.action
    vs = card["validation_status"]
    ls = card["lifecycle_status"]
    if action == "propose":
        card["lifecycle_status"] = "Proposed"
    elif action == "review":
        card["lifecycle_status"] = "Needs Review"
    elif action == "approve":
        if vs != "Valid":
            raise HTTPException(400, "Only Valid cards can be approved. Run validation first.")
        card["lifecycle_status"] = "Approved"
    elif action == "revert_draft":
        card["lifecycle_status"] = "Draft"
    elif action == "export":
        if ls != "Approved":
            raise HTTPException(400, "Only Approved cards can be exported.")
        card["lifecycle_status"] = "Exported"
    card["updated_at"] = now_iso()
    await db.cards.replace_one({"id": card_id}, dict(card))
    await log_op("Status changed", "success",
                 f"{card['name']}: {ls} → {card['lifecycle_status']}", object_id=card_id)
    return await db.cards.find_one({"id": card_id}, CLEAN)


@api_router.delete("/cards/{card_id}")
async def delete_card(card_id: str):
    card = await db.cards.find_one({"id": card_id}, CLEAN)
    if not card:
        raise HTTPException(404, "Card not found")
    await db.cards.delete_one({"id": card_id})
    await log_op("Card deleted", "warning", f"Removed {card['name']}", object_id=card_id)
    return {"ok": True}


@api_router.get("/cards/{card_id}/versions")
async def card_versions(card_id: str):
    docs = await db.card_versions.find({"card_id": card_id}, CLEAN).to_list(100)
    docs.sort(key=lambda d: d.get("version", ""))
    return docs


@api_router.get("/cards/{card_id}/relations")
async def card_relations(card_id: str):
    card = await db.cards.find_one({"id": card_id}, CLEAN)
    if not card:
        raise HTTPException(404, "Card not found")
    all_cards = await db.cards.find({}, CLEAN).to_list(2000)
    my_kw = set(card.get("keywords", []))
    my_tags = set(card.get("tags", []))
    synergies, counters, related = [], [], []
    my_bleed = any(e.get("action") == "Apply Bleed" for e in card.get("effects", [])) or "Bleed" in my_kw
    for c in all_cards:
        if c["id"] == card_id:
            continue
        ckw = set(c.get("keywords", []))
        ctags = set(c.get("tags", []))
        shared = my_kw & ckw
        # synergy: same archetype + shared keyword/tag, or buff/draw enablers
        if c["archetype"] == card["archetype"] and (shared or (my_tags & ctags)):
            synergies.append({"id": c["id"], "name": c["name"],
                              "reason": f"Shares {', '.join(shared) or 'archetype tags'}"})
        # counter: cards that heal/shield counter bleed/burn aggression
        heals = any(e.get("action") in ("Heal", "Gain Shield") for e in c.get("effects", [])) or ("Shield" in ckw or "Regenerate" in ckw)
        if my_bleed and heals:
            counters.append({"id": c["id"], "name": c["name"], "reason": "Sustain counters Bleed/Burn pressure"})
        if c["archetype"] == card["archetype"] and c["id"] not in [s["id"] for s in synergies]:
            related.append({"id": c["id"], "name": c["name"]})
    return {"synergies": synergies[:6], "counters": counters[:6], "related": related[:6]}


# ---------------- Simulations ----------------
async def _resolve_side(mode: str, members: List[str], all_cards: List[dict]) -> List[dict]:
    if mode == "Archetype vs Archetype":
        return [c for c in all_cards if c["archetype"] in members] or all_cards
    return [c for c in all_cards if c["id"] in members]


async def _run_sim_task(sim_id: str, cfg: dict):
    all_cards = await db.cards.find({}, CLEAN).to_list(2000)
    a = await _resolve_side(cfg["mode"], cfg["side_a"], all_cards)
    b = await _resolve_side(cfg["mode"], cfg["side_b"], all_cards)
    if not a or not b:
        await db.simulations.update_one({"id": sim_id}, {"$set": {
            "status": "failed", "error": "Both sides must have at least one card.",
            "finished_at": now_iso()}})
        await log_op("Simulation failed", "error", "Empty side configuration", object_id=sim_id)
        return

    matches = cfg["matches"]

    def progress(done):
        pct = int(100 * done / max(1, matches))
        db.simulations.update_one({"id": sim_id},
                                  {"$set": {"progress": pct, "completed": done}})

    # motor is async; run sim synchronously then persist (fast for our scale),
    # but push periodic progress via fire-and-forget updates.
    import asyncio
    result_holder = {}

    def _do():
        prog_state = {"last": -1}

        def cb(done):
            prog_state["last"] = done
        res = engine.run_simulation(a, b, matches, cfg["seed"], progress_cb=cb)
        result_holder["res"] = res
        result_holder["last"] = prog_state["last"]

    # step through in chunks to update progress in DB
    step = max(1, matches // 20)
    done = 0
    import random
    from engine import _aggregate_profile, simulate_match, power_score
    pa = _aggregate_profile(a)
    pb = _aggregate_profile(b)
    wins_a = wins_b = draws = 0
    turn_sum = 0
    dmg_sum = 0.0
    for i in range(matches):
        rng = random.Random(cfg["seed"] + i)
        w, turns, dmg = simulate_match(pa, pb, rng)
        if w == "A":
            wins_a += 1
        elif w == "B":
            wins_b += 1
        else:
            draws += 1
        turn_sum += turns
        dmg_sum += dmg
        done += 1
        if done % step == 0:
            pct = int(100 * done / matches)
            await db.simulations.update_one({"id": sim_id},
                                            {"$set": {"progress": pct, "completed": done}})
            await asyncio.sleep(0)  # yield to event loop for polling
    total = max(1, matches)
    card_usage = []
    for c in a:
        card_usage.append({"id": c["id"], "name": c["name"],
                           "usage": round(engine._combat_profile(c)["dmg"], 1),
                           "influence": round(power_score(c), 1)})
    card_usage.sort(key=lambda x: x["influence"], reverse=True)
    res = {
        "win_rate": round(100 * wins_a / total, 1),
        "loss_rate": round(100 * wins_b / total, 1),
        "draw_rate": round(100 * draws / total, 1),
        "wins_a": wins_a, "wins_b": wins_b, "draws": draws,
        "avg_match_length": round(turn_sum / total, 1),
        "avg_damage": round(dmg_sum / total, 1),
        "avg_resource_usage": round((pa["cost"] + pb["cost"]) / 2 * (turn_sum / total) / 3, 1),
        "sample_size": matches, "card_usage": card_usage[:8],
    }
    await db.simulations.update_one({"id": sim_id}, {"$set": {
        "status": "completed", "progress": 100, "completed": matches,
        "result": res, "finished_at": now_iso()}})
    await log_op("Simulation completed", "success",
                 f"{cfg['label_a']} vs {cfg['label_b']}: {res['win_rate']}% / {res['draw_rate']}% / {res['loss_rate']}% ({matches} matches)",
                 object_id=sim_id, raw=res)


@api_router.post("/simulations")
async def create_simulation(cfg: SimulationConfig, bg: BackgroundTasks):
    sim_id = new_id()
    doc = {
        "id": sim_id, "status": "running", "progress": 0, "completed": 0,
        "config": cfg.model_dump(), "mode": cfg.mode,
        "label_a": cfg.label_a, "label_b": cfg.label_b,
        "matches": cfg.matches, "seed": cfg.seed,
        "sim_version": cfg.sim_version, "ruleset_version": cfg.ruleset_version,
        "result": None, "error": None,
        "created_at": now_iso(), "finished_at": None,
    }
    await db.simulations.insert_one(dict(doc))
    await log_op("Simulation started", "running",
                 f"{cfg.label_a} vs {cfg.label_b} — {cfg.matches} matches, seed {cfg.seed}",
                 object_id=sim_id, raw=cfg.model_dump())
    bg.add_task(_run_sim_task, sim_id, cfg.model_dump())
    return {"id": sim_id, "status": "running"}


@api_router.get("/simulations")
async def list_simulations():
    sims = await db.simulations.find({}, CLEAN).to_list(200)
    sims.sort(key=lambda s: s.get("created_at", ""), reverse=True)
    return sims


@api_router.get("/simulations/{sim_id}")
async def get_simulation(sim_id: str):
    sim = await db.simulations.find_one({"id": sim_id}, CLEAN)
    if not sim:
        raise HTTPException(404, "Simulation not found")
    return sim


@api_router.get("/matchup-matrix")
async def matchup_matrix(matches: int = 120):
    """Genuine archetype-vs-archetype win-rate matrix."""
    all_cards = await db.cards.find({}, CLEAN).to_list(2000)
    arch = ARCHETYPES
    matrix = []
    for a in arch:
        row = []
        a_cards = [c for c in all_cards if c["archetype"] == a]
        for b in arch:
            b_cards = [c for c in all_cards if c["archetype"] == b]
            if not a_cards or not b_cards:
                row.append(None)
                continue
            res = engine.run_simulation(a_cards, b_cards, matches, 11)
            row.append(res["win_rate"])
        matrix.append(row)
    return {"archetypes": arch, "matrix": matrix, "matches": matches}


# ---------------- Balance ----------------
@api_router.get("/balance/report")
async def balance_report():
    cards = await db.cards.find({"win_rate": {"$ne": None}}, CLEAN).to_list(2000)
    for c in cards:
        c["win_rate_delta"] = None
        if c.get("prev_win_rate") is not None and c.get("win_rate") is not None:
            c["win_rate_delta"] = round(c["win_rate"] - c["prev_win_rate"], 1)
        c["confidence"] = engine.confidence_label(c.get("sample_size", 0))
    high = sorted([c for c in cards if c["win_rate"] >= 54], key=lambda c: -c["win_rate"])
    low = sorted([c for c in cards if c["win_rate"] <= 46], key=lambda c: c["win_rate"])
    unbalanced = [c for c in cards if c.get("balance_status") == "Unbalanced"]
    anomalies = sorted(cards, key=lambda c: -abs((c.get("win_rate_delta") or 0)))[:8]
    return {
        "total": len(cards),
        "unbalanced_count": len(unbalanced),
        "high_win_rate": high[:10],
        "low_win_rate": low[:10],
        "recent_changes": anomalies,
        "all": sorted(cards, key=lambda c: -c["win_rate"]),
    }


@api_router.post("/balance/recompute")
async def recompute_balance():
    start = datetime.now(timezone.utc)
    await log_op("Balance analysis started", "running", "Recomputing win rates vs field")
    cards = await db.cards.find({}, CLEAN).to_list(2000)
    for c in cards:
        wr, sample = engine.card_win_rate(c, cards, matches=250, seed=7)
        prev = c.get("win_rate")
        await db.cards.update_one({"id": c["id"]}, {"$set": {
            "prev_win_rate": prev if prev is not None else c.get("prev_win_rate"),
            "win_rate": wr, "sample_size": sample,
            "balance_status": engine.balance_state_for(wr)}})
    dur = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    await log_op("Balance analysis completed", "success",
                 f"Recomputed win rates for {len(cards)} cards", duration_ms=dur)
    return {"ok": True, "count": len(cards)}


@api_router.get("/logs")
async def get_logs(limit: int = 200):
    logs = await db.execution_logs.find({}, CLEAN).to_list(1000)
    logs.sort(key=lambda l: l.get("timestamp", ""), reverse=True)
    return logs[:limit]


# ---------------- Export ----------------
@api_router.get("/export/preview")
async def export_preview():
    approved = await db.cards.find(
        {"lifecycle_status": {"$in": ["Approved", "Exported"]}}, CLEAN).to_list(2000)
    approved.sort(key=lambda c: c["name"].lower())
    return {"version": PROJECT["version"], "eligible": approved,
            "count": len(approved)}


@api_router.post("/export/godot")
async def export_godot():
    start = datetime.now(timezone.utc)
    await log_op("Export started", "running", "Generating Godot 4 GDScript")
    approved = await db.cards.find({"lifecycle_status": "Approved"}, CLEAN).to_list(2000)
    already = await db.cards.find({"lifecycle_status": "Exported"}, CLEAN).to_list(2000)
    export_set = approved + already
    if not export_set:
        await log_op("Export failed", "error", "No approved cards to export")
        raise HTTPException(400, "No approved cards eligible for export.")
    export_set.sort(key=lambda c: c["name"].lower())
    code = engine.generate_gdscript(export_set, PROJECT["version"])
    for c in approved:
        await db.cards.update_one({"id": c["id"]},
                                  {"$set": {"lifecycle_status": "Exported", "updated_at": now_iso()}})
    dur = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    await log_op("Export completed", "success",
                 f"Generated card_database.gd with {len(export_set)} cards",
                 duration_ms=dur, raw={"cards": len(export_set), "version": PROJECT["version"]})
    return {"filename": f"card_database_v{PROJECT['version']}.gd",
            "code": code, "count": len(export_set), "version": PROJECT["version"]}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    await seed_module.seed_database(db)
    logger.info("Card Dual Studio ready.")


@app.on_event("shutdown")
async def _shutdown():
    client.close()
