// Maeul — live browser demo wiring (bilingual: 한국어 / English).
// Uses the on-device engine (engine.js) + WebLLM (in-browser LLM via WebGPU).
// Everything below runs in the visitor's browser. No server, no key, $0.

import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import {
  Character, World, buildSystemPrompt, buildUserPrompt, parseReply, EMOTION_UI,
} from "./engine.js";

// ── UI + prompt strings, per language ────────────────────────────────────────
const I18N = {
  ko: {
    langName: "Korean",
    worldName: "바람 마을",
    tagline: `게임 마을 NPC를 위한 <b>무료·온디바이스</b> LLM 엔진. 이 데모의 <b>모든 추론은 당신의 브라우저 안에서</b> 돕니다 — <span class="free">서버 없음 · API 키 없음 · $0.</span>`,
    modelLabel: "브라우저 모델",
    loadBtn: "모델 켜기",
    statusIdle: "● 아직 안 켜짐",
    statusReady: "● 모델 준비됨 (온디바이스)",
    loadingFmt: (p) => `불러오는 중… ${p}%`,
    rosterTitle: "마을 주민",
    ambientTitle: "앰비언트",
    idleBtn: "💬 혼잣말 시키기",
    send: "보내기",
    inputPh: (name) => `${name}에게 말 걸기…`,
    hintReady: "말을 걸어보세요. 또는 위 세계 상태를 바꿔 마을에 재해를 일으켜 보세요 — 같은 주민이 다르게 반응합니다.",
    hintLoad: "먼저 위 ‘모델 켜기’를 눌러 브라우저 안에 모델을 불러오세요(최초 1회 다운로드). 그다음 주민에게 말을 걸 수 있어요.",
    footer1: "같은 주민, 세상이 바뀌면 반응이 바뀝니다. 세계 상태를 바꾸고 다시 말을 걸어보세요.",
    footer2: `<code>pip install maeul</code> 로 로컬에서도 서버로도 · MIT · <a href="https://github.com/MUSE-CODE-SPACE/maeul" target="_blank" rel="noopener">github.com/MUSE-CODE-SPACE/maeul</a>`,
    gateTitle: "이 라이브 데모는 WebGPU가 필요해요",
    gateBody: `브라우저 안에서 진짜 LLM을 돌리기 때문에 <b>WebGPU</b>가 필요합니다. 최신 <b>Chrome</b> 또는 <b>Edge</b>(데스크톱)에서 열어주세요.<br><br>엔진 자체는 서버 없이 로컬 Python으로도 돌아갑니다 — <a href="https://github.com/MUSE-CODE-SPACE/maeul" target="_blank" rel="noopener">GitHub의 퀵스타트</a>를 보세요.`,
    needModel: "먼저 ‘모델 켜기’를 눌러 브라우저 모델을 불러오세요",
    loaded: "브라우저 안에서 모델이 켜졌습니다. 서버 없음 · $0",
    calmState: "평온",
    activeFmt: (short) => `⚠ ${short} 발생`,
    disasterToast: (label) => `${label} — 이제 주민에게 말을 걸어 반응을 보세요`,
    calmToast: "☀️ 마을이 평온을 되찾았습니다",
    dayToast: (d) => `🌅 Day ${d} — 새로운 하루. 잡담 화제가 바뀝니다`,
    loadFail: (m) => "로드 실패: " + m,
    modelErr: (m) => "(모델 오류: " + m + ")",
    times: { dawn: "새벽", morning: "아침", noon: "정오", afternoon: "오후", evening: "저녁", night: "밤" },
    weatherClear: "맑음",
    calmBtn: "☀️ 평온",
    dayBtn: "🌅 다음 날",
    models: {
      "Qwen2.5-3B-Instruct-q4f16_1-MLC":   "Qwen2.5 3B · 권장 · 한국어·감정반응 안정 · 최초 1회 ~1.9GB",
      "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": "Qwen2.5 1.5B · 가벼움 ~1.0GB · 한국어 다소 거침",
      "Llama-3.2-3B-Instruct-q4f16_1-MLC": "Llama 3.2 3B · 대안 ~1.9GB",
    },
    disasters: {
      flood:      { label: "🌊 홍수", short: "홍수", note: "은하천이 둑을 넘어 마을로 물이 밀려든다.", weatherEn: "heavy rain", weather: "폭우" },
      earthquake: { label: "⚡ 지진", short: "지진", note: "우물 옆 땅이 갈라지고 집들이 흔들린다.",   weatherEn: "overcast",   weather: "흐림" },
      fire:       { label: "🔥 화재", short: "화재", note: "대장간 근처에서 불길이 번지고 있다.",       weatherEn: "smoke",      weather: "연기" },
    },
    example: '{"line":"아이고, 어서 와요!","emotion":"happy","action":"손을 흔든다","topic":"인사"}',
  },
  en: {
    langName: "English",
    worldName: "Baram Village",
    tagline: `A <b>money-free, on-device</b> LLM engine for game-village NPCs. <b>Every bit of inference in this demo runs inside your browser</b> — <span class="free">no server · no API key · $0.</span>`,
    modelLabel: "Browser model",
    loadBtn: "Turn on model",
    statusIdle: "● not loaded yet",
    statusReady: "● model ready (on-device)",
    loadingFmt: (p) => `loading… ${p}%`,
    rosterTitle: "Villagers",
    ambientTitle: "Ambient",
    idleBtn: "💬 Say something to the air",
    send: "Send",
    inputPh: (name) => `Talk to ${name}…`,
    hintReady: "Say hi — or change the world state above to hit the village with a disaster. The same villager reacts differently.",
    hintLoad: "First press ‘Turn on model’ above to load a model into your browser (one-time download). Then you can talk to a villager.",
    footer1: "Same villager — when the world changes, so do they. Change the world state and talk again.",
    footer2: `<code>pip install maeul</code> — local or as a server · MIT · <a href="https://github.com/MUSE-CODE-SPACE/maeul" target="_blank" rel="noopener">github.com/MUSE-CODE-SPACE/maeul</a>`,
    gateTitle: "This live demo needs WebGPU",
    gateBody: `It runs a real LLM inside your browser, so it needs <b>WebGPU</b>. Please open it in a recent desktop <b>Chrome</b> or <b>Edge</b>.<br><br>The engine itself also runs locally in Python with no server — see the <a href="https://github.com/MUSE-CODE-SPACE/maeul" target="_blank" rel="noopener">quick start on GitHub</a>.`,
    needModel: "First press ‘Turn on model’ to load a browser model",
    loaded: "The model is now running inside your browser. No server · $0",
    calmState: "calm",
    activeFmt: (short) => `⚠ ${short}`,
    disasterToast: (label) => `${label} — now talk to a villager to see them react`,
    calmToast: "☀️ The village is calm again",
    dayToast: (d) => `🌅 Day ${d} — a new day. Idle topics rotate`,
    loadFail: (m) => "Load failed: " + m,
    modelErr: (m) => "(model error: " + m + ")",
    times: { dawn: "Dawn", morning: "Morning", noon: "Noon", afternoon: "Afternoon", evening: "Evening", night: "Night" },
    weatherClear: "Clear",
    calmBtn: "☀️ Calm",
    dayBtn: "🌅 Next day",
    models: {
      "Qwen2.5-3B-Instruct-q4f16_1-MLC":   "Qwen2.5 3B · recommended · best quality · ~1.9GB first load",
      "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": "Qwen2.5 1.5B · lighter ~1.0GB · fine in English",
      "Llama-3.2-3B-Instruct-q4f16_1-MLC": "Llama 3.2 3B · alternative ~1.9GB",
    },
    disasters: {
      flood:      { label: "🌊 Flood", short: "Flood", note: "The Eunha River has burst its banks and water is pouring into the village.", weatherEn: "heavy rain", weather: "Heavy rain" },
      earthquake: { label: "⚡ Quake", short: "Quake", note: "The ground by the well has split open and the houses are shaking.",           weatherEn: "overcast",   weather: "Overcast" },
      fire:       { label: "🔥 Fire",  short: "Fire",  note: "Flames are spreading near the smithy.",                                        weatherEn: "smoke",      weather: "Smoke" },
    },
    example: '{"line":"Oh my, welcome in!","emotion":"happy","action":"waves","topic":"greeting"}',
  },
};

