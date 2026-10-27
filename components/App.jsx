'use client';

import { useEffect, useRef, useState } from 'react';
import Face from './Face';
import { EXERCISES, PROGRAMS, ZONES, programMinutes, countWord } from './data';
import { METRICS, progressFor, startTracking } from './tracker';
import { unlockAudio, startMusic, stopMusic, duck } from './music';

/* ---------- малки помощници ---------- */

const store = {
  get(k, def) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  },
};

const dayKey = (dt = new Date()) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

function streakFrom(days) {
  const set = new Set(days);
  let n = 0;
  const dt = new Date();
  if (!set.has(dayKey(dt))) dt.setDate(dt.getDate() - 1);
  while (set.has(dayKey(dt))) { n++; dt.setDate(dt.getDate() - 1); }
  return n;
}

const daysWord = (n) => (n === 1 ? '1 ден' : `${n} дни`);

// Говорим само с български глас. Ако устройството няма такъв, мълчим,
// вместо чужд глас да чете кирилицата.
function findBgVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  try {
    return window.speechSynthesis.getVoices().find((v) => /^bg([-_]|$)/i.test(v.lang || '')) || null;
  } catch { return null; }
}

function speak(text, on) {
  if (!on) return;
  const voice = findBgVoice();
  if (!voice) return;
  try {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.95;
    u.onstart = () => duck(true);
    u.onend = () => duck(false);
    u.onerror = () => duck(false);
    s.speak(u);
  } catch {}
}

// 'checking' | 'ok' | 'none' — гласовете се зареждат асинхронно.
function useBgVoice() {
  const [state, setState] = useState('checking');
  useEffect(() => {
    const s = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!s) { setState('none'); return; }
    const check = () => setState(findBgVoice() ? 'ok' : 'none');
    const early = findBgVoice();
    if (early) { setState('ok'); return; }
    s.addEventListener?.('voiceschanged', check);
    const t = setTimeout(check, 1500);
    return () => { clearTimeout(t); s.removeEventListener?.('voiceschanged', check); };
  }, []);
  return state;
}

const Icon = {
  back: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>,
  close: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  play: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>,
  pause: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>,
  chevron: <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>,
  cam: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="13" height="10" rx="2" /><path d="M16 11l5-3v8l-5-3" /></svg>,
  check: <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>,
  voice: <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" /></svg>,
  soundOn: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9a4 4 0 010 6M19 6a8 8 0 010 12" /></svg>,
  soundOff: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l5 6M22 9l-5 6" /></svg>,
  music: <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></svg>,
  user: <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
};

/* ---------- приложение ---------- */

export default function App() {
  const [screen, setScreen] = useState({ name: 'home' });
  const [days, setDays] = useState([]);
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(true);
  const [useCamera, setUseCamera] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setDays(store.get('fy-days', []));
    setSound(store.get('fy-sound', true));
    setMusic(store.get('fy-music', true));
    setUseCamera(store.get('fy-camera', true));
  }, []);

  const go = (name, extra = {}) => setScreen({ name, ...extra });

  const finish = (r) => {
    const today = dayKey();
    const next = days.includes(today) ? days : [...days, today];
    setDays(next);
    store.set('fy-days', next);
    setResult({ ...r, streak: streakFrom(next) });
    go('done', { program: screen.program });
  };

  const toggleMusic = () => { setMusic((m) => { store.set('fy-music', !m); return !m; }); };
  const toggleSound = () => { setSound((s) => { store.set('fy-sound', !s); return !s; }); };
  const toggleCamera = (v) => { setUseCamera(v); store.set('fy-camera', v); };

  return (
    <main className="shell">
      {screen.name === 'home' && <Home streak={streakFrom(days)} onProgram={(k) => go('intro', { program: k, from: 'home' })} onZones={() => go('zones')} />}
      {screen.name === 'zones' && <Zones onBack={() => go('home')} onPick={(k) => go('intro', { program: k, from: 'zones' })} />}
      {screen.name === 'intro' && (
        <Intro
          programKey={screen.program}
          useCamera={useCamera}
          onCamera={toggleCamera}
          onBack={() => go(screen.from || 'home')}
          onStart={() => { unlockAudio(); go('session', { program: screen.program, from: screen.from }); }}
        />
      )}
      {screen.name === 'session' && (
        <Session
          programKey={screen.program}
          wantCamera={useCamera}
          sound={sound}
          onSound={toggleSound}
          music={music}
          onMusic={toggleMusic}
          onExit={() => go('intro', { program: screen.program, from: screen.from })}
          onDone={finish}
        />
      )}
      {screen.name === 'done' && result && <Done result={result} onHome={() => go('home')} />}
    </main>
  );
}

