# 레슨 5 — 기억: 오늘을 기억하고, 당신을 기억하기

📄 대응 파일: `maeul/memory.py`

## 게임 NPC에겐 데이터베이스가 필요 없다
NPC 기억을 벡터DB로 만들려는 유혹이 있다. 과설계다. 마을 주민은 **몇 개의 두드러진 기억**만
있으면 충분하고, 오히려 그게 현실적이다. 그래서 두 계층, 둘 다 작게:

```python
short_term: List[str]        # 오늘 있었던 일 (날 바뀌면 비움)
long_term : Deque[str]       # 지속 사실 (maxlen으로 바운디드)
```

## 왜 바운디드가 핵심인가
기억은 **매 프롬프트에 주입**된다. 무한히 쌓이면 토큰이 폭발하고 비싸지고 느려진다.
`deque(maxlen=12)`로 상한을 두면, 가득 찼을 때 **가장 오래된 게 자동으로 밀려난다.** 이건
Anthropic의 Hermes 같은 에이전트가 쓰는 "바운디드 메모리" 패턴과 같은 철학이다.

```python
def remember(self, fact):        # "플레이어가 지붕을 고쳐줬다"
    if fact not in self.long_term:
        self.long_term.append(fact)   # 가득 차면 오래된 것 드롭

def roll_day(self):              # 새 날: 자잘한 건 잊고, 중요한 건 남긴다
    self.short_term.clear()
```

## 프롬프트에 넣기
```python
def block(self):
    parts = []
    if self.long_term:  parts.append("Things you remember: " + ...)
    if self.short_term: parts.append("Earlier today: " + ... [-6:])   # 최근 6개만
    return "\n".join(parts)
```

단기는 최근 6개만 넣는다 — 오늘 있었던 모든 걸 다 넣을 필요는 없다.

## 자동 기억 vs 명시 기억
- **자동(가벼움)**: 디렉터가 매 대화의 흔적을 단기에 남긴다("플레이어가 X를 물었다",
  "내가 Y라고 답했다") — 대화 연속성용.
- **명시(중요)**: 게임 로직이 `villager.memory.remember("플레이어가 늑대를 물리쳤다")`를
  호출해 장기 기억에 박는다. 이건 며칠이 지나도 남아서 관계를 만든다.

## 직접 해보기
1. `memory.remember(...)`를 13번 호출하고 `long_term` 길이가 12를 안 넘는지, 첫 항목이
   밀려났는지 확인.
2. 미라에게 "나 어제 늑대 물리쳤어" 말하고 → `remember`로 박고 → `/day`로 하루 넘긴 뒤
   다시 말 걸어보라. 기억하는가?

→ [레슨 6: 로컬 RAG 로어](06-rag-lore.md)