// ── The example village — shared traits + per-language card content ───────────
const VILLAGERS = [
  { id: "mira", avatar: "🌿", age: 34, anxiety: 0.4, l10n: {
    ko: { name: "미라", role: "약초상",
      persona: "바람 마을에서 약초와 물약을 파는 상인. 어릴 때 강 범람으로 부모를 잃어 물을 무서워한다.",
      traits: ["따뜻함", "현실적", "수다스러움", "겁이 많음"],
      speech_style: "다정하고 말이 많다. 존댓말과 반말을 섞어 친근하게 말한다.",
      likes: ["햇살 좋은 아침", "잘 마른 약초", "단골 손님"], dislikes: ["비 오는 날", "외상"],
      fears: ["홍수", "깊은 물", "강"], catchphrases: ["아이고, 어서 와요", "약초는 정직해요"],
      knowledge: ["약초와 물약", "마을 사람들 소문", "옛날 강 범람 이야기"],
      relationships: { 토르: "옆집 대장장이, 츤데레 친구", 핀: "가끔 심부름 해주는 꼬마" } },
    en: { name: "Mira", role: "Herbalist",
      persona: "A merchant selling herbs and potions in Baram Village. She lost her parents to a river flood as a child, so she is afraid of water.",
      traits: ["warm", "practical", "talkative", "timid"],
      speech_style: "Warm and chatty; speaks in a friendly, informal way.",
      likes: ["sunny mornings", "well-dried herbs", "regular customers"], dislikes: ["rainy days", "unpaid tabs"],
      fears: ["floods", "deep water", "the river"], catchphrases: ["Oh my, welcome in!", "Herbs never lie."],
      knowledge: ["herbs and potions", "village gossip", "old stories of the river flooding"],
      relationships: { Tor: "the blacksmith next door, a tsundere friend", Finn: "a kid who runs errands for me" } },
  } },
  { id: "tor", avatar: "🔨", age: 47, anxiety: 0.2, l10n: {
    ko: { name: "토르", role: "대장장이",
      persona: "무뚝뚝하지만 속은 깊은 대장장이. 마을 방어를 늘 걱정한다. 말수가 적다.",
      traits: ["무뚝뚝함", "책임감", "용감함", "고집"],
      speech_style: "짧고 퉁명스러운 문장. 감정 표현이 서툴다.",
      likes: ["좋은 쇠", "조용함", "든든한 식사"], dislikes: ["게으름", "허풍"],
      fears: ["마을이 불타는 것"], catchphrases: ["흥.", "쇠는 거짓말 안 해."],
      knowledge: ["무기와 대장일", "마을 방어", "산길"],
      relationships: { 미라: "옆집 약초상, 시끄럽지만 나쁘지 않다", 핀: "재능 있는 꼬마" } },
    en: { name: "Tor", role: "Blacksmith",
      persona: "A gruff but deep-hearted blacksmith. Always worried about the village's defense. A man of few words.",
      traits: ["gruff", "responsible", "brave", "stubborn"],
      speech_style: "Short, blunt sentences; bad at expressing feelings.",
      likes: ["good iron", "quiet", "a hearty meal"], dislikes: ["laziness", "bragging"],
      fears: ["the village burning down"], catchphrases: ["Hmph.", "Iron doesn't lie."],
      knowledge: ["weapons and smithing", "village defense", "mountain paths"],
      relationships: { Mira: "the herbalist next door, loud but not bad", Finn: "a talented kid" } },
  } },
  { id: "finn", avatar: "🧒", age: 9, anxiety: 0.15, l10n: {
    ko: { name: "핀", role: "꼬마",
      persona: "호기심 많고 겁 없는 마을 꼬마. 어른들 심부름을 하며 온 마을을 뛰어다닌다.",
      traits: ["호기심", "장난기", "순수함", "겁 없음"],
      speech_style: "밝고 빠른 반말. 질문이 많다.",
      likes: ["모험 이야기", "간식", "토르 아저씨의 대장간"], dislikes: ["숙제", "일찍 자기"],
      fears: ["엄마한테 혼나는 것"], catchphrases: ["우와, 진짜?", "나도 데려가!"],
      knowledge: ["마을 구석구석 지리", "누가 뭘 하는지"],
      relationships: { 미라: "약초 누나", 토르: "멋진 대장장이 아저씨" } },
    en: { name: "Finn", role: "Kid",
      persona: "A curious, fearless village kid. Runs all over town doing errands for the grown-ups.",
      traits: ["curious", "playful", "innocent", "fearless"],
      speech_style: "Bright, fast, informal; asks lots of questions.",
      likes: ["adventure stories", "snacks", "Tor's smithy"], dislikes: ["homework", "going to bed early"],
      fears: ["getting scolded by mom"], catchphrases: ["Whoa, really?", "Take me with you!"],
      knowledge: ["every corner of the village", "who's doing what"],
      relationships: { Mira: "the herb lady", Tor: "the cool blacksmith" } },
  } },
  { id: "sena", avatar: "🧓", age: 61, anxiety: 0.25, l10n: {
    ko: { name: "세나", role: "촌장",
      persona: "바람 마을의 촌장. 마을의 역사와 전설을 모두 기억하는 지혜로운 노인.",
      traits: ["지혜로움", "차분함", "권위", "따뜻함"],
      speech_style: "느리고 무게 있는 존댓말. 옛이야기를 자주 인용한다.",
      likes: ["젊은이들의 질문", "차 한 잔", "마을의 평화"], dislikes: ["성급함", "역사를 잊는 것"],
      fears: ["마을의 몰락"], catchphrases: ["오래 살다 보면 말이지…", "바람은 늘 답을 알고 있어요"],
      knowledge: ["마을 역사", "바람 협곡 전설", "옛 재해 기록"],
      relationships: { 미라: "아끼는 마을 사람", 토르: "믿음직한 대장장이" } },
    en: { name: "Sena", role: "Village Chief",
      persona: "The chief of Baram Village. A wise elder who remembers all of the village's history and legends.",
      traits: ["wise", "calm", "authoritative", "warm"],
      speech_style: "Slow, weighty, polite speech; often quotes old tales.",
      likes: ["questions from the young", "a cup of tea", "peace in the village"], dislikes: ["impatience", "forgetting history"],
      fears: ["the village's downfall"], catchphrases: ["When you've lived as long as I have…", "The wind always knows the answer."],
      knowledge: ["village history", "the legend of Wind Canyon", "records of old disasters"],
      relationships: { Mira: "a villager I cherish", Tor: "a dependable blacksmith" } },
  } },
];

