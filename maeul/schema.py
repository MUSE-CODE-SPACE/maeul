"""Structured NPC reply — the thing a game engine actually consumes.

A villager's line is never just text. The engine wants an *emotion* (to pick a
face / animation), an optional *action* (a gesture or state change), and the
*topic* (so the game can react or log it). Maeul always returns this shape.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field, asdict
from typing import List, Optional

# A small, fixed emotion set keeps animation mapping simple on the engine side.
EMOTIONS = (
    "neutral", "happy", "sad", "angry", "scared", "surprised", "tired", "excited", "worried",
)


@dataclass
class Reply:
    """One villager utterance, ready for the engine."""
    line: str
    emotion: str = "neutral"
    action: Optional[str] = None      # e.g. "waves", "backs away", "points north"
    topic: Optional[str] = None       # short tag: "weather", "the earthquake", "the well"
    facts: List[str] = field(default_factory=list)  # lore snippets used (RAG grounding)

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


_JSON_BLOCK = re.compile(r"\{.*\}", re.S)
# Grab a "key": "value" string even from TRUNCATED JSON (no closing quote/brace).
_STR_FIELD = r'"{key}"\s*:\s*"((?:[^"\\]|\\.)*)'


def _field(raw: str, key: str) -> Optional[str]:
    m = re.search(_STR_FIELD.format(key=key), raw, re.S)
    if not m:
        return None
    val = m.group(1)
    # Unescape common sequences; drop a dangling backslash from truncation.
    val = val.replace('\\"', '"').replace("\\n", " ").replace("\\/", "/").rstrip("\\")
    return val.strip()


def parse_reply(raw: str, fallback_topic: Optional[str] = None) -> Reply:
    """Parse a model response into a Reply — tolerant of messy or TRUNCATED JSON.

    Order of attempts:
      1) a complete {...} JSON block,
      2) regex-extract fields from partial/truncated JSON (grab `line` even if
         the model was cut off mid-object),
      3) fall back to the raw text as the spoken line.
    Emotion is normalized to the known set (unknown -> neutral).
    """
    raw = (raw or "").strip()
    data = None
    m = _JSON_BLOCK.search(raw)
    if m:
        try:
            data = json.loads(m.group(0))
        except Exception:
            data = None

    if isinstance(data, dict) and ("line" in data or "text" in data):
        line = str(data.get("line") or data.get("text") or "").strip()
        emotion = str(data.get("emotion") or "neutral").strip().lower()
        action = data.get("action") or None
        topic = data.get("topic") or fallback_topic
        facts = data.get("facts") or []
    else:
        # Full parse failed — try to salvage fields from partial/truncated JSON.
        line = _field(raw, "line") or _field(raw, "text") or ""
        emotion = (_field(raw, "emotion") or "neutral").lower()
        action = _field(raw, "action")
        topic = _field(raw, "topic") or fallback_topic
        facts = []
        if not line:
            # No JSON at all — the model just spoke plainly. Strip stray fences.
            line = re.sub(r"^```[a-z]*|```$", "", raw).strip()

    if action in ("", "null", "none", "None"):
        action = None
    if emotion not in EMOTIONS:
        emotion = "neutral"
    if not isinstance(facts, list):
        facts = [str(facts)]
    return Reply(line=line.strip(), emotion=emotion, action=action, topic=topic, facts=list(facts))
