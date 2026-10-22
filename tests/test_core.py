"""Offline tests for the dependency-free core: schema, world, character, memory, lore, director."""
from __future__ import annotations

import json
import os

from maeul import Backend, Character, Event, Lore, Memory, Villager, World, parse_reply

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VILLAGE = os.path.join(ROOT, "examples", "village")


class FakeBackend(Backend):
    """Records the prompt it was given and returns a canned model response."""

    def __init__(self, response: str):
        super().__init__(model="fake")
        self.response = response
        self.calls: list[list[dict]] = []

    def chat(self, messages, max_tokens: int = 400) -> str:
        self.calls.append(messages)
        return self.response


# ---- schema -----------------------------------------------------------------

def test_parse_reply_full_json():
    r = parse_reply('{"line": "안녕!", "emotion": "happy", "action": "waves", "topic": "greeting"}')
    assert r.line == "안녕!" and r.emotion == "happy" and r.action == "waves" and r.topic == "greeting"
    assert json.loads(r.to_json())["line"] == "안녕!"


def test_parse_reply_truncated_json_salvages_line():
    r = parse_reply('{"line": "The river is rising fast", "emotion": "scared", "act')
    assert r.line == "The river is rising fast"
    assert r.emotion == "scared"


def test_parse_reply_plain_text_and_unknown_emotion():
    r = parse_reply("```\nJust talking plainly.\n```")
    assert r.line == "Just talking plainly."
    assert r.emotion == "neutral"
    r2 = parse_reply('{"line": "hm", "emotion": "ecstatic", "action": "null"}', fallback_topic="x")
    assert r2.emotion == "neutral" and r2.action is None and r2.topic == "x"


# ---- world ------------------------------------------------------------------

def test_world_day_seed_is_stable_per_day_and_changes_daily():
    w = World(name="Baram", day=1)
    assert w.day_seed("mira") == w.day_seed("mira")
    assert w.day_seed("mira") != World(name="Baram", day=2).day_seed("mira")
    assert w.day_seed("mira") != w.day_seed("tor")


def test_world_situation_mentions_disaster():
    w = World(day=3, time="night", weather="rain")
    assert "calm" in w.situation_block()
    w.events.append(Event(kind="flood", severity=0.9, note="the river burst its banks"))
    assert w.active_disaster().kind == "flood"
    block = w.situation_block()
    assert "DISASTER" in block and "severe flood" in block and "river burst" in block
    assert not Event(kind="festival").is_disaster


# ---- character / memory -----------------------------------------------------

def test_character_loads_json_card_and_renders_persona():
    c = Character.load(os.path.join(VILLAGE, "mira.json"))
    assert c.id == "mira" and c.name == "미라" and c.role == "약초상"
    block = c.persona_block()
    assert "You are 미라, the village 약초상 (age 34)." in block
    assert "You are afraid of: 홍수" in block


def test_character_loads_yaml_card(tmp_path):
    import pytest

    pytest.importorskip("yaml")
    p = tmp_path / "finn.yaml"
    p.write_text("name: Finn\nrole: child\ntraits: [curious]\n", encoding="utf-8")
    c = Character.load(str(p))
    assert c.id == "finn" and c.traits == ["curious"]


def test_memory_is_bounded_and_rolls_days():
    m = Memory(max_long_term=2)
    m.remember("fixed my roof")
    m.remember("fixed my roof")  # duplicate ignored
    m.remember("brought herbs")
    m.remember("saved the well")  # evicts the oldest
    assert list(m.long_term) == ["brought herbs", "saved the well"]
    m.note_today("talked about rain")
    assert "Earlier today" in m.block() and "Things you remember" in m.block()
    m.roll_day()
    assert m.short_term == [] and "Earlier today" not in m.block()


# ---- lore (TF-IDF) ----------------------------------------------------------

def test_lore_tfidf_search_ranks_relevant_chunk():
    lore = Lore(chunk_chars=80)
    lore.add_text("The forge sits by the east gate. Tor hammers iron every dawn.\n\n"
                  "The river floods every spring when the snow melts in the canyon.")
    hits = lore.search("when does the river flood", k=1)
    assert hits and "river" in hits[0][1].text
    block, facts = lore.block("forge iron")
    assert "Relevant world lore" in block and any("forge" in f for f in facts)
    assert Lore().search("anything") == []


def test_lore_add_dir_reads_example_village():
    lore = Lore().add_dir(os.path.join(VILLAGE, "lore"))
    assert len(lore.chunks) > 0
    assert {c.source for c in lore.chunks} >= {"river.md", "forge.md"}


# ---- director ---------------------------------------------------------------

def test_villager_say_builds_prompt_and_parses_reply():
    backend = FakeBackend('{"line": "아이고, 어서 와요", "emotion": "happy", "topic": "greeting"}')
    world = World(name="Baram", day=1, time="morning")
    lore = Lore().add_dir(os.path.join(VILLAGE, "lore"))
    mira = Villager(character=Character.load(os.path.join(VILLAGE, "mira.json")),
                    world=world, backend=backend, lore=lore)

    reply = mira.say("강은 왜 범람해?")
    assert reply.line == "아이고, 어서 와요" and reply.emotion == "happy"
    assert reply.facts, "lore hits should be attached as grounding facts"

    system = backend.calls[0][0]
    assert system["role"] == "system"
    assert "You are 미라" in system["content"]
    assert "Right now it is morning on day 1" in system["content"]
    assert "Return ONLY a compact JSON object" in system["content"]
    assert backend.calls[0][1]["content"].startswith("The player says to you:")
    # the exchange is remembered for today
    assert any("player asked" in s for s in mira.memory.short_term)


def test_villager_disaster_raises_anxiety_in_prompt():
    backend = FakeBackend('{"line": "...", "emotion": "scared"}')
    world = World(events=[Event(kind="earthquake", severity=1.0)])
    v = Villager(character=Character(id="x", name="X", anxiety=0.3), world=world, backend=backend)
    v.say("")
    system = backend.calls[0][0]["content"]
    assert "frightened and tense" in system
    assert backend.calls[0][1]["content"].startswith("No one has spoken")
