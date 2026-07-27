# 레슨 6 — 로컬 RAG: 세계관 고증, 추가 다운로드 없이

📄 대응 파일: `maeul/lore.py`

## 목표
주민이 "옛날 큰 홍수가 있었다던데?"에 **환각 없이** 답하게. 게임 세계관은 마크다운 파일에
있고, 질문 때 관련 조각을 꺼내 프롬프트에 넣어 근거로 삼는다(RAG).

## 왜 임베딩을 기본으로 안 쓰나
"RAG = 임베딩 모델 + 벡터DB"라고 배우지만, 그건 **또 다른 모델 다운로드와 의존성**을 뜻한다.
원칙 2(의존성 0)에 어긋난다. 그래서 기본은 **순수 파이썬 TF-IDF**다:

```python
def _tfidf_search(self, query, k):
    idf = {w: log(1 + n/(1+df[w])) for w in set(query_tokens)}
    for c in chunks:
        score = sum(tf[w]*idf[w] for w in idf) / sqrt(len(c.tokens))  # 길이 정규화
    return top_k
```

`pip install maeul` 하면 **즉시, 오프라인으로** RAG가 돈다. 임베딩 모델을 안 받아도 된다.

## 업그레이드 경로 (여전히 무료)
의미 검색이 필요하면 한 줄로 켠다 — **로컬** Ollama 임베딩(nomic-embed-text)으로:

```python
lore.use_embeddings()   # 로컬·무료. 실패하면 조용히 TF-IDF로 폴백
```

실패해도 절대 안 깨지고 유료 API를 부르지도 않는다. 이게 "무료 우선" 설계의 안전망이다.

## 조립 & 근거
```python
block, facts = lore.block("옛날 홍수 이야기")
# block → 프롬프트에 "관련 세계관(이것 외엔 지어내지 마):\n- ..." 로 주입
# facts → Reply.facts 에 담겨 나중에 "무슨 근거였나" 추적 가능
```

프롬프트에 **"이것 외엔 지어내지 마"**를 명시하는 게 환각을 크게 줄인다.

## 정직한 한계 (강좌니까 밝힌다)
TF-IDF는 한국어 형태소를 모른다. "홍수가"와 "홍수"를 다른 단어로 본다. 그래서 한국어에선
가끔 엉뚱한 문서가 상위로 온다 (우리 테스트에서 '협곡 전설'이 '강 홍수'보다 위로 온 적 있음 —
그래도 top-3 안에 정답 문서가 들어 답은 고증됐다). **완벽한 한국어 검색은 `use_embeddings()`**로.
이 트레이드오프(즉시·무료·가벼움 vs 정확도)를 아는 게 엔지니어링이다.

## 직접 해보기
1. `examples/village/lore/`에 `market.md`(장터 이야기)를 추가하고, 주민에게 장터를 물어보라.
2. `use_embeddings()`를 켜기 전/후로 "홍수" 질문의 `facts[0]`가 바뀌는지 비교하라.
   (임베딩 모델은 `ollama pull nomic-embed-text` — 이것도 무료.)

→ [레슨 7: 대사 디렉터](07-director.md)