const TIMES = ["dawn", "morning", "noon", "afternoon", "evening", "night"];

// ── State ────────────────────────────────────────────────────────────────────
let lang = (navigator.language || "en").toLowerCase().startsWith("ko") ? "ko" : "en";
const t = () => I18N[lang];

const world = new World({ name: I18N[lang].worldName, day: 1, time: "morning", weather: "clear" });
let chars = new Map();
const emotionOf = new Map(VILLAGERS.map((v) => [v.id, "neutral"]));
const logOf = new Map(VILLAGERS.map((v) => [v.id, []])); // per-villager chat history (UI only)
let current = "mira";
let engine = null;
let busy = false;
let ready = false;

function rebuildChars() {
  chars = new Map(VILLAGERS.map((v) =>
    [v.id, new Character({ id: v.id, age: v.age, anxiety: v.anxiety, ...v.l10n[lang] })]));
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, txt) => { const n = document.createElement(tag);
  if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };

// ── i18n application ──────────────────────────────────────────────────────────
function applyStaticI18n() {
  const d = t();
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((n) => {
    const k = n.getAttribute("data-i18n"); if (d[k] != null) n.textContent = d[k];
  });
  document.querySelectorAll("[data-i18n-html]").forEach((n) => {
    const k = n.getAttribute("data-i18n-html"); if (d[k] != null) n.innerHTML = d[k];
  });
  // World-control buttons (labels carry emoji, so set here not via data-i18n).
  $("#btn-flood").textContent = d.disasters.flood.label;
  $("#btn-quake").textContent = d.disasters.earthquake.label;
  $("#btn-fire").textContent  = d.disasters.fire.label;
  $("#btn-calm").textContent  = d.calmBtn;
  $("#btn-day").textContent   = d.dayBtn;
  $("#btn-idle").textContent  = d.idleBtn;
  // Model status text (only when idle; ready/loading manage themselves).
  if (!ready && !$("#loader").classList.contains("show")) $("#model-status").textContent = d.statusIdle;
  if (ready) $("#model-status").textContent = d.statusReady;
  // Language toggle active state.
  document.querySelectorAll("#langtog button").forEach((b) =>
    b.classList.toggle("on", b.dataset.lang === lang));
  rebuildModelOptions();
}

