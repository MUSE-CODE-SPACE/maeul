"""④ RAG lore — grounded answers about YOUR game world, offline and free.

A villager shouldn't hallucinate the world's history. Drop your lore in as
plain markdown/text files; Maeul chunks them, and at question time retrieves
the most relevant snippets to ground the reply.

Retrieval is pure-Python TF-IDF by default — zero dependencies, instant,
offline, $0. If you want semantic search, call `Lore.use_embeddings()` to
switch to *local* Ollama embeddings (still free). Never calls a paid API.
"""
from __future__ import annotations

import glob
import math
import os
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

_WORD = re.compile(r"[0-9a-z가-힣]+", re.I)


def _tok(s: str) -> List[str]:
    return _WORD.findall(s.lower())


@dataclass
class Chunk:
    text: str
    source: str
    tokens: List[str] = field(default_factory=list)
    vec: Optional[List[float]] = None   # set only if embeddings are enabled


class Lore:
    """A tiny retrievable knowledge base for one game world."""

    def __init__(self, chunk_chars: int = 500):
        self.chunk_chars = chunk_chars
        self.chunks: List[Chunk] = []
        self._df: Counter = Counter()      # document frequency for TF-IDF
        self._embed_fn = None              # optional local embedder

    # ---- building -------------------------------------------------------
    def add_text(self, text: str, source: str = "inline") -> None:
        for piece in self._split(text):
            self.chunks.append(Chunk(text=piece, source=source, tokens=_tok(piece)))
        self._reindex()

    def add_dir(self, path: str, patterns=("*.md", "*.txt")) -> "Lore":
        for pat in patterns:
            for fp in sorted(glob.glob(os.path.join(path, "**", pat), recursive=True)):
                with open(fp, "r", encoding="utf-8") as f:
                    self.add_text(f.read(), source=os.path.basename(fp))
        return self

    def _split(self, text: str) -> List[str]:
        # Split on blank lines first (natural paragraphs), then pack to ~chunk_chars.
        paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        out, buf = [], ""
        for p in paras:
            if len(buf) + len(p) + 1 <= self.chunk_chars:
                buf = (buf + "\n" + p).strip()
            else:
                if buf:
                    out.append(buf)
                buf = p
        if buf:
            out.append(buf)
        return out

    def _reindex(self) -> None:
        self._df = Counter()
        for c in self.chunks:
            for w in set(c.tokens):
                self._df[w] += 1

    # ---- optional local embeddings -------------------------------------
    def use_embeddings(self, model: str = "nomic-embed-text",
                       base_url: str = "http://localhost:11434") -> bool:
        """Switch to semantic search via *local* Ollama embeddings (free).
        Returns True if it worked; False means we stay on TF-IDF (still fine)."""
        from .backends import embed
        vecs = embed([c.text for c in self.chunks], model=model, base_url=base_url)
        if not vecs:
            return False
        for c, v in zip(self.chunks, vecs):
            c.vec = v
        self._embed_fn = lambda q: (embed([q], model=model, base_url=base_url) or [None])[0]
        return True

    # ---- retrieval ------------------------------------------------------
    def search(self, query: str, k: int = 3) -> List[Tuple[float, Chunk]]:
        if not self.chunks:
            return []
        if self._embed_fn is not None:
            qv = self._embed_fn(query)
            if qv:
                scored = [(_cos(qv, c.vec), c) for c in self.chunks if c.vec]
                scored.sort(key=lambda x: x[0], reverse=True)
                return scored[:k]
        return self._tfidf_search(query, k)

    def _tfidf_search(self, query: str, k: int) -> List[Tuple[float, Chunk]]:
        q = _tok(query)
        if not q:
            return []
        n = len(self.chunks)
        idf = {w: math.log(1 + n / (1 + self._df.get(w, 0))) for w in set(q)}
        scored = []
        for c in self.chunks:
            tf = Counter(c.tokens)
            score = sum(tf.get(w, 0) * idf[w] for w in idf)
            if score > 0:
                score /= math.sqrt(len(c.tokens) or 1)   # length-normalize
                scored.append((score, c))
        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[:k]

    def block(self, query: str, k: int = 3) -> Tuple[str, List[str]]:
        """Return (prompt_block, facts) for grounding a reply."""
        hits = self.search(query, k)
        if not hits:
            return "", []
        facts = [c.text for _, c in hits]
        block = ("Relevant world lore (use only if it fits the question; never "
                 "invent facts beyond this):\n" + "\n".join(f"- {f}" for f in facts))
        return block, facts


def _cos(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)
