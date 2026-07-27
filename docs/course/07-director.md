# 레슨 7 — 대사 디렉터: 전부 조립해 한 줄로

📄 대응 파일: `maeul/director.py` · 엔진의 심장

## 하는 일
`villager.say("안녕?")` 한 줄 뒤에서, 디렉터는 ①~④를 하나의 프롬프트로 **조립**하고, 모델을
부르고, 응답을 구조화 `Reply`로 **파싱**한다.

```python
blocks = [
    character.persona_block(),   # ① 나는 누구인가
    world.situation_block(),     # ② 지금 무슨 상황인가 (재해 포함)
    mood,                        #    현재 기분 (불안도 계산 결과)
    f"오늘 잡담 초점: {daily_focus}",   # 그날그날 다른 이야기
    memory.block(),              # ③ 기억
    retrieved_lore,              # ④ RAG 근거
    SYS_RULES,                   # 출력 규칙(구조화 JSON)
]
system = "\n\n".join(blocks)
```

## 불안도: 성격 × 상황
여기서 성격과 상황이 곱해진다:

```python
anxiety = character.anxiety          # 성격의 시작점 (미라 0.4)
if disaster:
    anxiety += 0.5*severity + 0.2    # 재해가 밀어올림
mood = "calm" if anxiety<0.34 else "on edge" if anxiety<0.67 else "frightened"
```

겁많은 미라(0.4)는 심한 홍수(severity 0.85)에서 `0.4+0.42+0.2≈1.0` → **frightened**.
용감한 토르(0.2)는 같은 상황에서도 덜 겁먹는다. 숫자 하나로 성격 차이가 나온다.

## 그날그날 다른 이야기
```python
_DAILY_FOCUS = ("오늘 걱정거리", "들은 소문", "고대하는 일", "해야 할 집안일", ...)
idx = world.day_seed(character.id) % len(_DAILY_FOCUS)   # 날짜+주민 결정적
```
같은 날엔 같은 초점(일관성), 날이 바뀌면 회전(다양성). 주민마다 id가 salt라 서로 다른 화제.

## 빈 입력 = 혼잣말
`say("")`는 플레이어가 말 안 걸어도 주민이 **주변에 대고 한마디** 하게 한다. 마을을 살아있게
만드는 앰비언트 대사. 게임에선 일정 시간마다 랜덤 주민에게 `say("")`를 돌리면 된다.

## 직접 해보기
1. 미라에게 홍수(severity 0.85)에서 말 걸고 `emotion`이 `scared`인지, 같은 상황 토르는 덜
   겁먹는지 비교하라.
2. `_DAILY_FOCUS`에 항목을 하나 추가하고, `day`를 바꿔가며 잡담 화제가 도는지 보라.

→ [레슨 8: HTTP 서버](08-server.md)
