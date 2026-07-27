"""Maeul (마을) — a tiny, money-free LLM engine for game-village NPCs.

Villagers with personalities, dialogue that varies day to day, reactions that
fit the situation (calm at market, terrified in a flood), and RAG-grounded
answers about your game world. Runs on-device via local Ollama ($0) or as a
web server. "OpenAI-compatible" here means the wire format — not a bill.

Quick start (free, local):

    from maeul import Character, World, Villager, Backend, Lore

    world = World(name="Baram", day=1, time="morning", weather="clear")
    mira = Villager(
        character=Character.load("examples/village/mira.yaml"),
        world=world,
        backend=Backend(model="qwen3:8b"),   # local Ollama, no key, $0
    )
    print(mira.say("안녕? 오늘 마을 분위기 어때?").line)
"""
from .backends import Backend, BackendError
from .character import Character
from .director import Villager
from .lore import Lore
from .memory import Memory
from .schema import EMOTIONS, Reply, parse_reply
from .world import Event, World

__version__ = "0.1.0"
__all__ = [
    "Backend", "BackendError", "Character", "Villager", "Lore", "Memory",
    "Reply", "parse_reply", "EMOTIONS", "Event", "World", "__version__",
]