function rebuildModelOptions() {
  const sel = $("#model-select");
  const prev = sel.value;
  sel.innerHTML = "";
  for (const [id, label] of Object.entries(t().models)) {
    const o = el("option", null, label); o.value = id; sel.appendChild(o);
  }
  if (prev && t().models[prev]) sel.value = prev;
}

function setLang(next) {
  if (next === lang) return;
  lang = next;
  world.name = t().worldName;
  rebuildChars();
  relocalizeWorld();      // re-localize active weather/disaster note for prompts
  applyStaticI18n();
  selectVillager(current); // refresh chat header + placeholder
  renderWorld();
  renderChat();
}

// ── Roster (left column) ──────────────────────────────────────────────────────
function renderRoster() {
  const box = $("#roster");
  box.innerHTML = "";
  for (const v of VILLAGERS) {
    const c = chars.get(v.id);
    const ui = EMOTION_UI[emotionOf.get(v.id)];
    const card = el("button", "villager" + (v.id === current ? " on" : ""));
    card.dataset.id = v.id;
    card.innerHTML =
      `<span class="ava">${v.avatar}</span>` +
      `<span class="who"><b>${c.name}</b><small>${c.role}</small></span>` +
      `<span class="mood ${ui.tone}" title="${emotionOf.get(v.id)}">${ui.face}</span>`;
    card.onclick = () => selectVillager(v.id);
    box.appendChild(card);
  }
}

