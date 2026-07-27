// Maeul core — a faithful, dependency-free port of the Python engine to the browser.
// Character (①) + World (②) → one system prompt → the model → a structured Reply.
// This is the SAME logic as maeul/director.py, character.py, world.py, schema.py,
// running entirely on-device. No server, no API key, $0.

// ── ③ schema.py: a small fixed emotion set keeps engine-side animation simple ──
export const EMOTIONS = [
  "neutral", "happy", "sad", "angry", "scared",
  "surprised", "tired", "excited", "worried",
];

// How each emotion shows up in the UI (face + accent). The engine just emits the
// emotion string; a game maps it to an Animator trigger — here we map to a badge.
export const EMOTION_UI = {
  neutral:   { face: "😐", tone: "muted"  },
  happy:     { face: "😊", tone: "good"   },
  sad:       { face: "😢", tone: "cold"   },
  angry:     { face: "😠", tone: "bad"    },
  scared:    { face: "😨", tone: "bad"    },
  surprised: { face: "😲", tone: "warn"   },
  tired:     { face: "😪", tone: "muted"  },
  excited:   { face: "🤩", tone: "good"   },
  worried:   { face: "😟", tone: "warn"   },
};

// ── schema.py: tolerant reply parser ────────────────────────────────────────
// Small on-device models are inconsistent: some emit clean JSON, some emit
// `key: "value"` or even unquoted `emotion: happy, action: None`. We salvage a
// field from ALL of those shapes — and from TRUNCATED output — so the spoken
// line can even be live-rendered WHILE the model is still streaming it.
function unnull(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return /^(null|none|없음|)$/i.test(t) ? null : t;
}
function fieldOf(raw, key) {
  // 1) quoted value:  "key":"…"   or   key: "…"   (also matches while truncated)
  let m = new RegExp('"?' + key + '"?\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)', "s").exec(raw);
  if (m) {
    return m[1].replace(/\\"/g, '"').replace(/\\n/g, " ")
      .replace(/\\\//g, "/").replace(/\\$/, "").trim();
  }
  // 2) unquoted value:  key: happy   (stop at comma / brace / newline)
  m = new RegExp('"?' + key + '"?\\s*:\\s*([^",}\\n]+)', "s").exec(raw);
  return m ? m[1].trim() : null;
}

const JSON_BLOCK = /\{[\s\S]*\}/;

// Parse a model response into a Reply — tolerant of JSON, key:value, or prose.
//   1) a complete {...} block,  2) regex-salvage fields from partial/loose text,
//   3) fall back to raw text as the spoken line.  Emotion normalized to the set.
export function parseReply(raw, fallbackTopic = null) {
  raw = (raw || "").trim();
  let data = null;
  const m = JSON_BLOCK.exec(raw);
  if (m) {
    try { data = JSON.parse(m[0]); } catch { data = null; }
  }

  let line, emotion, action, topic;
  if (data && (("line" in data) || ("text" in data))) {
    line = String(data.line || data.text || "").trim();
    emotion = String(data.emotion || "neutral").trim().toLowerCase();
    action = unnull(data.action);
    topic = unnull(data.topic) || fallbackTopic;
  } else {
    line = fieldOf(raw, "line") || fieldOf(raw, "text") || "";
    emotion = (fieldOf(raw, "emotion") || "neutral").toLowerCase();
    action = unnull(fieldOf(raw, "action"));
    topic = unnull(fieldOf(raw, "topic")) || fallbackTopic;
    // Last resort: no recognizable fields — treat the whole thing as the line.
    if (!line && raw && !/["{]/.test(raw)) line = raw;
  }

  if (!EMOTIONS.includes(emotion)) emotion = "neutral";
  return { line, emotion, action: unnull(action), topic: topic || null };
}

// ── ① character.py: a villager is just a data card ──────────────────────────
export class Character {
  constructor(card) { Object.assign(this, { anxiety: 0.3, traits: [], likes: [],
    dislikes: [], fears: [], catchphrases: [], knowledge: [], relationships: {} }, card); }

  personaBlock() {
    let head = `You are ${this.name}`;
    if (this.role) head += `, the village ${this.role}`;
    if (this.age) head += ` (age ${this.age})`;
    head += ".";
    const lines = [head];
    if (this.persona) lines.push(this.persona);
    if (this.traits.length) lines.push("Personality: " + this.traits.join(", ") + ".");
    if (this.speech_style) lines.push("Speech style: " + this.speech_style);
    if (this.catchphrases.length)
      lines.push("You sometimes say things like: " +
        this.catchphrases.map((c) => `"${c}"`).join("; ") + ".");
    if (this.likes.length) lines.push("You like: " + this.likes.join(", ") + ".");
    if (this.dislikes.length) lines.push("You dislike: " + this.dislikes.join(", ") + ".");
    if (this.fears.length) lines.push("You are afraid of: " + this.fears.join(", ") + ".");
    const rel = Object.entries(this.relationships);
    if (rel.length) lines.push("People you know: " +
      rel.map(([k, v]) => `${k} is ${v}`).join("; ") + ".");
    if (this.knowledge.length)
      lines.push("You can talk knowledgeably about: " + this.knowledge.join(", ") + ".");
    return lines.join("\n");
  }
}

// ── ② world.py: the shared, changing state that makes today different ────────
const DISASTERS = new Set(["earthquake", "flood", "fire", "storm", "plague", "bandit_raid", "famine"]);

// FNV-1a 32-bit: a tiny deterministic hash so "today's focus" is stable within a
// day but rotates day to day (Python uses sha256; any stable hash works here).
function daySeed(name, day, salt) {
  let h = 0x811c9dc5;
  const s = `${name}|${day}|${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class World {
  constructor(opts = {}) {
    Object.assign(this, { name: "바람 마을", day: 1, time: "morning",
      season: "spring", weather: "clear", events: [] }, opts);
  }
  activeDisaster() { return this.events.find((e) => DISASTERS.has(e.kind)) || null; }

  situationBlock() {
    const lines = [`Right now it is ${this.time} on day ${this.day}, ${this.season}, ` +
      `weather ${this.weather}, in ${this.name}.`];
    const dis = this.activeDisaster();
    if (dis) {
      const sev = dis.severity < 0.34 ? "a minor" : dis.severity < 0.67 ? "a serious" : "a severe";
      lines.push(`A DISASTER is happening: ${sev} ${dis.kind}. ${dis.note || ""}`.trim());
      lines.push("React the way YOUR character would to real danger — fear, " +
        "urgency, or grim resolve depending on your personality. Do not be " +
        "cheerful or make small talk as if nothing is wrong.");
    } else {
      lines.push("The village is calm; ordinary daily life. Small talk, gossip, " +
        "chores, and passing thoughts are appropriate.");
    }
    return lines.join("\n");
  }
}

// ── ⑤ director.py: assemble persona + situation + mood + daily focus ─────────
const DAILY_FOCUS = [
  "a small worry on your mind today",
  "a bit of village gossip you heard",
  "something you're looking forward to",
  "a chore or task you should be doing",
  "a memory that surfaced today",
  "an opinion about the weather or season",
  "a question you've been wondering about",
  "a complaint, lightly made",
];

const SYS_RULES =
  "You role-play a single village NPC in a game. Stay fully in character. " +
  "Reply with ONE short spoken line (1-3 sentences), in the same language the " +
  "player used. Never break character, never mention being an AI or a model. " +
  "Return ONLY a compact JSON object with keys: line (string, what you say), " +
  `emotion (one of: ${EMOTIONS.join(", ")}), action (short stage direction or ` +
  "null), topic (a few words). No markdown, no extra text.";

// Anxiety = the character's baseline, pushed up by an active disaster.
// This one number is where personality × situation multiply.
export function buildSystemPrompt(character, world) {
  let anxiety = character.anxiety;
  const dis = world.activeDisaster();
  if (dis) anxiety = Math.min(1.0, anxiety + 0.5 * dis.severity + 0.2);
  const mood = anxiety < 0.34 ? "You feel calm."
    : anxiety < 0.67 ? "You feel a little on edge."
    : "You feel frightened and tense.";
  const focus = DAILY_FOCUS[daySeed(world.name, world.day, character.id) % DAILY_FOCUS.length];

  return [
    character.personaBlock(),
    world.situationBlock(),
    mood,
    `Today, let your idle remarks lean toward: ${focus}.`,
    SYS_RULES,
  ].join("\n\n");
}

export function buildUserPrompt(playerInput) {
  const t = (playerInput || "").trim();
  return t
    ? `The player says to you: "${t}"`
    : "No one has spoken. Say a short, natural line to yourself or to the air — " +
      "fitting the time, weather, and your mood.";
}
