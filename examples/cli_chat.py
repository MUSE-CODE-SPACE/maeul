#!/usr/bin/env python3
"""Maeul demo — chat with a villager, watch the day and the weather change them.

Runs 100% locally against Ollama ($0). No API key.

    python3 examples/cli_chat.py                 # talk to 미라 on a calm morning
    python3 examples/cli_chat.py --who tor       # talk to 토르
    python3 examples/cli_chat.py --disaster flood --who mira   # a flood hits
    python3 examples/cli_chat.py --model qwen3:8b

Type a message and press enter. Empty line = the villager mutters to itself.
Type /day to advance a day, /flood or /calm to change the world, /quit to exit.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from maeul import Backend, Character, Event, Lore, Villager, World  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
VILLAGE = os.path.join(HERE, "village")


def build(args):
    world = World(name="바람 마을", day=1, time="morning", season="spring", weather="clear")
    if args.disaster:
        world.events.append(Event(kind=args.disaster, severity=0.8,
                                  note="은하천이 둑을 넘어 마을 서쪽으로 물이 밀려든다."))
    lore = Lore().add_dir(os.path.join(VILLAGE, "lore"))
    card = Character.load(os.path.join(VILLAGE, f"{args.who}.json"))
    v = Villager(character=card, world=world,
                 backend=Backend(model=args.model), lore=lore)
    return v


def show(reply):
    tag = f"[{reply.emotion}]"
    act = f"  ({reply.action})" if reply.action else ""
    print(f"\n  {tag} {reply.line}{act}")
    if reply.facts:
        print(f"        └ grounded in lore: {reply.facts[0][:60]}…")
    print()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--who", default="mira", help="mira | tor | finn | sena")
    ap.add_argument("--model", default=os.environ.get("MAEUL_MODEL", "qwen3:8b"))
    ap.add_argument("--disaster", default=None, help="e.g. flood, earthquake, fire")
    args = ap.parse_args()

    v = build(args)
    print(f"— {v.character.name}({v.character.role})와의 대화 · 모델 {args.model} · $0 로컬 —")
    print("  (빈 줄 = 혼잣말 · /day 하루 넘김 · /flood 홍수 · /calm 평온 · /quit 종료)\n")
    print("혼잣말:", end="")
    show(v.say(""))

    while True:
        try:
            msg = input("당신 ▸ ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if msg == "/quit":
            break
        if msg == "/day":
            v.world.day += 1
            v.memory.roll_day()
            print(f"  · 하루가 지났다. (day {v.world.day})")
            show(v.say(""))
            continue
        if msg == "/flood":
            v.world.events = [Event(kind="flood", severity=0.8,
                                    note="은하천이 둑을 넘었다.")]
            print("  · 홍수가 마을을 덮친다!")
            show(v.say(""))
            continue
        if msg == "/calm":
            v.world.events = []
            print("  · 마을이 다시 평온해졌다.")
            continue
        show(v.say(msg))


if __name__ == "__main__":
    main()
