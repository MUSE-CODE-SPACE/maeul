"""② World context — the reason a villager says something *different* today.

The same villager should greet you differently on a sunny market morning than
during a midnight flood. The World holds the shared, changing state — day,
time, season, weather, and any active event (a disaster!) — and turns it into a
short situation the model reads. It also seeds a per-day "mood of the town" so
dialogue rotates instead of repeating.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import List, Optional

TIMES = ("dawn", "morning", "noon", "afternoon", "evening", "night")
SEASONS = ("spring", "summer", "autumn", "winter")


@dataclass
class Event:
    """Something happening in the world right now (often a crisis)."""
    kind: str                      # "earthquake", "flood", "festival", "bandit_raid"
    severity: float = 0.5          # 0..1
    note: str = ""                 # free text: "the river burst its banks at the mill"

    @property
    def is_disaster(self) -> bool:
        return self.kind in {
            "earthquake", "flood", "fire", "storm", "plague", "bandit_raid", "famine",
        }


@dataclass
class World:
    name: str = "the village"
    day: int = 1
    time: str = "morning"
    season: str = "spring"
    weather: str = "clear"
    events: List[Event] = field(default_factory=list)

    def active_disaster(self) -> Optional[Event]:
        for e in self.events:
            if e.is_disaster:
                return e
        return None

    def day_seed(self, salt: str = "") -> int:
        """Deterministic per-day seed so 'today's topic' is stable within a day
        but changes day to day. Same day + same villager = same nudge."""
        h = hashlib.sha256(f"{self.name}|{self.day}|{salt}".encode()).hexdigest()
        return int(h[:8], 16)

    def situation_block(self) -> str:
        """Compact situation the model reads every turn."""
        lines = [f"Right now it is {self.time} on day {self.day}, {self.season}, "
                 f"weather {self.weather}, in {self.name}."]
        dis = self.active_disaster()
        if dis:
            sev = ("a minor" if dis.severity < 0.34 else
                   "a serious" if dis.severity < 0.67 else "a severe")
            lines.append(f"A DISASTER is happening: {sev} {dis.kind}. {dis.note}".strip())
            lines.append("React the way YOUR character would to real danger — fear, "
                         "urgency, or grim resolve depending on your personality. "
                         "Do not be cheerful or make small talk as if nothing is wrong.")
        else:
            lines.append("The village is calm; ordinary daily life. Small talk, "
                         "gossip, chores, and passing thoughts are appropriate.")
        return "\n".join(lines)
