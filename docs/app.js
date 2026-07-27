// Maeul — live browser demo wiring.
// Uses the on-device engine (engine.js) + WebLLM (in-browser LLM via WebGPU).
// Everything below runs in the visitor's browser. No server, no key, $0.

import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import {
  Character, World, buildSystemPrompt, buildUserPrompt, parseReply, EMOTION_UI,
} from "./engine.js";

// ── The example village (ported from examples/village/*.json) ────────────────
const VILLAGERS = [
  { id: "mira", avatar: "🌿",
    name: "미라", role: "약초상", age: 34,
    persona: "바람 마을에서 약초와 물약을 파는 상인. 어릴 때 강 범람으로 부모를 잃어 물을 무서워한다.",
    traits: ["따뜻함", "현실적", "수다스러움", "겁이 많음"],
    speech_style: "다정하고 말이 많다. 존댓말과 반말을 섞어 친근하게 말한다.",
    likes: ["햇살 좋은 아침", "잘 마른 약초", "단골 손님"],
    dislikes: ["비 오는 날", "외상"],
    fears: ["홍수", "깊은 물", "강"],
    catchphrases: ["아이고, 어서 와요", "약초는 정직해요"],
    knowledge: ["약초와 물약", "마을 사람들 소문", "옛날 강 범람 이야기"],
    relationships: { 토르: "옆집 대장장이, 츤데레 친구", 핀: "가끔 심부름 해주는 꼬마" },
    anxiety: 0.4 },
  { id: "tor", avatar: "🔨",
    name: "토르", role: "대장장이", age: 47,
    persona: "무뚝뚝하지만 속은 깊은 대장장이. 마을 방어를 늘 걱정한다. 말수가 적다.",
    traits: ["무뚝뚝함", "책임감", "용감함", "고집"],
    speech_style: "짧고 퉁명스러운 문장. 감정 표현이 서툴다.",
    likes: ["좋은 쇠", "조용함", "든든한 식사"],
    dislikes: ["게으름", "허풍"],
    fears: ["마을이 불타는 것"],
    catchphrases: ["흥.", "쇠는 거짓말 안 해."],
    knowledge: ["무기와 대장일", "마을 방어", "산길"],
    relationships: { 미라: "옆집 약초상, 시끄럽지만 나쁘지 않다", 핀: "재능 있는 꼬마" },
    anxiety: 0.2 },
  { id: "finn", avatar: "🧒",
    name: "핀", role: "꼬마", age: 9,
    persona: "호기심 많고 겁 없는 마을 꼬마. 어른들 심부름을 하며 온 마을을 뛰어다닌다.",
    traits: ["호기심", "장난기", "순수함", "겁 없음"],
    speech_style: "밝고 빠른 반말. 질문이 많다.",
    likes: ["모험 이야기", "간식", "토르 아저씨의 대장간"],
    dislikes: ["숙제", "일찍 자기"],
    fears: ["엄마한테 혼나는 것"],
    catchphrases: ["우와, 진짜?", "나도 데려가!"],
    knowledge: ["마을 구석구석 지리", "누가 뭘 하는지"],
    relationships: { 미라: "약초 누나", 토르: "멋진 대장장이 아저씨" },
    anxiety: 0.15 },
  { id: "sena", avatar: "🧓",
    name: "세나", role: "촌장", age: 61,
    persona: "바람 마을의 촌장. 마을의 역사와 전설을 모두 기억하는 지혜로운 노인.",
    traits: ["지혜로움", "차분함", "권위", "따뜻함"],
    speech_style: "느리고 무게 있는 존댓말. 옛이야기를 자주 인용한다.",
    likes: ["젊은이들의 질문", "차 한 잔", "마을의 평화"],
    dislikes: ["성급함", "역사를 잊는 것"],
    fears: ["마을의 몰락"],
    catchphrases: ["오래 살다 보면 말이지…", "바람은 늘 답을 알고 있어요"],
    knowledge: ["마을 역사", "바람 협곡 전설", "옛 재해 기록"],
    relationships: { 미라: "아끼는 마을 사람", 토르: "믿음직한 대장장이" },
    anxiety: 0.25 },
];

const DISASTERS = {
  flood:      { kind: "flood",      severity: 0.85, note: "은하천이 둑을 넘어 마을로 물이 밀려든다.", label: "🌊 홍수", weather: "폭우" },
  earthquake: { kind: "earthquake", severity: 0.8,  note: "우물 옆 땅이 갈라지고 집들이 흔들린다.",   label: "⚡ 지진", weather: "흐림" },
  fire:       { kind: "fire",       severity: 0.75, note: "대장간 근처에서 불길이 번지고 있다.",       label: "🔥 화재", weather: "연기" },
};