/* ---------- начало ---------- */

function Home({ streak, onProgram, onZones }) {
  const [now, setNow] = useState(null);
  useEffect(() => setNow(new Date()), []);
  const h = now ? now.getHours() : 9;
  const hello = h < 11 ? 'Добро утро' : h < 18 ? 'Добър ден' : 'Добър вечер';
  const date = now ? new Intl.DateTimeFormat('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' }).format(now) : '';
  const m = PROGRAMS.morning;
  const e = PROGRAMS.evening;

  return (
    <section className="screen home">
      <header className="home-head">
        <div className="stack-6">
          <div className="muted cap">{date}</div>
          <h1 className="display-28">{hello}</h1>
        </div>
        <button className="icon-btn" aria-label="Профил">{Icon.user}</button>
      </header>

      {streak > 0 && <div className="streak">{daysWord(streak)} поред</div>}

      <button className={`program-card peach ${h >= 18 ? '' : 'suggested'}`} onClick={() => onProgram('morning')}>
        <svg aria-hidden="true" className="card-art" width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r="34" fill="#F8CBB8" />
          <path d="M75 20v14M75 116v14M20 75h14M116 75h14M36 36l10 10M104 104l10 10M114 36l-10 10M46 104l-10 10" stroke="#F8CBB8" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <span className="card-top">
          <span className="card-eyebrow">Тренировка</span>
          <span className="card-title">{m.title}</span>
          <span className="card-text">{m.tagline}</span>
        </span>
        <span className="card-bottom">
          <span className="card-meta">{programMinutes(m)} мин · {countWord(m.list.length)}</span>
          <span className="card-play">{Icon.play}</span>
        </span>
      </button>

      <button className={`program-card sage ${h >= 18 ? 'suggested' : ''}`} onClick={() => onProgram('evening')}>
        <svg aria-hidden="true" className="card-art" width="150" height="150" viewBox="0 0 150 150">
          <path d="M95 30a46 46 0 1 0 30 70a38 38 0 0 1-30-70z" fill="#B6D6B9" />
          <circle cx="48" cy="40" r="4" fill="#B6D6B9" />
          <circle cx="30" cy="70" r="3" fill="#B6D6B9" />
        </svg>
        <span className="card-top">
          <span className="card-eyebrow">Тренировка</span>
          <span className="card-title">{e.title}</span>
          <span className="card-text">{e.tagline}</span>
        </span>
        <span className="card-bottom">
          <span className="card-meta">{programMinutes(e)} мин · {countWord(e.list.length)}</span>
          <span className="card-play">{Icon.play}</span>
        </span>
      </button>

      <button className="zone-row" onClick={onZones}>
        <span className="zone-row-icon"><Face zone="forehead" size={40} muted /></span>
        <span className="zone-row-text">
          <span className="zone-row-title">Избери зона</span>
          <span className="muted small">Чело, очи, назолабиални гънки, шия</span>
        </span>
        <span className="muted">{Icon.chevron}</span>
      </button>
    </section>
  );
}

/* ---------- зони ---------- */

