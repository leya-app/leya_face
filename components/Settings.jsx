'use client';

import { useState } from 'react';
import { Icon } from './icons';
import { clearFrames, isOn as timelapseOn } from './timelapse';

const EMAIL = 'support.leya@gmail.com';
const VERSION = '1.0 (тест)';

function Toggle({ id, label, hint, checked, onChange }) {
  return (
    <label className="toggle-row" htmlFor={id}>
      <span className="stack-4">
        <span className="strong">{label}</span>
        {hint && <span className="muted small">{hint}</span>}
      </span>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export default function Settings({ sound, music, useCamera, onSound, onMusic, onCamera, onTimelapse, onBack }) {
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const wipe = async () => {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('fy-')).forEach((k) => localStorage.removeItem(k));
    } catch {}
    try { await clearFrames(); } catch {}
    window.location.reload();
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(EMAIL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <section className="screen settings">
      <div className="topbar">
        <button className="icon-btn" aria-label="Назад" onClick={onBack}>{Icon.back}</button>
      </div>
      <div className="stack-6">
        <div className="wordmark" aria-label="FACEtetica"><b>FACE</b>tetica</div>
        <h1 className="display-28">Профил</h1>
      </div>

      <div className="settings-group">
        <div className="settings-title">Тренировки</div>
        <Toggle id="set-sound" label="Глас на треньора" hint="Весела – тренировки, Коста – масажи" checked={sound} onChange={(v) => v !== sound && onSound()} />
        <Toggle id="set-music" label="Фонова музика" checked={music} onChange={(v) => v !== music && onMusic()} />
        <Toggle id="set-camera" label="Започвай с камера" hint="Можеш да го смениш и преди всяка тренировка" checked={useCamera} onChange={(v) => onCamera(v)} />
        <button className="settings-link" onClick={onTimelapse}>
          <span className="stack-4"><span className="strong">Таймлапс</span><span className="muted small">{timelapseOn() ? 'Включен' : 'Изключен'}</span></span>
          <span className="muted">{Icon.chevron}</span>
        </button>
      </div>

      <div className="settings-group">
        <div className="settings-title">Информация</div>
        <a className="settings-link" href="/usloviya"><span className="strong">Общи условия</span><span className="muted">{Icon.chevron}</span></a>
        <a className="settings-link" href="/poveritelnost"><span className="strong">Поверителност</span><span className="muted">{Icon.chevron}</span></a>
        <div className="settings-link">
          <span className="stack-4"><span className="strong">Връзка с нас</span><span className="muted small selectable">{EMAIL}</span></span>
          <button className="btn-ghost small-btn" onClick={copy}>{copied ? 'Копирано' : 'Копирай'}</button>
        </div>
        <div className="settings-note">Гласовете на треньорите са създадени с изкуствен интелект. Упражненията не са медицински съвет.</div>
      </div>

      <div className="settings-group">
        <div className="settings-title">Данни</div>
        <div className="settings-note">Всичко се пази само на това устройство: настройки, дни, напредък и снимките за таймлапса.</div>
        {!confirm ? (
          <button className="settings-link danger" onClick={() => setConfirm(true)}><span className="strong">Изтрий всички данни</span></button>
        ) : (
          <div className="summary-card">
            <div className="strong">Да изтрия ли всичко от това устройство?</div>
            <div className="muted small">Настройките, дните поред, напредъкът и снимките за таймлапса ще се изтрият завинаги.</div>
            <div className="controls">
              <button className="btn-light" onClick={wipe}>Изтрий</button>
              <button className="btn-ghost" onClick={() => setConfirm(false)}>Отказ</button>
            </div>
          </div>
        )}
      </div>

      <div className="fine">FACEtetica · версия {VERSION}</div>
    </section>
  );
}
