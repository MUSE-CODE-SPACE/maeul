"""⑤ Dialogue director — assembles context, calls the model, returns a Reply.

This is the heart of Maeul. For each utterance it stitches together:
  character persona (①) + world situation (②) + memory (③) + retrieved lore (④)
into one prompt, asks the (free, local) model for a single in-character line as
JSON, and parses it into a structured Reply the engine can use.

The "daily-varying dialogue" trick lives here: a per-day seed picks a subtle
focus for each villager, so idle chatter rotates instead of repeating.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from .backends import Backend
from .character import Character
from .lore import Lore
from .memory import Memory
from .schema import EMOTIONS, Reply, parse_reply
from .world import World

# Small rotating focus pool → different flavor each in-game day.
_DAILY_FOCUS = (
    "a small worry on your mind today",
    "a bit of village gossip you heard",
    "something you're looking forward to",
    "a chore or task you should be doing",
    "a memory that surfaced today",
    "an opinion about the weather or season",
    "a question you've been wondering about",
    "a complaint, lightly made",
)

_SYS_RULES = (
    "You role-play a single village NPC in a game. Stay fully in character. "
    "Reply with ONE short spoken line (1-3 sentences), in the same language the "
    "player used. Never break character, never mention being an AI or a model. "
    "Return ONLY a compact JSON object with keys: "
    'line (string, what you say), emotion (one of: {emotions}), '
    "action (short stage direction or null), topic (a few words). "
    "No markdown, no extra text."
).format(emotions=", ".join(EMOTIONS))


@dataclass
class Villager:
    """A live NPC = a character card + its own memory, sharing a world + backend."""
    character: Character
    world: World
    backend: Backend = field(default_factory=Backend)
    lore: Optional[Lore] = None
    memory: Memory = field(default_factory=Memory)

    def _daily_focus(self) -> str:
        idx = self.world.day_seed(self.character.id) % len(_DAILY_FOCUS)
        return _DAILY_FOCUS[idx]

    def _system_prompt(self, retrieved: str) -> str:
        # Anxiety rises during a disaster and with the character's own fearfulness.
        anxiety = self.character.anxiety
        dis = self.world.active_disaster()
        if dis:
            anxiety = min(1.0, anxiety + 0.5 * dis.severity + 0.2)
        mood = ("You feel calm." if anxiety < 0.34 else
                "You feel a little on edge." if anxiety < 0.67 else
                "You feel frightened and tense.")
        blocks = [
            self.character.persona_block(),
            self.world.situation_block(),
            mood,
            f"Today, let your idle remarks lean toward: {self._daily_focus()}.",
        ]
        mem = self.memory.block()
        if mem:
            blocks.append(mem)
        if retrieved:
            blocks.append(retrieved)
        blocks.append(_SYS_RULES)
        return "\n\n".join(blocks)

    def say(self, player_input: str = "", max_tokens: int = 512,
            remember_input: bool = True) -> Reply:
        """Get one in-character line. `player_input` empty = an idle/ambient remark."""
        facts: List[str] = []
        retrieved = ""
        if self.lore is not None and player_input.strip():
            retrieved, facts = self.lore.block(player_input)

        system = self._system_prompt(retrieved)
        if player_input.strip():
            user = f'The player says to you: "{player_input.strip()}"'
        else:
            user = ("No one has spoken. Say a short, natural line to yourself or "
                    "to the air — fitting the time, weather, and your mood.")

        raw = self.backend.chat(
            [{"role": "system", "content": system},
             {"role": "user", "content": user}],
            max_tokens=max_tokens,
        )
        reply = parse_reply(raw, fallback_topic=None)
        if facts:
            reply.facts = facts

        # Light auto-memory: keep a trace of the exchange for continuity.
        if remember_input and player_input.strip():
            self.memory.note_today(f'player asked: "{player_input.strip()[:80]}"')
        if reply.line:
            self.memory.note_today(f"I said: {reply.line[:80]}")
        return reply
