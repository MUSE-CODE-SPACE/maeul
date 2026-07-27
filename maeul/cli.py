"""`maeul` command — serve the engine or chat in the terminal. Free & local."""
from __future__ import annotations

import argparse
import os
import sys


def main(argv=None):
    ap = argparse.ArgumentParser(prog="maeul", description="Money-free LLM engine for game villagers.")
    sub = ap.add_subparsers(dest="cmd")

    s = sub.add_parser("serve", help="run the HTTP server (game engines connect here)")
    s.add_argument("--village", default=os.environ.get("MAEUL_VILLAGE", "examples/village"),
                   help="dir of character cards + lore")
    s.add_argument("--model", default=os.environ.get("MAEUL_MODEL", "qwen3:8b"))
    s.add_argument("--base-url", default=os.environ.get("MAEUL_BASE_URL", "http://localhost:11434/v1"))
    s.add_argument("--api-key", default=os.environ.get("MAEUL_API_KEY") or None)
    # Cloud hosts (Railway, Render, Fly…) inject $PORT and need 0.0.0.0.
    s.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    s.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    s.add_argument("--embeddings", action="store_true", help="use local Ollama embeddings for RAG")

    c = sub.add_parser("chat", help="chat with a villager in the terminal")
    c.add_argument("--who", default="mira")
    c.add_argument("--village", default="examples/village")
    c.add_argument("--model", default=os.environ.get("MAEUL_MODEL", "qwen3:8b"))
    c.add_argument("--disaster", default=None)

    args = ap.parse_args(argv)

    if args.cmd == "serve":
        try:
            import uvicorn
        except ImportError:
            print("Server needs extras: pip install maeul[server]", file=sys.stderr)
            return 2
        from .server import build_app
        app = build_app(args.village, model=args.model, base_url=args.base_url,
                        api_key=args.api_key, use_embeddings=args.embeddings)
        local = ("localhost" in args.base_url) or ("127.0.0.1" in args.base_url)
        print(f"Maeul serving {args.village} on http://{args.host}:{args.port}  "
              f"(model {args.model}, {'local $0' if local else 'remote backend'})")
        uvicorn.run(app, host=args.host, port=args.port, log_level="info")
        return 0

    if args.cmd == "chat":
        from .backends import Backend
        from .character import Character
        from .director import Villager
        from .lore import Lore
        from .world import Event, World
        world = World(name="바람 마을", day=1, time="morning", season="spring", weather="clear")
        if args.disaster:
            world.events.append(Event(kind=args.disaster, severity=0.8, note=""))
        lore = Lore()
        if os.path.isdir(os.path.join(args.village, "lore")):
            lore.add_dir(os.path.join(args.village, "lore"))
        card = Character.load(os.path.join(args.village, f"{args.who}.json"))
        v = Villager(character=card, world=world, backend=Backend(model=args.model), lore=lore)
        print(f"— {card.name}({card.role}) · {args.model} · $0 로컬 · Ctrl-C 종료 —")
        r = v.say("")
        print(f"  [{r.emotion}] {r.line}\n")
        while True:
            try:
                msg = input("당신 ▸ ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                return 0
            if not msg:
                continue
            r = v.say(msg)
            act = f"  ({r.action})" if r.action else ""
            print(f"  [{r.emotion}] {r.line}{act}\n")

    ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
