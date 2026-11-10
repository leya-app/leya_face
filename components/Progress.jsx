'use client';

import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { EXERCISES } from './data';
import { weekly, pct } from './progress';

const DAY = 86400000;
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function useWeekly(days) {
  const [w, setW] = useState(null);
  useEffect(() => { setW(weekly(days)); }, [days]);
  return w;
}

function lines(w) {
  const out = [];
  if (w.amp != null) out.push(Math.abs(w.amp) < 0.03 ? 'Обхватът на движението е както преди' : w.amp > 0 ? `Движението е с ${Math.round(w.amp * 100)}% по-широко` : `Движението е с ${Math.round(-w.amp * 100)}% по-малко – важна е редовността`);
  if (w.stab != null) out.push(Math.abs(w.stab) < 0.03 ? 'Задържането е стабилно както преди' : w.stab > 0 ? `Задържането е с ${Math.round(w.stab * 100)}% по-стабилно` : 'Задържането трепери малко повече – по-бавно и по-леко');
  if (w.sym != null) out.push(`Симетрия ляво–дясно: ${Math.round(w.sym * 100)}%${w.symDelta != null && Math.abs(w.symDelta) >= 0.02 ? ` (${w.symDelta > 0 ? '+' : ''}${Math.round(w.symDelta * 100)})` : ''}`);
  return out;
}

export function WeekCard({ days, onOpen }) {
  const w = useWeekly(days);
  if (!w) return null;
  const l = w.ready ? lines(w) : [];
  return (
    <button className="week-card" onClick={onOpen}>
      <span className="week-head">
        <span className="week-title">Твоята седмица</span>
        <span className="muted small">{w.active} от 7 дни</span>
      </span>
      <span className="week-dots" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(Date.now() - (6 - i) * DAY);
          return <span key={i} className={`week-dot ${days.includes(dayKey(d)) ? 'on' : ''}`} />;
        })}
      </span>
      {l.length ? (
        <span className="week-lines">{l.slice(0, 2).map((t) => <span key={t}>{t}</span>)}</span>
      ) : (
        <span className="muted small">Тренирай с камерата няколко пъти и тук ще видиш как се променя движението ти.</span>
      )}
    </button>
  );
}

function Spark({ values }) {
  if (values.length < 2) return null;
  const w = 120; const h = 32; const max = Math.max(...values) || 1; const min = Math.min(...values);
  const span = max - min || max * 0.2 || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (w - 8) + 4},${h - 4 - ((v - min) / span) * (h - 8)}`);
  const last = pts[pts.length - 1].split(',');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Обхват на движението по тренировки">
      <polyline points={pts.join(' ')} fill="none" stroke="#9CC5A1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="#9CC5A1" />
    </svg>
  );
}

export default function Progress({ days, onBack, onTimelapse }) {
  const w = useWeekly(days);
  if (!w) return <section className="screen" />;
  const l = w.ready ? lines(w) : [];
  // по упражнение: обхват във времето
  const byEx = {};
  for (const s of w.all) for (const [k, e] of Object.entries(s.ex)) if (e.amp != null) (byEx[k] ||= []).push(e.amp);
  const exRows = Object.entries(byEx).filter(([k, v]) => EXERCISES[k] && v.length >= 1).sort((a, b) => b[1].length - a[1].length);

  return (
    <section className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Назад" onClick={onBack}>{Icon.back}</button>
      </div>
      <div className="stack-6">
        <h1 className="display-28">Твоята седмица</h1>
        <p className="lead">{w.ready ? `Сравнение с ${w.against}.` : 'Тук ще виждаш напредъка си от тренировките с камера.'}</p>
      </div>

      <div className="week-big">
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(Date.now() - (6 - i) * DAY);
          return (
            <div key={i} className="week-day">
              <span className={`week-dot big ${days.includes(dayKey(d)) ? 'on' : ''}`} />
              <span className="muted tiny">{new Intl.DateTimeFormat('bg-BG', { weekday: 'short' }).format(d)}</span>
            </div>
          );
        })}
      </div>

      <div className="mirror-counts">
        <div className="metric"><div className="muted small">Обхват</div><div className="display-22">{w.amp != null ? pct(w.amp) : '—'}</div></div>
        <div className="metric"><div className="muted small">Стабилност</div><div className="display-22">{w.stab != null ? pct(w.stab) : '—'}</div></div>
        <div className="metric"><div className="muted small">Симетрия</div><div className="display-22">{w.sym != null ? `${Math.round(w.sym * 100)}%` : '—'}</div></div>
      </div>

      <button className="zone-row" onClick={onTimelapse}>
        <span className="zone-row-icon pink-bg">{Icon.cam}</span>
        <span className="zone-row-text">
          <span className="zone-row-title">Таймлапс</span>
          <span className="muted small">Видео на лицето ти: ден 1 → ден 30</span>
        </span>
        <span className="muted">{Icon.chevron}</span>
      </button>

      {l.length > 0 && <div className="summary-card">{l.map((t) => <div key={t}>{t}</div>)}</div>}

      {exRows.length > 0 && (
        <div className="stack-6">
          <div className="muted small strong">По упражнения</div>
          {exRows.map(([k, v]) => (
            <div key={k} className="progress-row">
              <span className="stack-4" style={{ minWidth: 0 }}>
                <span className="strong">{EXERCISES[k].title}</span>
                <span className="muted small">{v.length} {v.length === 1 ? 'тренировка' : 'тренировки'}{v.length >= 2 && v[0] > 0 ? ` · ${pct(v[v.length - 1] / v[0] - 1)} от първата` : ''}</span>
              </span>
              <Spark values={v} />
            </div>
          ))}
        </div>
      )}

      <p className="fine" style={{ textAlign: 'left' }}>
        Мерим движението на мускулите с камерата: колко широко, колко стабилно и колко еднакво от двете страни. Това не е оценка на кожата или бръчките. Данните остават на телефона ти.
      </p>
    </section>
  );
}