const TIMES = ["dawn", "morning", "noon", "afternoon", "evening", "night"];
const TIME_KO = { dawn: "새벽", morning: "아침", noon: "정오", afternoon: "오후", evening: "저녁", night: "밤" };
const WEATHER_KO_DEFAULT = "맑음";

// ── State ────────────────────────────────────────────────────────────────────
const world = new World({ name: "바람 마을", day: 1, time: "morning", weather: WEATHER_KO_DEFAULT });
const chars = new Map(VILLAGERS.map((v) => [v.id, new Character(v)]));
const emotionOf = new Map(VILLAGERS.map((v) => [v.id, "neutral"]));
const logOf = new Map(VILLAGERS.map((v) => [v.id, []])); // per-villager chat history (UI only)
let current = "mira";
let engine = null;
let busy = false;

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, txt) => { const n = document.createElement(tag);
  if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };

// ── Roster (left column) ──────────────────────────────────────────────────────
function renderRoster() {
  const box = $("#roster");
  box.innerHTML = "";
  for (const v of VILLAGERS) {
    const emo = emotionOf.get(v.id);
    const ui = EMOTION_UI[emo];
    const card = el("button", "villager" + (v.id === current ? " on" : ""));
    card.dataset.id = v.id;
    card.innerHTML =
      `<span class="ava">${v.avatar}</span>` +
      `<span class="who"><b>${v.name}</b><small>${v.role}</small></span>` +
      `<span class="mood ${ui.tone}" title="${emo}">${ui.face}</span>`;
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
  $("#input").placeholder = `${c.name}에게 말 걸기…`;
}

// ── Chat log (center) ──────────────────────────────────────────────────────────
function renderChat() {
  const box = $("#log");
  box.innerHTML = "";
  const log = logOf.get(current);
  if (!log.length) {
    box.appendChild(el("div", "hint",
      "말을 걸어보세요. 또는 위 세계 상태를 바꿔 마을에 재해를 일으켜 보세요 — 같은 주민이 다르게 반응합니다."));
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
  // npc
  const ui = EMOTION_UI[m.emotion] || EMOTION_UI.neutral;
  const row = el("div", "msg npc");
  const badge = el("span", `badge ${ui.tone}`);
  badge.textContent = m.emotion;
  const body = el("div", "npc-body");
  const bubble = el("div", "bubble npc-line");
  bubble.textContent = m.line || "…";
  body.appendChild(bubble);
  if (m.action) body.appendChild(el("div", "action", `※ ${m.action}`));
  row.appendChild(badge);
  row.appendChild(body);
  m._bubble = bubble; m._badge = badge; m._row = row;
  return row;
}

// ── World bar (top) ────────────────────────────────────────────────────────────
function renderWorld() {
  const dis = world.activeDisaster();
  $("#world-day").textContent = `Day ${world.day}`;
  $("#world-time").textContent = TIME_KO[world.time] || world.time;
  $("#world-weather").textContent = world.weather;
  const chip = $("#world-state");
  if (dis) {
    chip.textContent = `⚠ ${DISASTERS[dis.kind]?.label.replace(/^[^ ]+ /, "") || dis.kind} 발생`;
    chip.className = "state bad";
    document.body.classList.add("crisis");
  } else {
    chip.textContent = "평온";
    chip.className = "state calm";
    document.body.classList.remove("crisis");
  }
}

function pushEvent(kind) {
  const d = DISASTERS[kind];
  world.events = [{ kind: d.kind, severity: d.severity, note: d.note }];
  world.weather = d.weather;
  renderWorld();
  // Log the event into the current villager's thread so the flip is visible.
  logOf.get(current).push({ role: "event", kind: d.kind, severity: d.severity, note: d.note });
  renderChat();
  toast(`${d.label} — 이제 주민에게 말을 걸어 반응을 보세요`);
}

function clearDisaster() {
  world.events = [];
  world.weather = WEATHER_KO_DEFAULT;
  renderWorld();
  toast("☀️ 마을이 평온을 되찾았습니다");
}

function nextDay() {
  world.day += 1;
  world.time = TIMES[(TIMES.indexOf(world.time) + 2) % TIMES.length];
  clearDisaster();
  toast(`🌅 Day ${world.day} — 새로운 하루. 잡담 화제가 바뀝니다`);
}

// ── The actual model call — streamed, live-parsed on-device ─────────────────────
async function speak(villagerId, playerInput) {
  if (!engine) { toast("먼저 '모델 켜기'로 브라우저 모델을 불러오세요"); return; }
  if (busy) return;
  busy = true;
  setInputEnabled(false);

  const c = chars.get(villagerId);
  // Small in-browser models need a hard nudge to stay in JSON. buildSystemPrompt
  // is the faithful engine port; we append a concrete format example here so a
  // 1–1.5B model reliably emits the right shape (and we force json_object below).
  const system = buildSystemPrompt(c, world) +
    '\n\nOutput EXACTLY one JSON object, nothing else. Example shape:\n' +
    '{"line":"아이고, 어서 와요!","emotion":"happy","action":"손을 흔든다","topic":"인사"}';
  const user = buildUserPrompt(playerInput);

  // Placeholder NPC message we mutate as tokens stream in.
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
    // builds grammar-constrained decoding stalls. Instead the villager's words
    // stream in and the tolerant parser (engine.js) live-extracts the `line` from
    // whatever shape the model emits — JSON, `key: value`, or plain prose.
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
        badge.textContent = p.emotion;
        badge.className = `badge ${ui.tone}`;
      }
      $("#log").scrollTop = $("#log").scrollHeight;
    }
  } catch (e) {
    bubble.classList.remove("thinking");
    bubble.textContent = "(모델 오류: " + (e?.message || e) + ")";
    busy = false; setInputEnabled(true); return;
  }

  // Final reconcile once the whole reply is in — fixes emotion/action/line.
  const final = parseReply(raw);
  msg.line = final.line || bubble.textContent || "…";
  msg.emotion = final.emotion;
  msg.action = final.action;
  bubble.classList.remove("thinking");
  bubble.textContent = msg.line;
  const ui = EMOTION_UI[msg.emotion];
  badge.textContent = msg.emotion;
  badge.className = `badge ${ui.tone}`;
  if (msg.action)
    row.querySelector(".npc-body").appendChild(el("div", "action", `※ ${msg.action}`));

  // Reflect the villager's new emotion on their roster portrait.
  emotionOf.set(villagerId, msg.emotion);
  renderRoster();

  busy = false;
  setInputEnabled(true);
  $("#input").focus();
}

