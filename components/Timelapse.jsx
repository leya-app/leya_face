'use client';

import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { isOn, setOn, listFrames, clearFrames, removeFrame, renderVideo } from './timelapse';

const DAY = 86400000;

export default function Timelapse({ onBack }) {
  const [on, setOnState] = useState(false);
  const [frames, setFrames] = useState([]);
  const [urls, setUrls] = useState({});
  const [video, setVideo] = useState(null); // { url, blob }
  const [busy, setBusy] = useState(null);   // 0..1 докато се прави видеото
  const [confirmClear, setConfirmClear] = useState(false);

  const load = async () => {
    const f = await listFrames();
    setFrames(f);
    setUrls((old) => { Object.values(old).forEach(URL.revokeObjectURL); return Object.fromEntries(f.map((x) => [x.day, URL.createObjectURL(x.blob)])); });
  };
  useEffect(() => { setOnState(isOn()); load(); return () => { if (video) URL.revokeObjectURL(video.url); }; /* eslint-disable-next-line */ }, []);

  const toggle = (v) => { setOn(v); setOnState(v); };
  const first = frames[0] ? frames[0].at : 0;
  const dayNo = (f) => Math.round((f.at - first) / DAY) + 1;

  const make = async () => {
    setBusy(0); setVideo(null);
    try {
      const blob = await renderVideo(frames, setBusy);
      setVideo({ url: URL.createObjectURL(blob), blob });
    } catch { /* устройството не може да записва видео */ }
    setBusy(null);
  };

  const ext = video && video.blob.type.includes('mp4') ? 'mp4' : 'webm';
  const share = async () => {
    const file = new File([video.blob], `facetetica-${frames.length}-dni.${ext}`, { type: video.blob.type });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'FACEtetica' }); } catch {}
  };
  const canShare = video && typeof navigator !== 'undefined' && navigator.canShare &&
    navigator.canShare({ files: [new File([video.blob], `x.${ext}`, { type: video.blob.type })] });

  return (
    <section className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="Назад" onClick={onBack}>{Icon.back}</button>
      </div>
      <div className="stack-6">
        <h1 className="display-28">Таймлапс</h1>
        <p className="lead">Всеки ден една снимка на спокойното ти лице, винаги подравнена по очите. След месец – видео от ден 1 до днес.</p>
      </div>

      <label className="toggle-row">
        <span className="stack-4">
          <span className="strong">Снимка при всяка тренировка с камера</span>
          <span className="muted small">Прави се сама в началото, когато лицето е отпуснато.</span>
        </span>
        <input id="timelapse-on" type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} />
      </label>

      {frames.length > 0 ? (
        <>
          <div className="tl-grid">
            {frames.map((f) => (
              <div key={f.day} className="tl-cell">
                {urls[f.day] && <img src={urls[f.day]} alt={`Снимка от ден ${dayNo(f)}`} />}
                <span className="tl-label">Ден {dayNo(f)}</span>
                <button className="tl-del" aria-label={`Изтрий снимката от ден ${dayNo(f)}`} onClick={async () => { await removeFrame(f.day); load(); }}>{Icon.close}</button>
              </div>
            ))}
          </div>

          {frames.length >= 2 && busy == null && !video && <button className="cta" onClick={make}>{Icon.play} Направи видео</button>}
          {busy != null && (
            <div className="metric">
              <div className="metric-row"><span className="muted">Правя видеото…</span><span className="strong">{Math.round(busy * 100)}%</span></div>
              <div className="bar"><div style={{ width: `${busy * 100}%` }} /></div>
            </div>
          )}
          {video && (
            <div className="stack-6">
              <video className="tl-video" src={video.url} controls playsInline autoPlay muted loop />
              <div className="controls">
                {canShare && <button className="btn-light" onClick={share}>Сподели</button>}
                <a className="btn-ghost tl-save" href={video.url} download={`facetetica-${frames.length}-dni.${ext}`}>Запази</a>
              </div>
            </div>
          )}
          {frames.length < 2 && <p className="muted small">Още една тренировка с камера и можеш да направиш първото видео.</p>}

          {!confirmClear ? (
            <button className="link-btn" onClick={() => setConfirmClear(true)}>Изтрий всички снимки</button>
          ) : (
            <div className="summary-card">
              <div className="strong">Да изтрия ли всички {frames.length} снимки?</div>
              <div className="controls">
                <button className="btn-light" onClick={async () => { await clearFrames(); setConfirmClear(false); setVideo(null); load(); }}>Изтрий</button>
                <button className="btn-ghost" onClick={() => setConfirmClear(false)}>Отказ</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="summary-card">
          <div className="strong">Още няма снимки</div>
          <div className="muted small">{on ? 'Направи тренировка с камера – първата снимка ще се появи тук.' : 'Включи снимките отгоре и направи тренировка с камера.'}</div>
        </div>
      )}

      <p className="fine" style={{ textAlign: 'left' }}>Снимките остават само на това устройство и не се изпращат никъде. Видеото излиза от телефона ти, само ако ти го споделиш.</p>
    </section>
  );
}
