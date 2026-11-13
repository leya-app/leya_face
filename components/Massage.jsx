'use client';

import { useEffect, useRef, useState } from 'react';
import Face from './Face';
import { Icon } from './icons';
import { MASSAGES, MASSAGE_ORDER, FULL_MASSAGE, minutesOf, quad, nearestOnPath, toXY } from './massage';
import { startTracking } from './tracker';
import { startMusic, stopMusic } from './music';
import { say, silence, preload } from './voice';

const PINK = '#E9C9DA';
const PEACH = '#F2B49B';
const SAGE = '#9CC5A1';

const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.ceil(sec % 60)) % 60).padStart(2, '0')}`;

/* ---------- илюстрация с пътеките ---------- */

function DemoPaths({ m, guide = null, progress = 0, dark = false }) {
  const ink = dark ? PEACH : '#17141C';
  return (
    <g>
      {m.demo.map((d, i) => {
        if (m.type === 'circle') {
          const [cx, cy] = d.c;
          const a = guide == null ? 0 : guide * Math.PI * 2;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={d.r + 6} fill={dark ? 'rgba(233,201,218,0.18)' : 'rgba(224,122,98,0.35)'} />
              <circle cx={cx} cy={cy} r={d.r} fill="none" stroke={ink} strokeWidth="2.5" strokeDasharray="4 5" />
              {guide != null && <circle cx={cx + d.r * Math.cos(a)} cy={cy + d.r * Math.sin(a)} r="5" fill={SAGE} />}
            </g>
          );
        }
        const [p0, p1, p2] = [toXY(d.p0), toXY(d.p1), toXY(d.p2)];
        const path = `M${p0.x} ${p0.y} Q${p1.x} ${p1.y} ${p2.x} ${p2.y}`;
        const pts = [];
        for (let k = 0; k <= 12; k++) { const q = quad(p0, p1, p2, (k / 12) * progress); pts.push(`${q.x},${q.y}`); }
        const g = guide != null ? quad(p0, p1, p2, guide) : null;
        return (
          <g key={i}>
            <path d={path} fill="none" stroke={dark ? 'rgba(233,201,218,0.25)' : 'rgba(224,122,98,0.45)'} strokeWidth="14" strokeLinecap="round" />
            <path d={path} fill="none" stroke={ink} strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
            {progress > 0 && <polyline points={pts.join(' ')} fill="none" stroke={SAGE} strokeWidth="4" strokeLinecap="round" />}
            <circle cx={p2.x} cy={p2.y} r="4" fill={ink} />
            {g && <circle cx={g.x} cy={g.y} r="6" fill={SAGE} />}
          </g>
        );
      })}
    </g>
  );
}

function MassageFace({ m, size = 210, muted = false, guide = null, progress = 0, label }) {
  return (
    <Face zone={null} metric={null} size={size} muted={muted} label={label}>
      <DemoPaths m={m} guide={guide} progress={progress} dark={muted} />
    </Face>
  );
}

// Анимирана подсказка: точката върви по пътеката с темпото на масажа.
function useGuide(tempo, on = true) {
  const [g, setG] = useState(0);
  useEffect(() => {
    if (!on) return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => { setG((((t - t0) / 1000) % tempo) / tempo); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tempo, on]);
  return g;
}

/* ---------- списък ---------- */

export function MassageList({ onBack, onPick }) {
  return (
    <section className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Назад" onClick={onBack}>{Icon.back}</button>
      </div>
      <div className="stack-6">
        <h1 className="display-28">Масажи</h1>
        <p className="lead">Лек самомасаж с върховете на пръстите. Камерата показва посоката и темпото.</p>
      </div>

      <button className="massage-full" onClick={() => onPick(FULL_MASSAGE)}>
        <span className="stack-4">
          <span className="card-eyebrow">Масаж</span>
          <span className="display-22">Цялото лице</span>
          <span className="small">{minutesOf(FULL_MASSAGE)} мин · {FULL_MASSAGE.length} зони подред</span>
        </span>
        <span className="card-play pink-play">{Icon.play}</span>
      </button>

      <div className="massage-rows">
        {MASSAGE_ORDER.map((k) => {
          const m = MASSAGES[k];
          return (
            <button key={k} className="massage-row" onClick={() => onPick([k])}>
              <span className="massage-thumb"><MassageFace m={m} size={42} /></span>
              <span className="massage-row-text">
                <span className="strong">{m.title}</span>
                <span className="muted small">{m.short}</span>
              </span>
              <span className="muted">{Icon.chevron}</span>
            </button>
          );
        })}
      </div>

      <div className="care-note">
        <span className="care-icon">{Icon.info}</span>
        <span>Сложи малко крем или масло, за да няма триене. Около очите натискът е съвсем лек. Не масажирай възпалена, наранена или скоро третирана кожа.</span>
      </div>
    </section>
  );
}

/* ---------- преди масажа ---------- */

export function MassageIntro({ keys, useCamera, onCamera, onBack, onStart }) {
  const full = keys.length > 1;
  const m = MASSAGES[keys[0]];
  const guide = useGuide(m.tempo);
  return (
    <section className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Назад" onClick={onBack}>{Icon.back}</button>
        <div className="muted small">{minutesOf(keys)} мин{full ? ` · ${keys.length} зони` : ''}</div>
        <div style={{ width: 44 }} />
      </div>

      <div className="illus">
        <MassageFace m={m} guide={guide} label={`Лице с пътеките на масажа: ${m.title}`} />
        <div className="chip pink-chip">{m.zone}</div>
        <div className="chip dark-chip">анимация</div>
      </div>

      <div className="stack-6">
        <h1 className="display-24">{full ? 'Цялото лице' : m.title}</h1>
        <p className="lead">{full ? 'Масаж от шията нагоре до слепоочията. Започва с шията, за да е готов пътят за лимфата.' : m.about}</p>
      </div>

      {full ? (
        <ol className="ex-list">
          {keys.map((k) => (
            <li key={k}><span>{MASSAGES[k].title}</span><span className="muted small">{MASSAGES[k].short}</span></li>
          ))}
        </ol>
      ) : (
        <>
          <div className="chips">
            <span className="chip-soft">{m.type === 'circle' ? `${m.count} кръга` : `${m.count} плъзгания`}</span>
            <span className="chip-soft">лек натиск</span>
          </div>
          <ol className="steps">{m.steps.map((t) => <li key={t}>{t}</li>)}</ol>
          {m.warn && <div className="warn">{Icon.info}<span>{m.warn}</span></div>}
        </>
      )}

      <div className="bottom-actions">
        <div className="seg" role="radiogroup" aria-label="Режим">
          <button role="radio" aria-checked={useCamera} className={useCamera ? 'on' : ''} onClick={() => onCamera(true)}>С камера</button>
          <button role="radio" aria-checked={!useCamera} className={!useCamera ? 'on' : ''} onClick={() => onCamera(false)}>Без камера</button>
        </div>
        <button className="cta pink-cta" onClick={onStart}>{useCamera ? Icon.cam : Icon.play} Започни</button>
        <div className="fine">Сложи малко крем или масло, за да няма триене.</div>
      </div>
    </section>
  );
}

/* ---------- самият масаж ---------- */

export function MassageSession({ keys, wantCamera, sound, onSound, music, onMusic, onExit, onDone }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const face = useRef(null);
  const hands = useRef([]);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const [camState, setCamState] = useState(wantCamera ? 'starting' : 'off');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const [, force] = useState(0);

  const S = useRef({
    idx: 0, phase: 'next', t: 0, count: 0, started: Date.now(), cue: '',
    sides: [{ armed: false, at: 0, prog: 0, acc: 0, ang: null }, { armed: false, at: 0, prog: 0, acc: 0, ang: null }],
    lastCount: 0, pace: null, dirOk: null, noHands: 0, guided: false, lastSlow: -10, done: 0,
  });

  useEffect(() => {
    if (!wantCamera) return;
    let stop = null; let cancelled = false;
    startTracking(videoRef.current, (f, h) => { face.current = f; hands.current = h || []; }, { hands: true })
      .then((s) => { if (cancelled) s(); else { stop = s; setCamState('on'); } })
      .catch(() => { if (!cancelled) setCamState('failed'); });
    return () => { cancelled = true; if (stop) stop(); };
  }, [wantCamera]);

  useEffect(() => {
    let lock;
    navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    const t = ['Започваме.', 'Следва:', 'Готово! Браво.', 'Добре.', 'По-бавно.', 'Не виждам пръстите.'];
    for (const k of keys) { const m = MASSAGES[k]; t.push(m.title, ...Object.values(m.cues)); }
    preload(t, 'kosta');
    say(['Започваме.', MASSAGES[keys[0]].title], soundRef.current, 'kosta');
    return () => { lock?.release?.().catch(() => {}); stopMusic(); silence(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (music && !paused) startMusic(); else stopMusic(); }, [music, paused]);

  useEffect(() => {
    let raf; let last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (pausedRef.current) return;
      step(dt, now / 1000);
      draw();
      force((n) => (n + 1) % 1e6);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camState]);

  const live = () => camState === 'on';

  function setPhase(phase, cue, voice) {
    const s = S.current;
    s.phase = phase; s.t = 0;
    if (cue != null) { s.cue = cue; if (voice) say(voice, soundRef.current, 'kosta'); }
  }

  function resetSides() {
    S.current.sides = [{ armed: false, at: 0, prog: 0, acc: 0, ang: null }, { armed: false, at: 0, prog: 0, acc: 0, ang: null }];
  }

  function counted(dur, now) {
    const s = S.current; const m = MASSAGES[keys[s.idx]];
    if (now - s.lastCount < 0.7) return;
    s.lastCount = now; s.count += 1; s.dirOk = true;
    if (dur != null) {
      s.pace = dur;
      if (dur < m.tempo * 0.45 && now - s.lastSlow > 6) { s.lastSlow = now; s.cue = 'По-бавно'; say(['По-бавно.'], soundRef.current, 'kosta'); }
      else if (s.cue === 'По-бавно') s.cue = m.cues.move;
    }
  }

  function nextMassage() {
    const s = S.current;
    s.done += 1;
    if (s.idx + 1 >= keys.length) {
      say(['Готово! Браво.'], soundRef.current, 'kosta');
      onDone({ exercises: s.done, minutes: Math.max(1, Math.round((Date.now() - s.started) / 60000)), title: keys.length > 1 ? 'Масаж на цялото лице' : MASSAGES[keys[0]].title, kind: 'massage' });
      return;
    }
    s.idx += 1; s.count = 0; s.pace = null; s.dirOk = null; s.noHands = 0; s.guided = false; resetSides();
    const nt = MASSAGES[keys[s.idx]].title;
    setPhase('next', `Следва: ${nt}`, ['Следва:', nt]);
  }

  function step(dt, now) {
    const s = S.current; const m = MASSAGES[keys[s.idx]];
    s.t += dt;
    if (s.phase === 'next') {
      if (s.t >= 4) setPhase('run', m.cues.start, [m.cues.start, m.cues.move]);
      return;
    }
    if (s.phase === 'gap') {
      if (s.t >= 2.5) nextMassage();
      return;
    }
    // run
    if (s.t > 3 && s.cue === m.cues.start) s.cue = m.cues.move;
    const L = face.current;
    if (live() && L && !s.guided) {
      const h = Math.hypot(L[10].x - L[152].x, L[10].y - L[152].y);
      const paths = m.live(L, h);
      const tips = hands.current.map((hl) => ({ x: (hl[8].x + hl[12].x) / 2, y: (hl[8].y + hl[12].y) / 2 }));
      if (!tips.length) {
        s.noHands += dt;
        if (s.noHands > 2) s.cue = 'Сложи пръстите в кадъра';
        if (s.noHands > 9) { s.guided = true; s.cue = 'Не виждам пръстите – броя по темпото'; say(['Не виждам пръстите.'], soundRef.current, 'kosta'); s.guidedFrom = s.t - s.count * m.tempo; }
      } else {
        if (s.noHands > 2 && s.cue === 'Сложи пръстите в кадъра') s.cue = m.cues.move;
        s.noHands = 0;
        for (const tip of tips) {
          // към коя страна е пръстът
          const ref = (pp) => (m.type === 'circle' ? pp.c : pp.p0);
          const side = Math.abs(tip.x - ref(paths[0]).x) <= Math.abs(tip.x - ref(paths[1]).x) ? 0 : 1;
          const P = paths[side]; const st = s.sides[side];
          if (m.type === 'stroke') {
            const n = nearestOnPath(P, tip);
            if (n.d < h * 0.14) {
              if (n.t < 0.3) { if (!st.armed) { st.armed = true; st.at = now; } }
              if (st.armed) st.prog = Math.max(st.prog, n.t);
              if (st.armed && n.t > 0.8) { counted(now - st.at, now); st.armed = false; st.prog = 0; }
            } else if (st.armed && n.d > h * 0.3) { st.armed = false; st.prog = 0; s.dirOk = false; }
          } else {
            const dx = tip.x - P.c.x; const dy = tip.y - P.c.y; const r = Math.hypot(dx, dy);
            if (r < P.r * 3.5) {
              const a = Math.atan2(dy, dx);
              if (st.ang != null) { let da = a - st.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; st.acc += da; }
              if (!st.armed) { st.armed = true; st.at = now; }
              st.ang = a;
              st.prog = Math.min(1, Math.abs(st.acc) / (2 * Math.PI));
              if (Math.abs(st.acc) >= 2 * Math.PI) { counted(now - st.at, now); st.acc = 0; st.at = now; st.prog = 0; }
            } else st.ang = null;
          }
        }
      }
    } else {
      // без камера / без пръсти: броим по темпото
      const base = s.guided ? s.guidedFrom || 0 : 0;
      if (s.t - base >= (s.count + 1) * m.tempo) counted(null, now);
    }
    if (s.count >= m.count) {
      const nextK = keys[s.idx + 1];
      setPhase('gap', nextK ? `${m.cues.done}. Следва: ${MASSAGES[nextK].title}` : m.cues.done, [m.cues.done]);
    }
  }

  function draw() {
    const c = canvasRef.current; const v = videoRef.current; const box = stageRef.current;
    if (!c || !v || !box || !live()) return;
    const w = box.clientWidth; const hh = box.clientHeight;
    if (c.width !== w) c.width = w;
    if (c.height !== hh) c.height = hh;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, hh);
    const L = face.current; const s = S.current; const m = MASSAGES[keys[s.idx]];
    if (!L || !v.videoWidth || s.phase === 'next') return;
    const sc = Math.max(w / v.videoWidth, hh / v.videoHeight);
    const ox = (v.videoWidth * sc - w) / 2; const oy = (v.videoHeight * sc - hh) / 2;
    const X = (p) => ({ x: w - (p.x * v.videoWidth * sc - ox), y: p.y * v.videoHeight * sc - oy });
    const h = Math.hypot(L[10].x - L[152].x, L[10].y - L[152].y);
    const paths = m.live(L, h);
    const guide = ((s.t % m.tempo) / m.tempo);
    paths.forEach((P, i) => {
      const st = s.sides[i];
      ctx.lineCap = 'round';
      if (m.type === 'circle') {
        const cc = X(P.c); const r = P.r * v.videoHeight * sc;
        ctx.setLineDash([4, 6]); ctx.strokeStyle = PEACH; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cc.x, cc.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        if (st.prog > 0) { ctx.strokeStyle = SAGE; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cc.x, cc.y, r, -Math.PI / 2, -Math.PI / 2 + st.prog * Math.PI * 2); ctx.stroke(); }
        const a = guide * Math.PI * 2; ctx.fillStyle = 'rgba(246,241,238,0.8)';
        ctx.beginPath(); ctx.arc(cc.x + r * Math.cos(a), cc.y + r * Math.sin(a), 4, 0, Math.PI * 2); ctx.fill();
      } else {
        const pt = (t) => X(quad(P.p0, P.p1, P.p2, t));
        ctx.setLineDash([4, 7]); ctx.strokeStyle = PEACH; ctx.lineWidth = 2.5;
        ctx.beginPath(); for (let k = 0; k <= 16; k++) { const q = pt(k / 16); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); } ctx.stroke(); ctx.setLineDash([]);
        const e = pt(1); ctx.fillStyle = PEACH; ctx.beginPath(); ctx.arc(e.x, e.y, 4, 0, Math.PI * 2); ctx.fill();
        if (st.prog > 0) { ctx.strokeStyle = SAGE; ctx.lineWidth = 5; ctx.beginPath(); for (let k = 0; k <= 16; k++) { const q = pt((k / 16) * st.prog); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); } ctx.stroke(); }
        const g = pt(guide); ctx.fillStyle = 'rgba(246,241,238,0.8)'; ctx.beginPath(); ctx.arc(g.x, g.y, 4, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.fillStyle = SAGE;
    for (const hl of hands.current) {
      const p = X({ x: (hl[8].x + hl[12].x) / 2, y: (hl[8].y + hl[12].y) / 2 });
      ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    }
  }

  const s = S.current; const m = MASSAGES[keys[s.idx]];
  const tracking = live() && !s.guided;
  const left = Math.max(0, (m.count - s.count) * m.tempo - (s.phase === 'run' && !tracking ? (s.t % m.tempo) : 0));
  const ringFrac = s.phase === 'run' ? s.count / m.count : s.phase === 'gap' ? 1 : 0;
  const demoGuide = s.phase === 'run' ? (s.t % m.tempo) / m.tempo : null;
  const paceLabel = s.pace == null ? '—' : s.pace < m.tempo * 0.45 ? 'по-бавно' : 'бавно';
  const paceOk = s.pace != null && s.pace >= m.tempo * 0.45;

  return (
    <section className="screen session">
      <div className="stage" ref={stageRef}>
        {wantCamera && <video ref={videoRef} className={`mirror ${camState === 'on' ? '' : 'hidden-video'}`} playsInline muted />}
        {camState === 'on' && <canvas ref={canvasRef} className="overlay" aria-hidden="true" />}
        {camState !== 'on' && (
          <div className="demo-face">
            <MassageFace m={m} size={300} muted guide={demoGuide} progress={s.phase === 'run' ? demoGuide : 0} label="Илюстрирано огледало с пътеките на масажа" />
          </div>
        )}
        {tracking && s.phase === 'run' && s.dirOk && <div className="status-chip ok">{Icon.check}Посоката е правилна</div>}
        {camState === 'starting' && <div className="status-chip">Пускам камерата…</div>}
        {camState === 'failed' && <div className="status-chip warn">Камерата не е достъпна. Броя по темпото.</div>}
      </div>

      <div className="session-top">
        <div className="topbar">
          <button className="icon-btn glass" aria-label="Затвори" onClick={onExit}>{Icon.close}</button>
          <div className="session-title">
            <div className="display-15">{m.title}</div>
            <div className="muted small">{keys.length > 1 ? `Цялото лице · масаж ${s.idx + 1} от ${keys.length}` : 'Масаж'}</div>
          </div>
          <div className="top-actions">
            <button className={`icon-btn glass ${music ? '' : 'off'}`} aria-label={music ? 'Изключи музиката' : 'Включи музиката'} aria-pressed={music} onClick={onMusic}>{Icon.music}</button>
            <button className="icon-btn glass" aria-label={sound ? 'Изключи гласа' : 'Включи гласа'} onClick={onSound}>{sound ? Icon.soundOn : Icon.soundOff}</button>
          </div>
        </div>
        <div className="segments" style={{ gridTemplateColumns: `repeat(${keys.length}, minmax(0,1fr))` }}>
          {keys.map((k, i) => (
            <div key={k} className="seg-bar"><div style={{ width: `${i < s.idx ? 100 : i === s.idx ? ringFrac * 100 : 0}%`, background: PINK }} /></div>
          ))}
        </div>
      </div>

      {s.phase === 'next' ? (
        <div className="next-card">
          <div className="muted small">{s.idx === 0 ? 'Започваме' : 'Следва'} след {Math.max(1, Math.ceil(4 - s.t))}</div>
          <div className="display-24">{m.title}</div>
          <ol className="steps">{m.steps.map((t) => <li key={t}>{t}</li>)}</ol>
          {m.warn && <div className="warn">{Icon.info}<span>{m.warn}</span></div>}
        </div>
      ) : (
        <div className="hud">
          <div className="rep">
            <div className="muted small">{m.type === 'circle' ? 'Кръг' : 'Плъзгане'}</div>
            <div className="display-22">{Math.min(m.count, s.count)} <span className="muted small">/ {m.count}</span></div>
          </div>
          <div className="ring">
            <svg aria-hidden="true" width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r="38" fill="rgba(23,20,28,0.8)" stroke="rgba(246,241,238,0.18)" strokeWidth="6" />
              <circle cx="44" cy="44" r="38" fill="none" stroke={PINK} strokeWidth="6" strokeLinecap="round" strokeDasharray="239" strokeDashoffset={239 * (1 - ringFrac)} transform="rotate(-90 44 44)" />
            </svg>
            <div className="ring-text">
              <div className="display-15" style={{ fontSize: 18 }}>{fmt(left)}</div>
              <div className="muted tiny">остават</div>
            </div>
          </div>
        </div>
      )}

      <div className="sheet">
        <div className="coach">
          <div className="coach-avatar" style={{ background: PINK }}>{Icon.voice}</div>
          <div className="stack-4">
            <div className="coach-label" style={{ color: PINK }}>Треньорът казва</div>
            <div className="coach-text" aria-live="polite">{s.phase === 'next' ? m.about : s.cue}</div>
          </div>
        </div>
        <div className="metrics">
          <div className="metric">
            <div className="metric-row"><span className="muted">Темпо</span><span className="strong" style={{ color: paceOk ? SAGE : undefined }}>{tracking ? paceLabel : `${m.tempo} сек`}</span></div>
            <div className="bar"><div style={{ width: `${tracking ? (s.pace == null ? 0 : Math.min(100, (s.pace / m.tempo) * 100)) : 100}%`, background: paceOk || !tracking ? SAGE : PEACH }} /></div>
          </div>
          <div className="metric">
            <div className="metric-row"><span className="muted">{tracking ? 'Посока' : 'Режим'}</span><span className="strong" style={{ color: tracking && s.dirOk ? SAGE : undefined }}>{tracking ? (s.dirOk == null ? '—' : s.dirOk ? (m.type === 'circle' ? 'кръг' : 'правилна') : 'по пътеката') : camState === 'on' ? 'по темпото' : 'демо'}</span></div>
            <div className="bar"><div style={{ width: tracking && s.dirOk ? '100%' : '40%', background: tracking && s.dirOk ? SAGE : undefined }} /></div>
          </div>
        </div>
        <div className="controls">
          <button className="btn-light" onClick={() => setPaused((x) => !x)}>{paused ? Icon.play : Icon.pause} {paused ? 'Продължи' : 'Пауза'}</button>
          <button className="btn-ghost" onClick={() => { silence(); nextMassage(); }}>Пропусни</button>
        </div>
      </div>
    </section>
  );
}
