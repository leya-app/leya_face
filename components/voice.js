// Гласът на треньора: записани фрази (public/voice/NNN.mp3) по номерата в data/voice-lines.json.
// Липсващ запис → български глас на устройството, ако има такъв; иначе мълчи.
import LINES from '../data/voice-lines.json';
import { getCtx, duck, getRecDest } from './music';

const norm = (t) => String(t).toLowerCase().replace(/[-–]/g, ' ').replace(/[„“"'.!?:,]/g, '').replace(/\s+/g, ' ').trim();
const BY_TEXT = new Map(LINES.filter((l) => !l.voice).map((l) => [norm(l.text), l.n]));
// втори глас (Коста – масажите): първо търсим неговия запис, после общия
const BY_VOICE = new Map(LINES.filter((l) => l.voice).map((l) => [`${l.voice}|${norm(l.text)}`, l.n]));
const lookup = (t, voice) => (voice && BY_VOICE.get(`${voice}|${norm(t)}`)) || BY_TEXT.get(norm(t)) || BY_VOICE.get(`kosta|${norm(t)}`);
export const TOTAL_LINES = LINES.filter((l) => !l.unused && !l.voice).length;

let have = new Set();
let ready = null;
export function loadVoiceIndex() {
  if (!ready) {
    ready = fetch('/voice/index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => { have = new Set(list); return have; })
      .catch(() => have);
  }
  return ready;
}

const cache = new Map();
async function buffer(n) {
  if (!cache.has(n)) {
    cache.set(n, fetch(`/voice/${n}.mp3`).then((r) => r.arrayBuffer()).then((b) => getCtx().decodeAudioData(b)));
  }
  return cache.get(n);
}

export function preload(texts, voice) {
  if (!getCtx()) return;
  loadVoiceIndex().then(() => {
    for (const t of texts) { const n = lookup(t, voice); if (n && have.has(n)) buffer(n).catch(() => {}); }
  });
}

function bgTtsVoice() {
  try { return window.speechSynthesis?.getVoices().find((v) => /^bg([-_]|$)/i.test(v.lang || '')) || null; } catch { return null; }
}

let token = 0;
let current = null;

function stopCurrent() {
  try { current?.stop?.(); } catch {}
  current = null;
  try { window.speechSynthesis?.cancel(); } catch {}
  duck(false);
}

async function playOne(text, cancelled, voice) {
  const n = lookup(text, voice);
  const ctx = getCtx();
  if (n && have.has(n) && ctx) {
    try {
      const buf = await buffer(n);
      if (cancelled()) return;
      await new Promise((resolve) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        const rd = getRecDest(); if (rd) src.connect(rd);
        src.onended = resolve;
        current = src;
        duck(true);
        src.start();
      });
      duck(false);
      return;
    } catch {}
  }
  const v = bgTtsVoice();
  if (!v || cancelled()) return;
  await new Promise((resolve) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v; u.lang = v.lang; u.rate = 0.95;
      u.onstart = () => duck(true);
      u.onend = u.onerror = () => { duck(false); resolve(); };
      window.speechSynthesis.speak(u);
    } catch { resolve(); }
  });
}

// pieces: една или няколко фрази, казват се една след друга.
// voice: 'kosta' за масажите; без него – Весела.
export async function say(pieces, on, voice) {
  const my = ++token;
  stopCurrent();
  if (!on) return;
  await loadVoiceIndex();
  for (const t of [].concat(pieces)) {
    if (my !== token) return;
    await playOne(t, () => my !== token, voice);
  }
}

export function silence() { token++; stopCurrent(); }