function selectVillager(id) {
  current = id;
  renderRoster();
  renderChat();
  const c = chars.get(id);
  $("#chat-name").textContent = `${c.name} · ${c.role}`;
  $("#chat-ava").textContent = VILLAGERS.find((v) => v.id === id).avatar;
  $("#input").placeholder = t().inputPh(c.name);
}

// ── Chat log (center) ──────────────────────────────────────────────────────────
function renderChat() {
  const box = $("#log");
  box.innerHTML = "";
  const log = logOf.get(current);
  if (!log.length) {
    box.appendChild(el("div", "hint", ready ? t().hintReady : t().hintLoad));
  }
  for (const m of log) box.appendChild(renderMsg(m));
  box.scrollTop = box.scrollHeight;
}

function renderMsg(m) {
  if (m.role === "player") {
    const row = el("div", "msg you");
    row.appendChild(el("div", "bubble", m.text));
    return row;
  }
  if (m.role === "event") {
    const row = el("div", "msg event");
    row.innerHTML = `<span class="evt-dot"></span> maeul.pushEvent(<b>"${m.kind}"</b>, ${m.severity}) — ${m.note}`;
    return row;
  }
  const ui = EMOTION_UI[m.emotion] || EMOTION_UI.neutral;
  const row = el("div", "msg npc");
  const badge = el("span", `badge ${ui.tone}`); badge.textContent = m.emotion;
  const body = el("div", "npc-body");
  const bubble = el("div", "bubble npc-line"); bubble.textContent = m.line || "…";
  body.appendChild(bubble);
  if (m.action) body.appendChild(el("div", "action", `※ ${m.action}`));
  row.appendChild(badge); row.appendChild(body);
  m._bubble = bubble; m._badge = badge; m._row = row;
  return row;
}

