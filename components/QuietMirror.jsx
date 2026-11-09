'use client';

// Тихо огледало: докато работиш на компютъра, следи навиците, от които идват бръчките –
// мръщене, вдигнати вежди, навеждане към екрана – и тихо подсказва. Всичко остава на устройството.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { startTracking } from './tracker';
import { unlockAudio, chime } from './music';
import { say, silence } from './voice';

const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Сигнали спрямо спокойното лице (калибрира се в началото).
const SIGNALS = {
  frown: {
    label: 'Мръщене',
    hint: 'Отпусни веждите',
    voice: 'Отпусни веждите.',
    fn: (L) => d(L[107], L[336]) / d(L[234], L[454]),
    hit: (v, b, k) => v < b * (1 - 0.07 * k),
    hold: 2,
  },
  raise: {
    label: 'Вдигнати вежди',
    hint: 'Пусни веждите, челото е меко',
    voice: 'Отпусни веждите.',
    fn: (L) => ((d(L[105], L[159]) + d(L[334], L[386])) / 2) / d(L[10], L[152]),
    hit: (v, b, k) => v > b * (1 + 0.12 * k),
    hold: 2,
  },
  lean: {
    label: 'Навеждане към екрана',
    hint: 'Изправи главата, раменете назад',
    voice: 'Изправи главата.',
    fn: (L) => d(L[234], L[454]),
    hit: (v, b, k) => v > b * (1 + 0.15 * k),
    hold: 5,
  },
};
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
  const S = useRef({ base: null, samples: {}, startedAt: Date.now(), calibT: 0, over: {}, last: {}, counts: { frown: 0, raise: 0, lean: 0 }, events: [], noFace: 0 });
  const pausedRef = useRef(false); pausedRef.current = paused;
  const optsRef = useRef(opts); optsRef.current = opts;
  const lastT = useRef(performance.now());

  useEffect(() => {
    let stop = null; let cancelled = false;
    startTracking(videoRef.current, (L) => onFace(L))
      .then((s) => { if (cancelled) s(); else { stop = s; setCam('on'); } })
      .catch(() => { if (!cancelled) setCam('failed'); });
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    const iv = setInterval(() => force((n) => n + 1), 1000);
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

  function onFace(L) {
    const now = performance.now(); const dt = Math.min(1, (now - lastT.current) / 1000); lastT.current = now;
    const s = S.current;
    if (pausedRef.current) return;
    if (!L) { s.noFace += dt; return; }
    s.noFace = 0;
    if (!s.base) {
      s.calibT += dt;
      for (const k of KEYS) (s.samples[k] ||= []).push(SIGNALS[k].fn(L));
      if (s.calibT > 3 && s.samples.frown.length > 10) {
        s.base = {};
        for (const k of KEYS) { const a = [...s.samples[k]].sort((x, y) => x - y); s.base[k] = a[Math.floor(a.length / 2)]; }
      }
      return;
    }
    const t = Date.now() / 1000;
    for (const k of KEYS) {
      if (!optsRef.current[k]) continue;
      const sig = SIGNALS[k]; const v = sig.fn(L);
      if (sig.hit(v, s.base[k], optsRef.current.sens)) {
        s.over[k] = (s.over[k] || 0) + dt;
        if (s.over[k] >= sig.hold && t - (s.last[k] || 0) > COOLDOWN) { s.last[k] = t; s.over[k] = 0; alert(k); }
      } else {
        s.over[k] = Math.max(0, (s.over[k] || 0) - dt * 2);
        // бавно следваме спокойното лице (стойка, светлина)
        s.base[k] = s.base[k] * 0.999 + v * 0.001;
      }
    }
  }

  const s = S.current;
  const minutes = Math.floor((Date.now() - s.startedAt) / 60000);
  const total = s.counts.frown + s.counts.raise + s.counts.lean;
  const recent = toast && Date.now() - toast.at < 6000;
  const status = cam !== 'on' ? null : !s.base ? 'calib' : s.noFace > 3 ? 'away' : recent ? 'alert' : 'calm';

  const pip = async () => {
    try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await videoRef.current.requestPictureInPicture(); } catch {}
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
        <video ref={videoRef} className="mirror mirror-preview" playsInline muted />
        <div className="mirror-badge">
          {paused ? 'На пауза' : status === 'calib' ? 'Гледай екрана спокойно…' : status === 'away' ? 'Не те виждам' : status === 'alert' ? SIGNALS[toast.k].hint : cam === 'failed' ? 'Камерата не е достъпна' : cam === 'starting' ? 'Пускам камерата…' : 'Спокойно'}
        </div>
      </div>

      <div className="mirror-counts">
        {KEYS.map((k) => (
          <div key={k} className={`metric ${opts[k] ? '' : 'off'}`}>
            <div className="muted small">{SIGNALS[k].label}</div>
            <div className="display-22">{s.counts[k]}</div>
          </div>
        ))}
      </div>

      <p className="fine" style={{ textAlign: 'left' }}>Може да минеш в друг раздел или прозорец – огледалото продължава да следи. С „Малък прозорец“ виждаш себе си в ъгъла на екрана.</p>

      <div className="bottom-actions">
        <button className="btn-ghost" style={{ width: '100%' }} onClick={pip}>Малък прозорец</button>
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
