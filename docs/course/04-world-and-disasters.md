# 레슨 4 — 월드 컨텍스트: 그날그날 다른 이야기, 재해 땐 무서움

📄 대응 파일: `maeul/world.py`

여기가 사용자가 원한 두 기능이 사는 곳이다: **"그날그날 다른 이야기"**와 **"재해 중엔 무섭다"**.

## 월드 = 모두가 공유하는 변하는 상태
```python
@dataclass
class World:
    name: str = "the village"
    day: int = 1
    time: str = "morning"     # dawn/morning/noon/afternoon/evening/night
    season: str = "spring"
    weather: str = "clear"
    events: List[Event] = []  # 지금 벌어지는 일 (종종 재해)
```

매 턴 `situation_block()`이 이걸 짧은 상황 문장으로 만들어 프롬프트에 넣는다. 같은 주민도
햇살 아침과 한밤 폭풍에서 다르게 말하는 이유.

## 재해 반응 — 무섭게 만드는 법
`Event`에 `is_disaster` 판정을 두고(홍수·지진·화재·역병·도적…), 재해가 활성이면 상황 블록에
**강한 지시**를 넣는다:

```
A DISASTER is happening: a severe flood. 은하천이 둑을 넘었다.
React the way YOUR character would to real danger — fear, urgency, or grim
resolve depending on your personality. Do not be cheerful or make small talk.
```

핵심은 "무서워해라"가 아니라 **"네 성격대로 위험에 반응해라"**다. 그래서 겁많은 미라는
공포로, 용감한 토르는 결의로 반응한다. (실제 출력에서 확인됨.) 성격(레슨 3) × 상황이 여기서 곱해진다.

## "그날그날 다른 이야기" — 결정적 시드
매일 랜덤이면 재현이 안 되고, 고정이면 지루하다. 그래서 **날짜 기반 결정적 시드**를 쓴다:

```python
def day_seed(self, salt=""):   # 같은 날+같은 주민 = 같은 시드
    h = hashlib.sha256(f"{self.name}|{self.day}|{salt}".encode()).hexdigest()
    return int(h[:8], 16)
```

디렉터(레슨 7)가 이 시드로 그날 주민의 **잡담 초점**을 고른다("오늘 걱정거리 하나",
"들은 소문", "고대하는 일"…). 하루 안에선 일관되고, 날이 바뀌면 화제가 돈다.

## 설계 결정
- **이벤트는 리스트**: 여러 개 겹칠 수 있게. `active_disaster()`는 첫 재해를 반환.
- **severity(0~1)**: 같은 홍수도 경미/심각/치명으로 문구가 갈리고, 불안도 상승폭도 다르다.
- **월드는 주민이 공유**: 한 곳에서 이벤트를 밀면 모든 주민 다음 대사에 반영된다 (서버 `/event`).

## 직접 해보기
1. `world.day`를 1→2→3 바꿔가며 미라의 혼잣말(빈 입력)을 뽑아보라. 화제가 도는가?
2. `Event(kind="festival", ...)`를 넣어보라. `is_disaster`가 False라 재해 지시가 안 뜨고,
   분위기가 밝아지는지 확인. (재해가 아닌 이벤트도 컨텍스트가 된다.)

→ [레슨 5: 기억](05-memory.md)
