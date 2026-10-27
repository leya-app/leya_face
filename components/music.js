// Спокойна фонова музика, генерирана в браузъра (Web Audio) — без файлове и лицензи.
// Мек акорден фон + редки камбанки в пентатоника. Затихва, докато треньорът говори.

let ctx = null;
let master = null;
let timers = [];
let playing = false;
let level = 0.14;

const CHORDS = [
  [48, 55, 59, 64], // Cmaj7
  [45, 52, 55, 60], // Am7
  [41, 48, 52, 57], // Fmaj7
  [43, 50, 55, 59], // G
];
const BELLS = [72, 74, 76, 79, 81, 84];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Трябва да се извика от натискане на бутон (iPhone иначе не пуска звук).
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      master.connect(lp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {}
}

function pad(notes, at, dur) {
  for (const m of notes) {
    for (const det of [-4, 4]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = hz(m);
      o.detune.value = det;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.05, at + 2.5);
      g.gain.setValueAtTime(0.05, at + dur - 2.5);
      g.gain.linearRampToValueAtTime(0, at + dur + 0.5);
      o.connect(g).connect(master);
      o.start(at);
      o.stop(at + dur + 0.6);
    }
  }
}

function bell(at) {
  const m = BELLS[Math.floor(Math.random() * BELLS.length)];
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = hz(m);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.06, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 3);
  o.connect(g).connect(master);
  o.start(at);
  o.stop(at + 3.1);
}

export function startMusic() {
  if (!ctx || playing) return;
  playing = true;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(level, ctx.currentTime, 1.2);
  let i = 0;
  const BAR = 8;
  const tick = () => {
    if (!playing) return;
    const at = ctx.currentTime + 0.1;
    pad(CHORDS[i % CHORDS.length], at, BAR);
    if (Math.random() < 0.8) bell(at + 1 + Math.random() * 3);
    if (Math.random() < 0.5) bell(at + 4.5 + Math.random() * 3);
    i += 1;
    timers.push(setTimeout(tick, BAR * 1000));
  };
  tick();
}

export function stopMusic() {
  playing = false;
  timers.forEach(clearTimeout);
  timers = [];
  if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
}

// Тише, докато треньорът говори.
export function duck(on) {
  if (!ctx || !master || !playing) return;
  master.gain.setTargetAtTime(on ? level * 0.35 : level, ctx.currentTime, 0.25);
}
