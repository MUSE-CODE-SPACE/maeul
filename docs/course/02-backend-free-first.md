# 레슨 2 — 백엔드: 돈 안 드는 기본값

📄 대응 파일: `maeul/backends.py`

## "OpenAI 호환"의 진짜 의미
초보가 가장 크게 오해하는 지점. **"OpenAI 호환 API" = OpenAI에 돈 내기, 가 아니다.**
그건 `POST /chat/completions` 라는 *요청 형식(전선 규격)*의 이름일 뿐이다. Ollama,
llama.cpp, LM Studio가 전부 이 규격을 말한다. 그래서 **엔드포인트 주소만 바꾸면** 같은
코드가 로컬 무료 모델에도, 유료 호스티드에도 붙는다.

```python
@dataclass
class Backend:
    model: str = "qwen3:8b"
    base_url: str = "http://localhost:11434/v1"   # 로컬 Ollama, $0
    api_key: Optional[str] = None                  # 로컬은 None
```

기본값이 **로컬 Ollama**라는 게 원칙 1의 구현이다. 아무것도 설정 안 하면 공짜로 돈다.

## 의존성 0으로 HTTP 호출
`requests`나 `httpx`를 안 쓴다. 표준 라이브러리 `urllib`만으로 POST한다:

```python
req = urllib.request.Request(self.base_url + "/chat/completions",
        data=json.dumps(body).encode(), headers={...}, method="POST")
with urllib.request.urlopen(req, timeout=self.timeout) as r:
    data = json.load(r)
return data["choices"][0]["message"]["content"]
```

패키지 하나 안 깔아도 코어가 돈다 (원칙 2). 게임 개발자가 무거운 파이썬 스택을 싫어한다는 걸 기억하라.

## 실전 디테일 3개
- **think 끄기**: Qwen3·DeepSeek-R1 같은 모델은 기본적으로 "생각"을 길게 뱉는다. 게임 대사엔
  방해되므로 로컬일 때 `body["think"] = False`를 보낸다. (다른 모델은 무시.) 이걸 안 하면
  토큰을 사고에 다 써서 대사가 잘린다 — 우리가 레슨 1에서 본 그 잘림.
- **친절한 에러**: 로컬 백엔드인데 연결 실패면, "Ollama 켜졌나요? `ollama pull` 했나요?"를
  에러에 붙인다. 오픈소스는 첫 5분 경험이 별점을 가른다.
- **env 구성**: `Backend.from_env()`로 `MAEUL_MODEL`, `MAEUL_BASE_URL`, `MAEUL_API_KEY`를
  읽는다. 코드 수정 없이 로컬↔클라우드 전환 (레슨 8·배포에서 씀).

## Railway 같은 클라우드에서는?
클라우드 박스엔 GPU도 Ollama도 없다. 그래서 서버는 거기 올리되, `MAEUL_BASE_URL`을
**무료 호스티드 모델**(OpenRouter 무료 티어 등)이나 **집 PC의 Ollama(터널)**로 가리킨다.
서버 코드는 그대로, 백엔드 주소만 환경변수로. (`docs/DEPLOY.md` 참고.)

## 직접 해보기
1. `Backend().is_local` 이 `True`인지 확인하고, `base_url`을 `https://openrouter.ai/api/v1`로
   바꾸면 `False`가 되는지 보라.
2. Ollama를 끈 상태로 `.chat(...)`을 호출해 **친절한 에러 메시지**가 나오는지 확인.

→ [레슨 3: 캐릭터 카드](03-character-cards.md)