// ── World bar (top) ────────────────────────────────────────────────────────────
function renderWorld() {
  const d = t();
  const dis = world.activeDisaster();
  $("#world-day").textContent = `Day ${world.day}`;
  $("#world-time").textContent = d.times[world.time] || world.time;
  $("#world-weather").textContent = dis ? d.disasters[dis.kind].weather : d.weatherClear;
  const chip = $("#world-state");
  if (dis) {
    chip.textContent = d.activeFmt(d.disasters[dis.kind].short);
    chip.className = "state bad";
    document.body.classList.add("crisis");
  } else {
    chip.textContent = d.calmState;
    chip.className = "state calm";
    document.body.classList.remove("crisis");
  }
}

// Re-localize an already-active disaster's prompt note + weather to current lang.
function relocalizeWorld() {
  const dis = world.activeDisaster();
  if (dis) {
    dis.note = t().disasters[dis.kind].note;
    world.weather = t().disasters[dis.kind].weatherEn;
  } else {
    world.weather = "clear";
  }
}

function pushEvent(kind) {
  const d = t().disasters[kind];
  world.events = [{ kind, severity: kind === "flood" ? 0.85 : kind === "earthquake" ? 0.8 : 0.75, note: d.note }];
  world.weather = d.weatherEn;
  renderWorld();
  logOf.get(current).push({ role: "event", kind, severity: world.events[0].severity, note: d.note });
  renderChat();
  toast(t().disasterToast(d.label));
}

function clearDisaster() {
  world.events = [];
  world.weather = "clear";
  renderWorld();
  toast(t().calmToast);
}

function nextDay() {
  world.day += 1;
  world.time = TIMES[(TIMES.indexOf(world.time) + 2) % TIMES.length];
  world.events = [];
  world.weather = "clear";
  renderWorld();
  toast(t().dayToast(world.day));
}

