'use client';

// Тихо огледало: докато работиш на компютъра, следи навиците, от които идват бръчките –
// мръщене, вдигнати вежди, навеждане към екрана – и тихо подсказва. Всичко остава на устройството.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { startTracking } from './tracker';
import { unlockAudio, chime } from './music';
import { say, silence } from './voice';

const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Признаци от лицето: геометрия + мимики от модела (работят и при камера отгоре).
function features(L, bs) {
  const h = d(L[10], L[152]);
  const avg = (a, b) => (bs && bs[a] != null && bs[b] != null ? (bs[a] + bs[b]) / 2 : null);
  return {
    gap: d(L[107], L[336]) / d(L[234], L[454]),                       // разстояние между веждите
    low: ((d(L[55], L[133]) + d(L[285], L[362])) / 2) / h,            // вътрешните краища на веждите към очите
    raise: ((d(L[105], L[159]) + d(L[334], L[386])) / 2) / h,         // вежди спрямо клепачите
    faceW: d(L[234], L[454]),                                         // колко голямо е лицето в кадъра
    down: avg('browDownLeft', 'browDownRight'),                       // модел: свити вежди
    up: bs && bs.browInnerUp != null ? bs.browInnerUp : null,          // модел: вдигнати вежди
  };
}

// Всеки сигнал връща „ниво“: 1 = прагът е достигнат. k = чувствителност (по-малко = по-чувствително).
const SIGNALS = {
  frown: {
    label: 'Мръщене',
    hint: 'Отпусни веждите',
    voice: 'Отпусни веждите.',
    level: (f, b, k) => Math.max(
      (1 - f.gap / b.gap) / (0.04 * k),
      (1 - f.low / b.low) / (0.08 * k),
      f.down != null && b.down != null ? (f.down - b.down) / (0.18 * k) : 0,
    ),
    hold: 1.5,
  },
  raise: {
    label: 'Вдигнати вежди',
    hint: 'Пусни веждите, челото е меко',
    voice: 'Отпусни веждите.',
    level: (f, b, k) => Math.max(
      (f.raise / b.raise - 1) / (0.12 * k),
      f.up != null && b.up != null ? (f.up - b.up) / (0.3 * k) : 0,
    ),
    hold: 2,
  },
  lean: {
    label: 'Навеждане към екрана',
    hint: 'Изправи главата, раменете назад',
    voice: 'Изправи главата.',
    level: (f, b, k) => (f.faceW / b.faceW - 1) / (0.15 * k),
    hold: 5,
  },
};
const FEATS = ['gap', 'low', 'raise', 'faceW', 'down', 'up'];
const KEYS = Object.keys(SIGNALS);
const COOLDOWN = 60;

const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

