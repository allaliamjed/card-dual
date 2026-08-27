"""Pydantic models for Card Dual Studio."""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal, Any
from datetime import datetime, timezone
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---- Enumerations (kept as plain strings for flexibility) ----
CARD_TYPES = ["Unit", "Spell", "Trap", "Structure", "Hero"]
ARCHETYPES = ["Shadow", "Ember", "Tech", "Arcane", "Neutral"]
RARITIES = ["Common", "Rare", "Epic", "Legendary", "Mythic"]
RESOURCE_TYPES = ["Blood", "Mana", "Energy", "Essence"]
KEYWORDS = ["Bleed", "Burn", "Shield", "Lifesteal", "Rush", "Taunt",
            "Pierce", "Regenerate", "Overload", "Echo", "Stealth", "Cleave"]
EFFECT_TRIGGERS = ["On Play", "On Death", "Start of Turn", "On Attack", "Passive"]
EFFECT_ACTIONS = ["Deal Damage", "Apply Bleed", "Draw", "Gain Shield",
                  "Heal", "Buff", "Summon"]
EFFECT_TARGETS = ["Enemy Hero", "Random Enemy", "All Enemies", "Self", "Ally"]

LIFECYCLE = ["Draft", "Proposed", "Needs Review", "Valid", "Approved", "Exported"]
VALIDATION = ["Valid", "Needs Review", "Invalid", "Unvalidated"]
BALANCE = ["Not Simulated", "Simulating", "Balanced", "Unbalanced"]


class Effect(BaseModel):
    id: str = Field(default_factory=new_id)
    trigger: str = "On Play"
    action: str = "Deal Damage"
    target: str = "Enemy Hero"
    value: int = 1


class CardBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = "New Card"
    type: str = "Unit"
    archetype: str = "Neutral"
    rarity: str = "Common"
    cost: int = 1
    resource_type: str = "Mana"
    power: int = 1
    abilities: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    effects: List[Effect] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    description: str = ""
    notes: str = ""
    artwork_key: str = "art-1"


class Card(CardBase):
    id: str = Field(default_factory=new_id)
    version: str = "0.1"
    lifecycle_status: str = "Draft"
    validation_status: str = "Unvalidated"
    balance_status: str = "Not Simulated"
    power_score: float = 0.0
    complexity_score: float = 0.0
    win_rate: Optional[float] = None
    prev_win_rate: Optional[float] = None
    sample_size: int = 0
    validation_errors: List[str] = Field(default_factory=list)
    validation_warnings: List[str] = Field(default_factory=list)
    ai_generated: bool = False
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class CardCreate(CardBase):
    ai_generated: bool = False


class CardUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    type: Optional[str] = None
    archetype: Optional[str] = None
    rarity: Optional[str] = None
    cost: Optional[int] = None
    resource_type: Optional[str] = None
    power: Optional[int] = None
    abilities: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    effects: Optional[List[Effect]] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    artwork_key: Optional[str] = None


class StatusTransition(BaseModel):
    action: Literal["propose", "review", "approve", "revert_draft", "export"]


class SimulationConfig(BaseModel):
    mode: str = "Card vs Card"  # Card vs Card, Deck vs Deck, Archetype vs Archetype
    side_a: List[str] = Field(default_factory=list)  # card ids / archetype names
    side_b: List[str] = Field(default_factory=list)
    label_a: str = "Side A"
    label_b: str = "Side B"
    matches: int = 500
    seed: int = 42
    sim_version: str = "1.0"
    ruleset_version: str = "1.0"