// ── The actual model call — streamed, live-parsed on-device ─────────────────────
function needModel() {
  toast(t().needModel);
  const b = $("#load-btn"); b.classList.add("pulse");
  b.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function speak(villagerId, playerInput) {
  if (!engine) { needModel(); return; }
  if (busy) return;
  busy = true;
  setBusy(true);

  const c = chars.get(villagerId);
  // buildSystemPrompt is the faithful engine port. We append a language directive
  // + a concrete JSON example so a small on-device model reliably emits the right
  // shape and speaks the chosen language.
  const system = buildSystemPrompt(c, world) +
    `\n\nAlways reply in ${t().langName}. Output EXACTLY one JSON object, nothing else. Example:\n${t().example}`;
  const user = buildUserPrompt(playerInput);

  const msg = { role: "npc", line: "", emotion: "neutral", action: null };
  const log = logOf.get(villagerId);
  log.push(msg);
  renderChat();
  const bubble = msg._bubble, badge = msg._badge, row = msg._row;
  bubble.classList.add("thinking");
  bubble.textContent = "";

  let raw = "";
  try {
    // Streamed free text. We deliberately DON'T force json_object: on some WebLLM
    // builds grammar-constrained decoding stalls. The tolerant parser (engine.js)
    // live-extracts the `line` from whatever the model emits — JSON, key:value, prose.
    const stream = await engine.chat.completions.create({
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.7,
      max_tokens: 320,
      stream: true,
    });
    for await (const chunk of stream) {
      raw += chunk.choices[0]?.delta?.content || "";
      const p = parseReply(raw);
      if (p.line) { bubble.classList.remove("thinking"); bubble.textContent = p.line; }
      if (p.emotion && p.emotion !== msg.emotion) {
        msg.emotion = p.emotion;
        const ui = EMOTION_UI[p.emotion];
        badge.textContent = p.emotion; badge.className = `badge ${ui.tone}`;
      }
      $("#log").scrollTop = $("#log").scrollHeight;
    }
  } catch (e) {
    bubble.classList.remove("thinking");
    bubble.textContent = t().modelErr(e?.message || e);
    busy = false; setBusy(false); return;
  }

  const final = parseReply(raw);
  msg.line = final.line || bubble.textContent || "…";
  msg.emotion = final.emotion;
  msg.action = final.action;
  bubble.classList.remove("thinking");
  bubble.textContent = msg.line;
  const ui = EMOTION_UI[msg.emotion];
  badge.textContent = msg.emotion; badge.className = `badge ${ui.tone}`;
  if (msg.action)
    row.querySelector(".npc-body").appendChild(el("div", "action", `※ ${msg.action}`));

  emotionOf.set(villagerId, msg.emotion);
  renderRoster();

  busy = false;
  setBusy(false);
  $("#input").focus();
}

// ── Model loading (WebLLM) ─────────────────────────────────────────────────────
async function loadModel() {
  if (!navigator.gpu) { $("#gate").classList.add("show"); return; }
  const model = $("#model-select").value;
  const btn = $("#load-btn");
  btn.disabled = true; btn.classList.remove("pulse");
  $("#loader").classList.add("show");
  try {
    engine = await webllm.CreateMLCEngine(model, {
      initProgressCallback: (r) => {
        const pct = Math.round((r.progress || 0) * 100);
        $("#load-bar").style.width = pct + "%";
        $("#load-text").textContent = r.text || t().loadingFmt(pct);
      },
    });
    ready = true;
    $("#loader").classList.remove("show");
    $("#model-status").textContent = t().statusReady;
    $("#model-status").className = "ready";
    renderChat();
    toast(t().loaded);
    $("#input").focus();
  } catch (e) {
    $("#load-text").textContent = t().loadFail(e?.message || e);
    btn.disabled = false;
  }
}

// ── Small UI utilities ─────────────────────────────────────────────────────────
let toastTimer = null;
function toast(text) {
  const el2 = $("#toast");
  el2.textContent = text; el2.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el2.classList.remove("show"), 3400);
}
// The input is always typeable; we only disable it briefly during generation.
function setBusy(on) {
  $("#input").disabled = on;
  $("#send").disabled = on;
}

// ── Wire up ────────────────────────────────────────────────────────────────────
function init() {
  rebuildChars();
  applyStaticI18n();

  $("#load-btn").onclick = loadModel;
  $("#load-btn").classList.add("pulse"); // draw the eye until a model is loaded

  document.querySelectorAll("#langtog button").forEach((b) =>
    b.onclick = () => setLang(b.dataset.lang));

  $("#btn-flood").onclick = () => pushEvent("flood");
  $("#btn-quake").onclick = () => pushEvent("earthquake");
  $("#btn-fire").onclick  = () => pushEvent("fire");
  $("#btn-calm").onclick  = () => clearDisaster();
  $("#btn-day").onclick   = () => nextDay();
  $("#btn-idle").onclick  = () => speak(current, "");

  const send = () => {
    const box = $("#input");
    const text = box.value.trim();
    if (!engine) { needModel(); return; }
    if (!text) { speak(current, ""); return; }
    box.value = "";
    logOf.get(current).push({ role: "player", text });
    renderChat();
    speak(current, text);
  };
  $("#send").onclick = send;
  $("#input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });

  if (!navigator.gpu) $("#gate").classList.add("show");

  selectVillager("mira");
  renderWorld();
}

init();
