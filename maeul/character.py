"""① Character cards — data-driven villager personalities.

A card is just a file (YAML or JSON) a designer can hand-author. It defines who
the villager is, how they talk, what they fear, what they know, and who they
know. The director turns this into the villager's system persona.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class Character:
    id: str
    name: str
    role: str = ""                                  # "blacksmith", "child", "elder"
    age: Optional[int] = None
    persona: str = ""                               # one-paragraph who-they-are
    traits: List[str] = field(default_factory=list) # ["gruff", "kind", "curious"]
    speech_style: str = ""                          # "short, blunt sentences; old dialect"
    likes: List[str] = field(default_factory=list)
    dislikes: List[str] = field(default_factory=list)
    fears: List[str] = field(default_factory=list)  # drives disaster reactions
    catchphrases: List[str] = field(default_factory=list)
    knowledge: List[str] = field(default_factory=list)   # what topics they can speak to
    relationships: Dict[str, str] = field(default_factory=dict)  # {"mira": "my daughter"}
    # Baseline mood 0..1 (calm..anxious); world events push it around at runtime.
    anxiety: float = 0.3

    @classmethod
    def load(cls, path: str) -> "Character":
        with open(path, "r", encoding="utf-8") as f:
            raw = f.read()
        if path.endswith((".yaml", ".yml")):
            data = _load_yaml(raw)
        else:
            data = json.loads(raw)
        if "id" not in data:
            data["id"] = os.path.splitext(os.path.basename(path))[0]
        known = cls.__dataclass_fields__.keys()
        return cls(**{k: v for k, v in data.items() if k in known})

    def persona_block(self) -> str:
        """Render the card into a compact persona the model reads each turn."""
        lines = [f"You are {self.name}"]
        if self.role:
            lines[0] += f", the village {self.role}"
        if self.age:
            lines[0] += f" (age {self.age})"
        lines[0] += "."
        if self.persona:
            lines.append(self.persona)
        if self.traits:
            lines.append("Personality: " + ", ".join(self.traits) + ".")
        if self.speech_style:
            lines.append("Speech style: " + self.speech_style)
        if self.catchphrases:
            lines.append("You sometimes say things like: " +
                         "; ".join(f'"{c}"' for c in self.catchphrases) + ".")
        if self.likes:
            lines.append("You like: " + ", ".join(self.likes) + ".")
        if self.dislikes:
            lines.append("You dislike: " + ", ".join(self.dislikes) + ".")
        if self.fears:
            lines.append("You are afraid of: " + ", ".join(self.fears) + ".")
        if self.relationships:
            rel = "; ".join(f"{k} is {v}" for k, v in self.relationships.items())
            lines.append("People you know: " + rel + ".")
        if self.knowledge:
            lines.append("You can talk knowledgeably about: " + ", ".join(self.knowledge) + ".")
        return "\n".join(lines)


def _load_yaml(raw: str) -> dict:
    try:
        import yaml  # optional dep; only needed for .yaml cards
    except ImportError as e:  # pragma: no cover
        raise ImportError(
            "PyYAML is needed for .yaml character cards. Install with "
            "`pip install maeul[yaml]`, or use .json cards for zero dependencies."
        ) from e
    return yaml.safe_load(raw)
