"""③ Memory — so a villager remembers today, and remembers you.

Two tiers, deliberately small (game NPCs don't need a database):
  - short_term: what happened *today* (cleared when the day rolls over)
  - long_term : a bounded list of durable facts ("the player fixed my roof")

Bounded on purpose: memory is injected into every prompt, so it must stay
cheap. When long-term fills up, the oldest entries drop. This mirrors how a
minor character would realistically only hold a handful of standout memories.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Deque, List


@dataclass
class Memory:
    max_long_term: int = 12
    short_term: List[str] = field(default_factory=list)
    long_term: Deque[str] = field(default_factory=lambda: deque(maxlen=12))

    def __post_init__(self):
        # Honor max_long_term even though the default factory hard-codes 12.
        if self.long_term.maxlen != self.max_long_term:
            self.long_term = deque(self.long_term, maxlen=self.max_long_term)

    def note_today(self, text: str) -> None:
        """Record something that happened today (a chat, an event, a chore)."""
        text = text.strip()
        if text:
            self.short_term.append(text)

    def remember(self, fact: str) -> None:
        """Promote a durable memory (survives across days). Oldest drops when full."""
        fact = fact.strip()
        if fact and fact not in self.long_term:
            self.long_term.append(fact)

    def roll_day(self) -> None:
        """New day: forget the small stuff, keep the durable stuff."""
        self.short_term.clear()

    def block(self) -> str:
        """Render memory for the prompt (empty string if nothing worth saying)."""
        parts = []
        if self.long_term:
            parts.append("Things you remember: " + " ".join(f"- {m}" for m in self.long_term))
        if self.short_term:
            parts.append("Earlier today: " + " ".join(f"- {m}" for m in self.short_term[-6:]))
        return "\n".join(parts)
