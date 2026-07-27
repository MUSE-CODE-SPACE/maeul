# 레슨 8 — HTTP 서버: 온디바이스든 웹서버든 같은 엔진

📄 대응 파일: `maeul/server.py`

## 왜 서버인가
게임 엔진(유니티·고도·언리얼·웹)은 파이썬을 품고 싶어 하지 않는다. 그래서 엔진은
**HTTP로 말하고**, Maeul 서버가 파이썬 코어를 감싼다. 이 서버 하나가 두 곳에서 돈다:
- **localhost**(게임 옆, 온디바이스) → $0
- **웹서버**(Railway 등) → 원격 (모델 백엔드는 env로 지정)

## FastAPI 엔드포인트
```
GET  /health          상태·주민 목록·로어 청크 수
POST /say  {who,text} → 구조화 Reply (핵심)
POST /event {kind,severity,note}  재해를 밀어 모든 주민에 반영
POST /event/clear     평온 복귀
POST /day             하루 넘김 (단기기억 초기화)
POST /world {...}     시간·날씨 변경
```

시작 시 마을 폴더에서 카드와 로어를 로드해 주민들을 메모리에 올린다. 월드는 주민이 공유하므로
`/event` 한 번이면 모든 주민의 다음 대사가 바뀐다.

## 함정 하나 (실제로 밟은 버그)
`from __future__ import annotations`가 있으면 타입힌트가 **문자열**이 되고, 함수 안에 정의한
Pydantic 모델을 FastAPI가 못 찾아서 바디를 쿼리로 오인한다(422 에러). 서버 파일에선 그 import를
빼야 한다. — 강좌니까 실수까지 남긴다.

## 배포 (Railway)
`PORT`/`HOST`를 env에서 읽게 해두면 클라우드가 그대로 뜬다. 단, 클라우드엔 Ollama가 없으니
`MAEUL_BASE_URL`을 무료 호스티드 모델이나 집 PC 터널로 가리킨다. 자세한 건 `docs/DEPLOY.md`.

## 직접 해보기
1. `maeul serve` 띄우고 `curl localhost:8000/say -d '{"who":"tor","text":"안녕"}'`.
2. `/event`로 지진을 밀고 다시 `/say` 해서 토르가 반응이 달라지는지 확인.

→ [레슨 9: 유니티 연동](09-unity.md)