export default function QuietMirror({ onBack }) {
  const [stage, setStage] = useState('setup'); // setup | run | summary
  const [opts, setOpts] = useState({ frown: true, raise: true, lean: true, voice: false, sens: 1 });
  const [summary, setSummary] = useState(null);

  useEffect(() => { setOpts((o) => ({ ...o, ...store.get('fy-mirror-opts', {}) })); }, []);
  const setOpt = (k, v) => setOpts((o) => { const n = { ...o, [k]: v }; store.set('fy-mirror-opts', n); return n; });

  if (stage === 'run') return <MirrorRun opts={opts} onStop={(sum) => { setSummary(sum); setStage('summary'); }} />;
  if (stage === 'summary' && summary) return <MirrorSummary s={summary} onAgain={() => setStage('setup')} onBack={onBack} />;

  return (
    <section className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Назад" onClick={onBack}>{Icon.back}</button>
      </div>
      <div className="stack-6">
        <div className="card-eyebrow" style={{ color: 'var(--sage)', opacity: 1 }}>За работа на компютър</div>
        <h1 className="display-28">Тихо огледало</h1>
        <p className="lead">Остави го отворено, докато работиш. Когато неусетно смръщиш чело или се наведеш към екрана, ще получиш тиха подсказка.</p>
      </div>

      <div className="mirror-options">
        {KEYS.map((k) => (
          <label key={k} className="toggle-row">
            <span className="stack-4"><span className="strong">{SIGNALS[k].label}</span><span className="muted small">{SIGNALS[k].hint}</span></span>
            <input id={`mirror-${k}`} type="checkbox" checked={opts[k]} onChange={(e) => setOpt(k, e.target.checked)} />
          </label>
        ))}
        <label className="toggle-row">
          <span className="stack-4"><span className="strong">Подсказка с глас</span><span className="muted small">Иначе само тих звън</span></span>
          <input id="mirror-voice" type="checkbox" checked={opts.voice} onChange={(e) => setOpt('voice', e.target.checked)} />
        </label>
        <div className="toggle-row">
          <span className="strong">Чувствителност</span>
          <div className="seg small-seg" role="radiogroup" aria-label="Чувствителност">
            {[[1.4, 'ниска'], [1, 'средна'], [0.7, 'висока']].map(([v, l]) => (
              <button key={l} role="radio" aria-checked={opts.sens === v} className={opts.sens === v ? 'on' : ''} onClick={() => setOpt('sens', v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bottom-actions">
        <button className="cta sage-cta" onClick={() => { unlockAudio(); setStage('run'); }}>{Icon.cam} Включи</button>
        <div className="fine">Камерата се обработва само на устройството. Нищо не се записва и не се изпраща.</div>
      </div>
    </section>
  );
}

function MirrorRun({ opts, onStop }) {
  const videoRef = useRef(null);
  const [cam, setCam] = useState('starting');
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState(null);
  const [, force] = useState(0);
  const S = useRef({ base: null, samples: {}, startedAt: Date.now(), calibT: 0, over: {}, last: {}, counts: { frown: 0, raise: 0, lean: 0 }, levels: { frown: 0, raise: 0, lean: 0 }, events: [], noFace: 0 });
  const pausedRef = useRef(false); pausedRef.current = paused;
  const optsRef = useRef(opts); optsRef.current = opts;
  const lastT = useRef(performance.now());
  // Малкият прозорец: собствено платно – огледален образ, цветна рамка и надпис на български.
  const pipCanvas = useRef(null);
  const pipVideo = useRef(null);
  const statusRef = useRef({ color: '#9CC5A1', text: 'Спокойно' });
  const [inPip, setInPip] = useState(false);

  useEffect(() => {
    const draw = () => {
      const c = pipCanvas.current; const v = videoRef.current;
      if (!c || !v || !v.videoWidth) return;
      const ctx = c.getContext('2d'); const W = c.width; const H = c.height;
      const sc = Math.max(W / v.videoWidth, H / v.videoHeight);
      const dw = v.videoWidth * sc; const dh = v.videoHeight * sc;
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
      ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();
      const { color, text } = statusRef.current;
      ctx.lineWidth = 10; ctx.strokeStyle = color; ctx.strokeRect(5, 5, W - 10, H - 10);
      ctx.font = '600 22px "Golos Text", system-ui, sans-serif';
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(23,20,28,0.8)';
      ctx.beginPath(); ctx.roundRect((W - tw) / 2 - 16, H - 52, tw + 32, 36, 18); ctx.fill();
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, W / 2, H - 34);
    };
    const iv = setInterval(draw, 150);
    const pv = pipVideo.current;
    const on = () => setInPip(true); const off = () => setInPip(false);
    pv?.addEventListener('enterpictureinpicture', on);
    pv?.addEventListener('leavepictureinpicture', off);
    return () => {
      clearInterval(iv);
      pv?.removeEventListener('enterpictureinpicture', on);
      pv?.removeEventListener('leavepictureinpicture', off);
      if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    };
  }, []);

  useEffect(() => {
    let stop = null; let cancelled = false;
    startTracking(videoRef.current, (L, _h, bs) => onFace(L, bs))
      .then((s) => { if (cancelled) s(); else { stop = s; setCam('on'); } })
      .catch(() => { if (!cancelled) setCam('failed'); });
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    const iv = setInterval(() => force((n) => n + 1), 200);
    return () => { cancelled = true; if (stop) stop(); clearInterval(iv); silence(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alert(k) {
    const s = S.current; const sig = SIGNALS[k];
    s.counts[k] += 1;
    s.events.push({ k, at: Date.now() });
    setToast({ k, at: Date.now() });
    if (optsRef.current.voice) say([sig.voice], true); else chime();
    if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('FACEtetica', { body: sig.hint, silent: true, tag: 'fy-mirror' }); } catch {}
    }
  }

  function onFace(L, bs) {
    const now = performance.now(); const dt = Math.min(1, (now - lastT.current) / 1000); lastT.current = now;
    const s = S.current;
    if (pausedRef.current) return;
    if (!L) { s.noFace += dt; return; }
    s.noFace = 0;
    const f = features(L, bs);
    if (!s.base) {
      s.calibT += dt;
      for (const k of FEATS) if (f[k] != null) (s.samples[k] ||= []).push(f[k]);
      if (s.calibT > 3 && (s.samples.gap || []).length > 10) {
        s.base = {};
        for (const k of FEATS) {
          const a = [...(s.samples[k] || [])].sort((x, y) => x - y);
          s.base[k] = a.length ? a[Math.floor(a.length / 2)] : null;
        }
      }
      return;
    }
    const t = Date.now() / 1000; const k = optsRef.current.sens;
    for (const key of KEYS) {
      const sig = SIGNALS[key];
      const lvl = sig.level(f, s.base, k);
      s.levels[key] = Math.max(0, Math.min(1.5, lvl));
      if (!optsRef.current[key]) continue;
      if (lvl >= 1) {
        s.over[key] = (s.over[key] || 0) + dt;
        if (s.over[key] >= sig.hold && t - (s.last[key] || 0) > COOLDOWN) { s.last[key] = t; s.over[key] = 0; alert(key); }
      } else s.over[key] = Math.max(0, (s.over[key] || 0) - dt * 2);
    }
    // бавно следваме спокойното лице (стойка, светлина) – само когато всичко е спокойно
    if (KEYS.every((key) => s.levels[key] < 0.4)) {
      for (const key of FEATS) if (f[key] != null && s.base[key] != null) s.base[key] = s.base[key] * 0.998 + f[key] * 0.002;
    }
  }

  const s = S.current;
  const minutes = Math.floor((Date.now() - s.startedAt) / 60000);
  const total = s.counts.frown + s.counts.raise + s.counts.lean;
  const recent = toast && Date.now() - toast.at < 6000;
  const status = cam !== 'on' ? null : !s.base ? 'calib' : s.noFace > 3 ? 'away' : recent ? 'alert' : 'calm';

  statusRef.current = {
    color: status === 'alert' ? '#F2B49B' : status === 'calm' ? '#9CC5A1' : '#BDB2BA',
    text: paused ? 'На пауза' : status === 'calib' ? 'Гледай спокойно…' : status === 'away' ? 'Не те виждам' : status === 'alert' ? SIGNALS[toast.k].hint : 'Спокойно',
  };

  const pip = async () => {
    const pv = pipVideo.current;
    try {
      if (document.pictureInPictureElement) { await document.exitPictureInPicture(); return; }
      if (pv && pipCanvas.current?.captureStream) {
        if (!pv.srcObject) pv.srcObject = pipCanvas.current.captureStream(10);
        await pv.play();
        await pv.requestPictureInPicture();
        return;
      }
    } catch {}
    // резерва: самата камера
    try { await videoRef.current.requestPictureInPicture(); } catch {}
  };

  const stop = () => onStop({ minutes: Math.max(1, Math.round((Date.now() - s.startedAt) / 60000)), counts: { ...s.counts }, events: s.events, startedAt: s.startedAt });

  return (
    <section className="screen mirror-run">
      <div className="topbar">
        <div className="stack-4">
          <div className="display-15" style={{ textAlign: 'left' }}>Тихо огледало</div>
          <div className="muted small">{minutes} мин · {total} подсказки</div>
        </div>
        <button className="icon-btn" aria-label={paused ? 'Продължи' : 'Пауза'} onClick={() => setPaused((p) => !p)}>{paused ? Icon.play : Icon.pause}</button>
      </div>

      <div className={`mirror-status ${status || ''} ${paused ? 'paused' : ''}`}>
        <video ref={videoRef} className="mirror mirror-preview" playsInline muted disablePictureInPicture />
        <canvas ref={pipCanvas} width="480" height="360" className="pip-source" aria-hidden="true" />
        <video ref={pipVideo} className="pip-source" playsInline muted aria-hidden="true" />
        <div className="mirror-badge">
          {paused ? 'На пауза' : status === 'calib' ? 'Гледай екрана спокойно…' : status === 'away' ? 'Не те виждам' : status === 'alert' ? SIGNALS[toast.k].hint : cam === 'failed' ? 'Камерата не е достъпна' : cam === 'starting' ? 'Пускам камерата…' : 'Спокойно'}
        </div>
      </div>

      <div className="mirror-counts">
        {KEYS.map((k) => (
          <div key={k} className={`metric ${opts[k] ? '' : 'off'}`}>
            <div className="muted small">{SIGNALS[k].label}</div>
            <div className="display-22">{s.counts[k]}</div>
            <div className="bar" title="Колко близо е до подсказка"><div style={{ width: `${Math.min(100, (s.levels[k] || 0) * 100)}%`, background: (s.levels[k] || 0) >= 1 ? 'var(--peach)' : 'var(--sage)' }} /></div>
          </div>
        ))}
      </div>

      <p className="fine" style={{ textAlign: 'left' }}>Лентите показват колко близо си до подсказка – смръщи се, за да видиш как реагира. Може да минеш в друг раздел или прозорец – огледалото продължава да следи. С „Малък прозорец“ виждаш себе си в ъгъла на екрана.</p>

      <div className="bottom-actions">
        <button className="btn-ghost" style={{ width: '100%' }} onClick={pip}>{inPip ? 'Затвори малкия прозорец' : 'Малък прозорец'}</button>
        <button className="cta sage-cta" onClick={stop}>Край и отчет</button>
      </div>
    </section>
  );
}

function MirrorSummary({ s, onAgain, onBack }) {
  const total = s.counts.frown + s.counts.raise + s.counts.lean;
  // най-дългият период без подсказка
  const times = [s.startedAt, ...s.events.map((e) => e.at), s.startedAt + s.minutes * 60000];
  let calm = 0;
  for (let i = 1; i < times.length; i++) calm = Math.max(calm, times[i] - times[i - 1]);
  const perHour = s.minutes >= 10 ? Math.round((total / s.minutes) * 60) : null;

  useEffect(() => {
    const h = store.get('fy-mirror-log', []);
    h.push({ day: new Date(s.startedAt).toISOString().slice(0, 10), minutes: s.minutes, ...s.counts });
    store.set('fy-mirror-log', h.slice(-200));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Назад" onClick={onBack}>{Icon.back}</button>
      </div>
      <div className="stack-6">
        <h1 className="display-28">Отчет</h1>
        <p className="lead">{s.minutes} мин пред екрана · {total === 0 ? 'нито една подсказка' : `${total} ${total === 1 ? 'подсказка' : 'подсказки'}`}</p>
      </div>
      <div className="mirror-counts">
        {KEYS.map((k) => (
          <div key={k} className="metric">
            <div className="muted small">{SIGNALS[k].label}</div>
            <div className="display-22">{s.counts[k]}</div>
          </div>
        ))}
      </div>
      <div className="summary-card">
        <div className="strong">Най-дълго спокойно: {Math.round(calm / 60000)} мин</div>
        {perHour != null && <div className="muted small">Средно {perHour} подсказки на час. Колкото по-малко, толкова по-рядко лицето ти се стяга неусетно.</div>}
        {total === 0 && <div className="muted small">Чудесно! Лицето ти беше спокойно през цялото време.</div>}
      </div>
      <div className="bottom-actions">
        <button className="cta sage-cta" onClick={onAgain}>Пусни отново</button>
      </div>
    </section>
  );
}