function Zones({ onBack, onPick }) {
  return (
    <section className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Назад" onClick={onBack}>{Icon.back}</button>
      </div>
      <div className="stack-6">
        <h1 className="display-28">Избери зона</h1>
        <p className="lead">Кратка серия само за мястото, което искаш да раздвижиш.</p>
      </div>
      <div className="zone-grid">
        {ZONES.map((z) => {
          const p = PROGRAMS[z];
          return (
            <button key={z} className="zone-card" onClick={() => onPick(z)}>
              <span className="zone-art"><Face zone={z} size={76} /></span>
              <span className="zone-name">{p.title}</span>
              <span className="muted small">{countWord(p.list.length)} · {programMinutes(p)} мин</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- преди тренировката ---------- */


// Подсказка как да се добави български глас, според телефона.
function VoiceHelp() {
  const [os, setOs] = useState('other');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || '';
    setOs(/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'ios' : /Android/i.test(ua) ? 'android' : 'other');
  }, []);
  const ios = 'Settings → Accessibility → Spoken Content → Voices → Bulgarian';
  const android = 'Settings → Text-to-speech → Google → Install voice data → Bulgarian';
  return (
    <div className="voice-help">
      <button className="voice-help-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="voice-help-icon">{Icon.soundOff}</span>
        <span className="voice-help-text">
          <span className="strong">Треньорът няма глас</span>
          <span className="muted small">На телефона няма български глас. Виж как да го добавиш.</span>
        </span>
        <span className="muted" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>{Icon.chevron}</span>
      </button>
      {open && (
        <div className="voice-help-body">
          {os !== 'android' && <div><div className="small strong">iPhone</div><div className="path">{ios}</div></div>}
          {os !== 'ios' && <div><div className="small strong">Android</div><div className="path">{android}</div></div>}
          <div className="muted small">После презареди приложението.</div>
        </div>
      )}
    </div>
  );
}

function Intro({ programKey, useCamera, onCamera, onBack, onStart }) {
  const voice = useBgVoice();
  const p = PROGRAMS[programKey];
  const first = EXERCISES[p.list[0]];
  const zone = p.zone || first.zone;

  return (
    <section className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Назад" onClick={onBack}>{Icon.back}</button>
        <div className="muted small">{programMinutes(p)} мин · {countWord(p.list.length)}</div>
        <div style={{ width: 44 }} />
      </div>

      <div className="illus">
        <IntroFace zone={zone} metric={first.metric} />
        <div className="chip peach-chip">{p.zone ? p.title : first.muscle}</div>
        <div className="chip dark-chip">анимация</div>
      </div>

      <div className="stack-6">
        <h1 className="display-24">{p.zone ? `Зона: ${p.title}` : `${p.title}: тренировка`}</h1>
        <p className="lead">{p.tagline || first.about}</p>
      </div>

      <ol className="ex-list">
        {p.list.map((k) => {
          const ex = EXERCISES[k];
          return (
            <li key={k}>
              <span>{ex.title}</span>
              <span className="muted small">{ex.reps > 1 ? `${ex.reps} × ${ex.hold} сек` : `${ex.hold} сек`}{ex.metric ? '' : ' · таймер'}</span>
            </li>
          );
        })}
      </ol>

      {voice === 'none' && <VoiceHelp />}

      <div className="bottom-actions">
        <div className="seg" role="radiogroup" aria-label="Режим">
          <button role="radio" aria-checked={useCamera} className={useCamera ? 'on' : ''} onClick={() => onCamera(true)}>С камера</button>
          <button role="radio" aria-checked={!useCamera} className={!useCamera ? 'on' : ''} onClick={() => onCamera(false)}>Без камера</button>
        </div>
        <button className="cta" onClick={onStart}>{useCamera ? Icon.cam : Icon.play} Започни</button>
        <div className="fine">Камерата се обработва само на телефона ти. Нищо не се записва.</div>
      </div>
    </section>
  );
}

// Анимира движението на първото упражнение в илюстрацията.
function IntroFace({ zone, metric }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!metric) return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const s = ((t - t0) / 1000) % 3;
      setP(s < 0.8 ? s / 0.8 : s < 2 ? 1 : s < 2.6 ? 1 - (s - 2) / 0.6 : 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [metric]);
  return <Face zone={zone} metric={metric} p={p} size={210} label="Илюстрация на лице с подсветена зона и движението на упражнението" />;
}

/* ---------- сесия ---------- */

const ZONE_POINTS = {
  brows: [70, 63, 105, 66, 107, 336, 296, 334, 293, 300, 159, 386],
  eyesOpen: [33, 160, 159, 158, 133, 153, 145, 144, 263, 387, 386, 385, 362, 380, 374, 373],
  eyesClose: [33, 160, 159, 158, 133, 153, 145, 144, 263, 387, 386, 385, 362, 380, 374, 373],
  smile: [61, 291, 0, 17, 39, 269, 181, 405, 205, 425],
  mouthO: [61, 291, 13, 14, 0, 17, 39, 269, 181, 405],
  jawOpen: [13, 14, 152, 172, 397, 58, 288],
  chinUp: [1, 152, 10, 33, 263, 172, 397],
  tilt: [33, 263, 1, 152, 10, 234, 454],
  calm: [70, 63, 105, 66, 107, 336, 296, 334, 293, 300, 9, 151],
  fish: [61, 291, 0, 17, 205, 425, 50, 280],
  tuck: [234, 454, 10, 152, 1],
  cheekLift: [205, 425, 117, 346, 145, 374, 13, 14],
};

const RELAX_SEC = 3;

// Упражнение с поредица (напр. гласни): всяко повторение има своя метрика и реплика.
const metricOf = (ex, rep) => (ex.seq ? ex.seq[rep % ex.seq.length].metric : ex.metric);
const cuesOf = (ex, rep) => (ex.seq ? { ...ex.cues, reach: ex.seq[rep % ex.seq.length].reach } : ex.cues);
const ALL_METRICS = Object.keys(METRICS);

function Session({ programKey, wantCamera, sound, onSound, music, onMusic, onExit, onDone }) {
  const program = PROGRAMS[programKey];
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const landmarks = useRef(null);
  const voice = useBgVoice();
  const noVoice = voice === 'none';
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const [camState, setCamState] = useState(wantCamera ? 'starting' : 'off'); // starting | on | off | failed
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const S = useRef({
    idx: 0, phase: 'next', t: 0, rep: 0, holdLeft: 0, p: 0, base: null, samples: {},
    noFace: false, done: 0, started: Date.now(), cue: '', reachedAt: 1,
  });
  const [, force] = useState(0);

  // камера
  useEffect(() => {
    if (!wantCamera) return;
    let stop = null;
    let cancelled = false;
    startTracking(videoRef.current, (L) => { landmarks.current = L; })
      .then((s) => { if (cancelled) s(); else { stop = s; setCamState('on'); } })
      .catch(() => { if (!cancelled) setCamState('failed'); });
    return () => { cancelled = true; if (stop) stop(); };
  }, [wantCamera]);

  // екранът да не загасва
  useEffect(() => {
    let lock;
    navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release?.().catch(() => {}); window.speechSynthesis?.cancel(); stopMusic(); };
  }, []);

  // фонова музика
  useEffect(() => {
    if (music && !paused) startMusic(); else stopMusic();
  }, [music, paused]);

  // основен цикъл
  useEffect(() => {
    let raf;
    let last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (pausedRef.current) return;
      step(dt);
      draw();
      force((n) => (n + 1) % 1e6);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camState]);

  const tracking = () => camState === 'on';

  function setPhase(phase, cue) {
    const s = S.current;
    s.phase = phase;
    s.t = 0;
    if (cue) { s.cue = cue; speak(cue, soundRef.current); }
  }

  function nextExercise() {
    const s = S.current;
    s.done += 1;
    if (s.idx + 1 >= program.list.length) {
      speak('Готово! Браво.', soundRef.current);
      onDone({ exercises: s.done, minutes: Math.max(1, Math.round((Date.now() - s.started) / 60000)), title: program.title });
      return;
    }
    s.idx += 1;
    s.rep = 0;
    s.base = null;
    setPhase('next', `Следва: ${EXERCISES[program.list[s.idx]].title}`);
  }

  function step(dt) {
    const s = S.current;
    const ex = EXERCISES[program.list[s.idx]];
    const metric = metricOf(ex, s.rep);
    const cues = cuesOf(ex, s.rep);
    const live = tracking() && metric;
    s.t += dt;

    // стойност от камерата
    let value = null;
    let L = null;
    if (live) {
      L = landmarks.current;
      s.noFace = !L;
      if (L) value = METRICS[metric].fn(L);
    } else s.noFace = false;

    if (s.phase === 'next') {
      if (s.t === dt && s.idx === 0) speak(`Започваме. ${ex.title}`, soundRef.current);
      if (s.t >= 4) {
        if (live) setPhase('calib', 'Отпусни лицето и гледай в камерата');
        else setPhase('reach', cues.reach);
      }
      return;
    }

    if (live && s.noFace) { s.cue = 'Не те виждам. Погледни в камерата.'; return; }
    if (live && s.base == null && s.phase !== 'calib') { setPhase('calib', 'Отпусни лицето и гледай в камерата'); return; }

    if (s.phase === 'calib') {
      if (L) for (const m of ALL_METRICS) (s.samples[m] ||= []).push(METRICS[m].fn(L));
      const n = s.samples[metric]?.length || 0;
      if (s.t >= 1.5 && n > 5) {
        s.base = {};
        for (const m of ALL_METRICS) {
          const sorted = [...s.samples[m]].sort((a, b) => a - b);
          s.base[m] = sorted[Math.floor(sorted.length / 2)];
        }
        s.samples = {};
        setPhase('reach', cues.reach);
      }
      return;
    }

    // прогрес: истински от камерата или симулиран (демо / таймер)
    if (live) {
      const target = progressFor(metric, value, s.base[metric]);
      s.p += (target - s.p) * Math.min(1, dt * 10);
    } else if (s.phase === 'reach') s.p = Math.min(1, s.p + dt / 1.1);
    else if (s.phase === 'hold') s.p = 0.92 + 0.05 * Math.sin(s.t * 3);
    else if (s.phase === 'relax') s.p = Math.max(0, s.p - dt / 0.9);

    if (s.phase === 'reach') {
      // Ако движението е по-малко от очакваното, прагът пада постепенно,
      // а след 10 сек задържането започва така или иначе.
      const need = !live ? 0.85 : s.t < 6 ? 0.85 : s.t < 10 ? 0.55 : 0;
      if (s.p >= need) {
        s.holdLeft = ex.hold;
        s.reachedAt = Math.max(0.3, Math.min(1, s.p));
        setPhase('hold', cues.hold);
      } else if (live && s.t > 6 && s.t - dt <= 6) { s.cue = 'Още малко, почти си там'; speak(s.cue, soundRef.current); }
    } else if (s.phase === 'hold') {
      if (!live || s.p >= s.reachedAt * 0.6 || s.t > ex.hold * 2.5) {
        s.holdLeft -= dt;
        if (s.cue !== cues.hold) s.cue = cues.hold;
      } else s.cue = cues.back || 'Върни позицията и задръж';
      if (s.holdLeft <= 0) {
        const lastRep = s.rep + 1 >= ex.reps;
        const nextEx = program.list[s.idx + 1];
        const after = !lastRep
          ? (ex.seq ? `Следва: ${ex.seq[(s.rep + 1) % ex.seq.length].label}.` : `Следва повторение ${s.rep + 2} от ${ex.reps}.`)
          : nextEx ? `Следва: ${EXERCISES[nextEx].title}.` : 'Това беше последното.';
        setPhase('relax', `${cues.relax}. ${after}`);
      }
    } else if (s.phase === 'relax') {
      if (s.t >= RELAX_SEC) {
        s.rep += 1;
        if (s.rep >= ex.reps) nextExercise();
        else setPhase('reach', cuesOf(ex, s.rep).reach);
      }
    }
  }

  // точки от лицето върху огледалото
  function draw() {
    const c = canvasRef.current;
    const v = videoRef.current;
    const box = stageRef.current;
    if (!c || !v || !box || !tracking()) return;
    const w = box.clientWidth;
    const h = box.clientHeight;
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const L = landmarks.current;
    const ex = EXERCISES[program.list[S.current.idx]];
    const metric = metricOf(ex, S.current.rep);
    if (!L || !metric || !v.videoWidth) return;
    const sc = Math.max(w / v.videoWidth, h / v.videoHeight);
    const ox = (v.videoWidth * sc - w) / 2;
    const oy = (v.videoHeight * sc - h) / 2;
    const good = S.current.p >= 0.85;
    ctx.fillStyle = good ? '#9CC5A1' : '#F2B49B';
    for (const i of ZONE_POINTS[metric] || []) {
      const x = w - (L[i].x * v.videoWidth * sc - ox);
      const y = L[i].y * v.videoHeight * sc - oy;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const s = S.current;
  const ex = EXERCISES[program.list[s.idx]];
  const curMetric = metricOf(ex, s.rep);
  const live = tracking() && curMetric;
  const pct = Math.round(Math.min(1, s.p) * 100);
  const holdFrac = s.phase === 'hold' ? Math.max(0, s.holdLeft) / ex.hold : s.phase === 'relax' ? Math.max(0, 1 - s.t / RELAX_SEC) : 1;
  const exFrac = (s.rep + (s.phase === 'relax' ? 1 : 0)) / ex.reps;

  const skip = () => { window.speechSynthesis?.cancel(); nextExercise(); };

  return (
    <section className="screen session">
      <div className="stage" ref={stageRef}>
        {wantCamera && <video ref={videoRef} className={`mirror ${camState === 'on' ? '' : 'hidden-video'}`} playsInline muted />}
        {camState === 'on' && <canvas ref={canvasRef} className="overlay" aria-hidden="true" />}
        {!(camState === 'on') && (
          <div className="demo-face">
            <Face zone={ex.zone} metric={curMetric} p={s.phase === 'next' ? 0 : Math.min(1, s.p)} muted guides size={300}
              label="Илюстрирано огледало с насоки върху лицето" />
          </div>
        )}
        {live && s.phase !== 'next' && !s.noFace && s.phase !== 'calib' && (
          <div className={`status-chip ${s.p >= 0.85 ? 'ok' : ''}`}>{s.p >= 0.85 && Icon.check}{s.p >= 0.85 ? 'Точно така' : 'Следя движението'}</div>
        )}
        {camState === 'starting' && <div className="status-chip">Пускам камерата…</div>}
        {camState === 'failed' && <div className="status-chip warn">Камерата не е достъпна. Продължаваме без нея.</div>}
      </div>

      <div className="session-top">
        <div className="topbar">
          <button className="icon-btn glass" aria-label="Затвори" onClick={onExit}>{Icon.close}</button>
          <div className="session-title">
            <div className="display-15">{ex.title}</div>
            <div className="muted small">{program.title} · упражнение {s.idx + 1} от {program.list.length}</div>
          </div>
          <div className="top-actions">
            <button className={`icon-btn glass ${music ? '' : 'off'}`} aria-label={music ? 'Изключи музиката' : 'Включи музиката'} aria-pressed={music} onClick={onMusic}>{Icon.music}</button>
            <button className="icon-btn glass" aria-label={sound && !noVoice ? 'Изключи гласа' : 'Включи гласа'} onClick={onSound} disabled={noVoice}>{sound && !noVoice ? Icon.soundOn : Icon.soundOff}</button>
          </div>
        </div>
        <div className="segments" style={{ gridTemplateColumns: `repeat(${program.list.length}, minmax(0,1fr))` }}>
          {program.list.map((k, i) => (
            <div key={k + i} className="seg-bar">
              <div style={{ width: `${i < s.idx ? 100 : i === s.idx ? exFrac * 100 : 0}%` }} />
            </div>
          ))}
        </div>
      </div>

      {s.phase === 'next' ? (
        <div className="next-card">
          <div className="muted small">{s.idx === 0 ? 'Започваме' : 'Следва'} след {Math.max(1, Math.ceil(4 - s.t))}</div>
          <div className="display-24">{ex.title}</div>
          <ol className="steps">{ex.steps.map((t) => <li key={t}>{t}</li>)}</ol>
          <div className="chips">
            <span className="chip-soft">{ex.reps > 1 ? `${ex.reps} повторения` : '1 път'}</span>
            <span className="chip-soft">задръж {ex.hold} сек</span>
            {!ex.metric && <span className="chip-soft">на таймер</span>}
          </div>
        </div>
      ) : (
        <div className="hud">
          <div className="rep">
            <div className="muted small">Повторение</div>
            <div className="display-22">{Math.min(ex.reps, s.rep + 1)} <span className="muted small">/ {ex.reps}</span></div>
          </div>
          <div className="ring">
            <svg aria-hidden="true" width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r="38" fill="rgba(23,20,28,0.8)" stroke="rgba(246,241,238,0.18)" strokeWidth="6" />
              <circle cx="44" cy="44" r="38" fill="none" stroke={s.phase === 'relax' ? '#F2B49B' : '#9CC5A1'} strokeWidth="6" strokeLinecap="round"
                strokeDasharray="239" strokeDashoffset={239 * (1 - holdFrac)} transform="rotate(-90 44 44)" />
            </svg>
            <div className="ring-text">
              <div className="display-24">{s.phase === 'hold' ? Math.max(1, Math.ceil(s.holdLeft)) : s.phase === 'relax' ? Math.max(1, Math.ceil(RELAX_SEC - s.t)) : ex.hold}</div>
              <div className="muted tiny">{s.phase === 'hold' ? 'задръж' : s.phase === 'relax' ? 'отпусни' : 'сек'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="sheet">
        <div className="coach">
          <div className="coach-avatar">{Icon.voice}</div>
          <div className="stack-4">
            <div className="coach-label">Треньорът казва{noVoice && sound ? ' · без глас: на телефона няма български глас' : ''}</div>
            <div className="coach-text" aria-live="polite">{s.phase === 'next' ? ex.about : s.cue}</div>
          </div>
        </div>
        <div className="metrics">
          <div className="metric">
            <div className="metric-row"><span className="muted">{live ? 'Движение' : 'Темпо'}</span><span className="strong">{s.phase === 'next' ? '—' : `${pct}%`}</span></div>
            <div className="bar"><div style={{ width: `${pct}%` }} /></div>
          </div>
          <div className="metric">
            <div className="metric-row"><span className="muted">Режим</span><span className="strong" style={{ color: live ? '#9CC5A1' : undefined }}>{live ? 'камера' : camState === 'on' ? 'таймер' : 'демо'}</span></div>
            <div className="bar"><div style={{ width: live ? '100%' : '40%', background: live ? '#9CC5A1' : undefined }} /></div>
          </div>
        </div>
        <div className="controls">
          <button className="btn-light" onClick={() => setPaused((x) => !x)}>{paused ? Icon.play : Icon.pause} {paused ? 'Продължи' : 'Пауза'}</button>
          <button className="btn-ghost" onClick={skip}>Пропусни</button>
        </div>
      </div>
    </section>
  );
}

/* ---------- край ---------- */

function Done({ result, onHome }) {
  return (
    <section className="screen done">
      <div className="done-art"><Face zone={null} metric="smile" p={1} size={170} /></div>
      <div className="stack-6 center">
        <h1 className="display-28">Готово!</h1>
        <p className="lead">{result.title}: {countWord(result.exercises)} за {result.minutes} мин.</p>
      </div>
      <div className="done-stats">
        <div><div className="display-22">{daysWord(result.streak)}</div><div className="muted small">поред</div></div>
        <div><div className="display-22">{result.exercises}</div><div className="muted small">упражнения</div></div>
      </div>
      <div className="bottom-actions">
        <button className="cta" onClick={onHome}>Към началото</button>
      </div>
    </section>
  );
}