// ── Model loading (WebLLM) ─────────────────────────────────────────────────────
const MODELS = {
  "Qwen2.5-3B-Instruct-q4f16_1-MLC":   "Qwen2.5 3B · 권장 · 한국어·감정반응 안정 · 최초 1회 ~1.9GB",
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": "Qwen2.5 1.5B · 가벼움 ~1.0GB · 한국어 다소 거침",
  "Llama-3.2-3B-Instruct-q4f16_1-MLC": "Llama 3.2 3B · 대안 ~1.9GB",
};

async function loadModel() {
  if (!navigator.gpu) { gateNoWebGPU(); return; }
  const model = $("#model-select").value;
  const btn = $("#load-btn");
  btn.disabled = true;
  $("#loader").classList.add("show");
  try {
    engine = await webllm.CreateMLCEngine(model, {
      initProgressCallback: (r) => {
        const pct = Math.round((r.progress || 0) * 100);
        $("#load-bar").style.width = pct + "%";
        $("#load-text").textContent = r.text || `불러오는 중… ${pct}%`;
      },
    });
    $("#loader").classList.remove("show");
    $("#model-status").textContent = "● 모델 준비됨 (온디바이스)";
    $("#model-status").className = "ready";
    setInputEnabled(true);
    $("#controls").classList.add("live");
    toast("브라우저 안에서 모델이 켜졌습니다. 서버 없음 · $0");
    $("#input").focus();
  } catch (e) {
    $("#load-text").textContent = "로드 실패: " + (e?.message || e);
    btn.disabled = false;
  }
}

// ── Small UI utilities ─────────────────────────────────────────────────────────
let toastTimer = null;
function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}
function setInputEnabled(on) {
  $("#input").disabled = !on || busy;
  $("#send").disabled = !on || busy;
}
function gateNoWebGPU() {
  $("#gate").classList.add("show");
}

// ── Wire up ────────────────────────────────────────────────────────────────────
function init() {
  // Model dropdown
  const sel = $("#model-select");
  for (const [id, label] of Object.entries(MODELS)) {
    const o = el("option", null, label); o.value = id; sel.appendChild(o);
  }
  $("#load-btn").onclick = loadModel;

  // World controls
  $("#btn-flood").onclick = () => pushEvent("flood");
  $("#btn-quake").onclick = () => pushEvent("earthquake");
  $("#btn-fire").onclick = () => pushEvent("fire");
  $("#btn-calm").onclick = () => { clearDisaster(); };
  $("#btn-day").onclick = () => nextDay();
  $("#btn-idle").onclick = () => speak(current, ""); // ambient self-talk

  // Chat input
  const send = () => {
    const box = $("#input");
    const text = box.value.trim();
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

  if (!navigator.gpu) gateNoWebGPU();

  renderRoster();
  selectVillager("mira");
  renderWorld();
  setInputEnabled(false);
}

init();
