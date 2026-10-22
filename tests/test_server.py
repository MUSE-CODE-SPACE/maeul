"""HTTP server tests (need the `server` extra); the model call is stubbed."""
from __future__ import annotations

import os

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from maeul import Backend  # noqa: E402
from maeul.server import build_app  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VILLAGE = os.path.join(ROOT, "examples", "village")


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(Backend, "chat",
                        lambda self, messages, max_tokens=400: '{"line": "hi", "emotion": "happy"}')
    return TestClient(build_app(VILLAGE, model="fake"))


def test_health_lists_villagers_and_lore(client):
    data = client.get("/health").json()
    assert data["ok"] and data["local"]
    assert {"mira", "tor", "finn", "sena"} <= set(data["villagers"])
    assert data["lore_chunks"] > 0


def test_world_event_and_day_roundtrip(client):
    assert client.post("/world", json={"time": "night", "weather": "rain"}).json()["time"] == "night"
    w = client.post("/event", json={"kind": "flood", "severity": 0.8}).json()
    assert w["events"][0]["kind"] == "flood"
    assert client.post("/event/clear").json()["events"] == []
    assert client.post("/day").json()["day"] == 2


def test_say_returns_structured_reply(client):
    r = client.post("/say", json={"who": "mira", "text": "안녕?"}).json()
    assert r["line"] == "hi" and r["emotion"] == "happy"
    bad = client.post("/say", json={"who": "nobody"}).json()
    assert "error" in bad and "mira" in bad["known"]
