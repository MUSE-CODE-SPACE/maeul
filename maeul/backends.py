"""Model backends — money-free by default.

Design principle #1: Maeul costs nothing to run. The default backend is your
*local* model via Ollama. "OpenAI-compatible" here means the wire format only
(the de-facto standard that Ollama, llama.cpp, and LM Studio all speak) — it
does NOT mean you pay OpenAI. A hosted provider is an optional opt-in.

Only the standard library is used, so the core has zero pip dependencies.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import List, Optional


class BackendError(RuntimeError):
    pass


@dataclass
class Backend:
    """A chat model endpoint that speaks the OpenAI /chat/completions shape.

    Defaults point at a local Ollama server — free, offline, no key.
    Point `base_url`/`api_key` elsewhere only if you *want* a hosted model.
    """
    model: str = "qwen3:8b"
    base_url: str = "http://localhost:11434/v1"   # local Ollama, $0
    api_key: Optional[str] = None                  # None for local; set for hosted
    temperature: float = 0.7
    timeout: float = 120.0
    # Some local models (Qwen3, DeepSeek-R1) "think" out loud; off by default for
    # snappy in-game lines. Sent as an Ollama extension; ignored by others.
    think: bool = False

    @classmethod
    def from_env(cls) -> "Backend":
        """Build from env vars so games/servers can be configured without code.

        MAEUL_MODEL, MAEUL_BASE_URL, MAEUL_API_KEY, MAEUL_TEMPERATURE.
        With nothing set, you get free local Ollama.
        """
        return cls(
            model=os.environ.get("MAEUL_MODEL", cls.model),
            base_url=os.environ.get("MAEUL_BASE_URL", cls.base_url),
            api_key=os.environ.get("MAEUL_API_KEY") or None,
            temperature=float(os.environ.get("MAEUL_TEMPERATURE", cls.temperature)),
        )

    @property
    def is_local(self) -> bool:
        host = self.base_url.split("//", 1)[-1]
        return host.startswith(("localhost", "127.0.0.1", "0.0.0.0"))

    def chat(self, messages: List[dict], max_tokens: int = 400) -> str:
        """Send messages, return the assistant text. Raises BackendError on failure."""
        body = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        # Ollama-specific hint to disable chain-of-thought for a clean line.
        if self.think is False and self.is_local:
            body["think"] = False

        req = urllib.request.Request(
            self.base_url.rstrip("/") + "/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                **({"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}),
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                data = json.load(r)
        except urllib.error.URLError as e:
            hint = ""
            if self.is_local:
                hint = ("  (Is Ollama running? Start it with `ollama serve`, "
                        f"and make sure `{self.model}` is pulled: `ollama pull {self.model}`.)")
            raise BackendError(f"Backend request failed: {e}{hint}") from e
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise BackendError(f"Unexpected backend response: {data}") from e


def embed(texts: List[str], model: str = "nomic-embed-text",
          base_url: str = "http://localhost:11434") -> Optional[List[List[float]]]:
    """Optional: local embeddings via Ollama (also free). Returns None if the
    embed model isn't available, so callers fall back to the built-in TF-IDF
    retriever and nothing ever breaks or costs money."""
    out = []
    for t in texts:
        try:
            req = urllib.request.Request(
                base_url.rstrip("/") + "/api/embeddings",
                data=json.dumps({"model": model, "prompt": t}).encode("utf-8"),
                headers={"Content-Type": "application/json"}, method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                out.append(json.load(r)["embedding"])
        except Exception:
            return None
    return out
