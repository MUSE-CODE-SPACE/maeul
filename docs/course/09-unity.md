# 레슨 9 — 유니티 연동: 감정으로 애니메이션 구동

📄 대응 파일: `unity/Runtime/MaeulClient.cs`

## 3줄이면 붙는다
서버를 로컬에 띄워두고(무료), C#에서 POST만 하면 된다. `MaeulClient`가 그 래퍼다.

```csharp
maeul.Say(who, message, reply => {
    dialogueUI.Show(reply.line);          // 대사 출력
    animator.SetTrigger(reply.emotion);   // 표정/포즈 = 감정 트리거
    if (!string.IsNullOrEmpty(reply.action)) DoAction(reply.action);
});
```

레슨 1에서 `emotion`을 **고정 9종**으로 둔 이유가 여기서 빛난다. Animator에 그 9개 트리거만
만들어두면 매핑 끝. 모델이 뭘 뱉든 우리가 정규화해서 그 9개 안으로만 준다.

## 재해를 마을 전체에 
```csharp
void OnEarthquake() {
    maeul.PushEvent("earthquake", 0.9f, "우물 옆 땅이 갈라졌다");
    // 이제 모든 주민의 다음 대사가 지진에 반응한다 — 각자 성격대로
}
```

## 실전 팁
- **비동기**: `UnityWebRequest` 코루틴이라 프레임을 안 막는다. 응답 오면 콜백.
- **에러 친화**: 서버가 안 떠 있으면 "maeul serve 켰나요?"를 에러에 담는다.
- **온디바이스 배포**: 모바일이면 서버를 같이 못 띄우니, 로드맵의 **임베디드(llama.cpp/WebLLM)**
  또는 Railway 원격 서버로. (README 로드맵 참고.)

## 직접 해보기
1. 빈 씬에 큐브 4개(주민)를 놓고, 클릭하면 `Say`가 불려 말풍선이 뜨게 해보라.
2. 버튼 하나로 `PushEvent("flood")`를 쏘고, 모든 큐브의 다음 대사가 겁먹는지 확인.

→ [레슨 10: 오픈소스로 공개하고 홍보하기](10-launch-and-promo.md)
