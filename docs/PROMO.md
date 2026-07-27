# Maeul — 런칭 홍보 문안 (복붙용)

공개 순간 그대로 쓸 수 있는 문안 모음. 링크는 실제 저장소 URL로 바꿔 쓸 것.

---

## 한 줄 소개 (어디서나)
> **Maeul** — 게임 마을 NPC를 위한 무료·온디바이스 LLM 엔진. 성격 있는 주민, 그날그날 다른 대사,
> 상황에 맞는 반응(장터에선 평온, 홍수엔 공포), 세계관 RAG. 로컬 Ollama로 **$0**, 오프라인. MIT.

한 줄(영문):
> **Maeul** — a money-free, on-device LLM engine for game-village NPCs. Personalities, daily-varying
> lines, situational reactions, and RAG grounded in your world's lore. Runs on local Ollama, $0. MIT.

---

## Show HN (Hacker News)

**Title:**
`Show HN: Maeul – money-free, on-device LLM engine for game NPCs`

**Body:**
```
Game NPCs are stuck between scripted dialogue trees (not alive) and cloud NPC
SaaS like Inworld/Convai (closed, billed per message, needs internet). I wanted
the missing corner: improvises like an LLM, but open, free, offline, and
grounded in my game's own lore.

Maeul is a small Python engine (zero-dependency core) where:
- a villager is a JSON card: personality, speech style, fears, relationships
- a shared World holds time/weather/events — a disaster flips the whole town's
  mood, and each villager reacts in character (the timid herbalist panics in a
  flood; the gruff smith stays grim)
- dialogue rotates day to day via a deterministic daily seed
- RAG over your markdown lore is pure-Python TF-IDF by default (no embedding
  download), with optional local Ollama embeddings
- every reply is structured {line, emotion, action, topic} so you can drive
  animations directly

"OpenAI-compatible" here is just the wire format — the default backend is your
local Ollama, so it costs nothing and runs offline. There's a FastAPI server +
a Unity C# client, and it deploys to Railway if you want it remote.

Honest limitations: the zero-dep TF-IDF retriever doesn't do Korean morphology
well (embeddings mode fixes it), and on-device *embedded* inference (WebLLM /
llama.cpp bindings, no server) is still on the roadmap — today it's server-based.

Repo + a runnable example village (4 villagers, lore, real outputs in the
README): <REPO_URL>
MIT. Feedback very welcome.
```

---

## r/LocalLLaMA

**Title:** `Maeul: a free, on-device LLM engine for game-village NPCs (runs on your local Ollama, $0)`

**Body:**
```
Built a small library that turns local models into game NPCs. Runs entirely on
Ollama — no API key, no cloud, offline. Tested with qwen3:8b, ernie4.5:21b,
deepseek-r1:8b.

- villagers = JSON personality cards
- world events (a flood!) change everyone's mood, in character
- structured replies {line, emotion, action} for animation
- RAG lore is pure-python (no embedding model needed), optional local embeddings
- zero-dependency core; FastAPI server + Unity client on top

Interesting bit: I A/B'd the three models in Korean — ERNIE 4.5 was ~2x faster
(MoE), Qwen3 had the cleanest Korean (no Chinese-char leakage), DeepSeek-R1
reasoned hardest. All local, all free.

MIT, example village included: <REPO_URL>
```

---

## r/gamedev  /  r/Unity3D

**Title:** `I made an open-source LLM engine for game NPCs — reacts to disasters, remembers you, runs offline ($0)`

**Body:**
```
NPCs that improvise, but without a cloud bill or an internet requirement. Maeul
runs a local model (Ollama) and gives you villagers with real personalities.

- Trigger a world event and every villager reacts in character:
  maeul.PushEvent("earthquake", 0.9f);
- Replies come back structured, so emotion drives your Animator directly:
  animator.SetTrigger(reply.emotion);
- Ground answers in YOUR lore (drop in markdown), no hallucinated history
- Unity C# client included; server runs locally (free) or on Railway

MIT, runnable example village with 4 villagers + lore: <REPO_URL>
Would love feedback from anyone doing sim/RPG/village games.
```

---

## X / 트위터 스레드

**1/** 게임 NPC는 아직도 둘 중 하나예요: 정해진 대사(안 살아있음) 아니면 클라우드 유료 SaaS(폐쇄·과금·온라인 필수).
그 사이 빈자리를 채우는 걸 만들었습니다 👇 **Maeul** — 무료·온디바이스 게임 NPC LLM 엔진. 🧵

**2/** 주민은 JSON 카드예요. 성격·말투·공포·관계.
겁많은 약초상 미라는 평온한 아침엔 수다스럽다가, **홍수가 나면 진짜로 무서워합니다.** (실제 출력 ↓)
[스크린샷/영상]

**3/** 세계 이벤트 하나면 **마을 전체**가 반응해요. 각자 성격대로.
`maeul.PushEvent("earthquake", 0.9)` → 겁쟁이는 패닉, 대장장이는 결의.

**4/** 응답이 `{line, emotion, action}` 구조라 유니티에서 감정→애니메이션 한 줄 매핑.
`animator.SetTrigger(reply.emotion)`

**5/** 그리고 핵심: **로컬 Ollama로 $0.** "OpenAI 호환"은 규격 이름일 뿐, OpenAI에 돈 안 냅니다. 오프라인으로 돌아가요.
RAG 세계관 고증도 추가 다운로드 없이.

**6/** MIT, 예제 마을(주민 4명 + 로어) 포함. 5분이면 붙습니다.
⭐ <REPO_URL>
피드백 환영합니다!

---

## GeekNews / 한국 커뮤니티

**제목:** `Maeul(마을) – 게임 NPC용 무료·온디바이스 LLM 엔진 (오픈소스)`

**본문:**
```
게임 마을 주민을 살아있게 만드는 작은 엔진을 만들었습니다. 로컬 모델(Ollama)로 돌아서
비용 $0, 오프라인, API 키 없음.

- 주민 = JSON 성격 카드 (말투·공포·관계·지식)
- 월드 이벤트(재해!)에 마을 전체가 각자 성격대로 반응 — 겁많은 미라는 홍수에 공포, 무뚝뚝한 토르는 결의
- 응답이 {대사, 감정, 행동} 구조 → 유니티 애니메이션 바로 구동
- 세계관 RAG가 순수 파이썬(추가 다운로드 X), 로컬 임베딩은 옵션
- 의존성 0 코어 + FastAPI 서버 + Unity 클라이언트 + Railway 배포

이름 '마을'처럼 한국에서 만들었고, MIT입니다. 예제 마을 포함.
<REPO_URL>
```
