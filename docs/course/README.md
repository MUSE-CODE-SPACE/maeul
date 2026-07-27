# 강좌: 게임용 NPC LLM 엔진을 처음부터 만들기 (Maeul 빌드-어롱)

**"돈 안 드는, 온디바이스로 도는, 게임 특화 NPC LLM 엔진"을 밑바닥부터 만들며 배웁니다.**
완성물이 바로 이 저장소(Maeul)입니다. 각 레슨은 저장소의 실제 파일 하나에 대응하고,
끝나면 여러분 손에 **실제로 도는 오픈소스 라이브러리**가 남습니다.

> 대상: LLM을 앱에 붙여본 적 있는 개발자 / 유니티로 게임 만드는 사람.
> 준비물: Python 3.9+, [Ollama](https://ollama.com) (무료 로컬 모델), 터미널.
> 비용: **$0** — 전부 로컬 모델로 돌립니다. API 키 필요 없음.

## 이 강좌가 다루는 것
- LLM을 "캐릭터"로 만드는 법 (성격을 데이터로 설계)
- 세계 상태(시간·날씨·재해)를 대사에 반영하는 프롬프트 설계
- 게임에 쓸 수 있는 **구조화 응답**(감정·행동 파싱)
- 추가 다운로드 없이 도는 **초경량 로컬 RAG**
- 온디바이스 vs 웹서버를 **한 코드**로 겸하는 백엔드 추상화
- 유니티에서 붙이기 + 오픈소스로 공개하고 홍보하기

## 커리큘럼

| # | 레슨 | 대응 파일 | 핵심 |
|---|------|-----------|------|
| 0 | [왜 만드는가 · 설계 원칙](00-why-and-design.md) | — | 시장의 빈자리, "무료·온디바이스" 원칙 |
| 1 | [구조화 응답 스키마](01-structured-replies.md) | `maeul/schema.py` | 게임이 먹는 건 텍스트가 아니라 `{line, emotion, action}` |
| 2 | [백엔드: 돈 안 드는 기본값](02-backend-free-first.md) | `maeul/backends.py` | "OpenAI 호환"은 규격일 뿐, 기본은 로컬 Ollama |
| 3 | [캐릭터 카드](03-character-cards.md) | `maeul/character.py` | 성격을 코드가 아니라 데이터로 |
| 4 | [월드 컨텍스트 · 재해 반응](04-world-and-disasters.md) | `maeul/world.py` | "그날그날 다른 이야기", "홍수 땐 무섭다" |
| 5 | [기억](05-memory.md) | `maeul/memory.py` | 오늘을 기억하고, 당신을 기억하기 (바운디드) |
| 6 | [로컬 RAG 로어](06-rag-lore.md) | `maeul/lore.py` | 세계관 고증, 추가 다운로드 없이 TF-IDF |
| 7 | [대사 디렉터](07-director.md) | `maeul/director.py` | 전부 조립해 한 줄로: `villager.say(...)` |
| 8 | [HTTP 서버](08-server.md) | `maeul/server.py` | 온디바이스든 웹서버든 같은 엔진 |
| 9 | [유니티 연동](09-unity.md) | `unity/Runtime/MaeulClient.cs` | 감정으로 애니메이션 구동 |
| 10 | [오픈소스로 공개 · 홍보](10-launch-and-promo.md) | — | README·Show HN·데모로 별 받기 |

## 시작하기
```bash
git clone https://github.com/MUSE-CODE-SPACE/maeul
cd maeul
brew install ollama && ollama pull qwen3:8b   # 무료 로컬 모델
python -m maeul.cli chat --who mira            # 첫 대화, $0
```
레슨 0부터 순서대로 읽으며 `maeul/` 안의 파일을 하나씩 직접 만들어 보세요.
각 레슨 끝에 **직접 해보기** 과제가 있습니다.

---
*이 강좌는 Maeul을 만드는 실제 과정을 그대로 담았습니다. 영상 시리즈로도 제작 예정.*
