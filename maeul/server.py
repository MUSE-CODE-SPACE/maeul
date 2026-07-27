"""⑥ HTTP server — the same engine, reachable from any game engine.

Run it on localhost next to your game (on-device, $0) or on a cheap web box.
Unity/Godot/Unreal/web just POST to /say. Character cards and lore load from a
village directory at startup.

    pip install maeul[server]
    maeul serve --village examples/village --model qwen3:8b
    # then: curl -s localhost:8000/say -d '{"who":"mira","text":"안녕?"}'

Needs FastAPI (optional extra). The core library has zero dependencies.
"""

import glob
import os
from typing import Dict, Optional

from .backends import Backend
from .character import Character
from .director import Villager
from .lore import Lore
from .world import Event, World


def build_app(village_dir: str, model: str = "qwen3:8b",
              base_url: str = "http://localhost:11434/v1",
              api_key: Optional[str] = None, use_embeddings: bool = False):
    try:
        from fastapi import FastAPI
        from pydantic import BaseModel
    except ImportError as e:  # pragma: no cover
        raise ImportError("The server needs FastAPI. Install with `pip install maeul[server]`.") from e

    backend = Backend(model=model, base_url=base_url, api_key=api_key)

    lore = Lore()
    lore_dir = os.path.join(village_dir, "lore")
    if os.path.isdir(lore_dir):
        lore.add_dir(lore_dir)
        if use_embeddings:
            lore.use_embeddings()

    world = World(name=os.path.basename(village_dir.rstrip("/")) or "village")

    villagers: Dict[str, Villager] = {}
    for fp in sorted(glob.glob(os.path.join(village_dir, "*.json")) +
                     glob.glob(os.path.join(village_dir, "*.yaml")) +
                     glob.glob(os.path.join(village_dir, "*.yml"))):
        card = Character.load(fp)
        villagers[card.id] = Villager(character=card, world=world, backend=backend, lore=lore)

    app = FastAPI(title="Maeul", version="0.1.0",
                  description="Money-free LLM engine for game-village NPCs.")

    class SayIn(BaseModel):
        who: str
        text: str = ""
        max_tokens: int = 512

    class WorldIn(BaseModel):
        day: Optional[int] = None
        time: Optional[str] = None
        season: Optional[str] = None
        weather: Optional[str] = None

    class EventIn(BaseModel):
        kind: str
        severity: float = 0.6
        note: str = ""

    @app.get("/health")
    def health():
        return {"ok": True, "model": model, "local": backend.is_local,
                "villagers": list(villagers), "lore_chunks": len(lore.chunks)}

    @app.get("/world")
    def get_world():
        return {"name": world.name, "day": world.day, "time": world.time,
                "season": world.season, "weather": world.weather,
                "events": [e.__dict__ for e in world.events]}

    @app.post("/world")
    def set_world(w: WorldIn):
        for k in ("day", "time", "season", "weather"):
            v = getattr(w, k)
            if v is not None:
                setattr(world, k, v)
        return get_world()

    @app.post("/event")
    def add_event(e: EventIn):
        """Push a live event (a disaster!) that all villagers react to."""
        world.events = [Event(kind=e.kind, severity=e.severity, note=e.note)]
        return get_world()

    @app.post("/event/clear")
    def clear_event():
        world.events = []
        return get_world()

    @app.post("/day")
    def next_day():
        world.day += 1
        for v in villagers.values():
            v.memory.roll_day()
        return {"day": world.day}

    @app.post("/say")
    def say(inp: SayIn):
        v = villagers.get(inp.who)
        if v is None:
            return {"error": f"unknown villager '{inp.who}'", "known": list(villagers)}
        reply = v.say(inp.text, max_tokens=inp.max_tokens)
        return reply.to_dict()

    return app
