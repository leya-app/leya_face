// Таймлапс на лицето: по една подравнена снимка на ден (спокойно лице, от калибрирането),
// пазят се само на устройството (IndexedDB). От тях се прави видео „ден 1 → ден N“.

const DB = 'facetetica';
const STORE = 'frames';
export const W = 480;
export const H = 600;

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'day' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r && r.result !== undefined ? r.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

export const isOn = () => { try { return JSON.parse(localStorage.getItem('fy-timelapse') || 'false'); } catch { return false; } };
export const setOn = (v) => { try { localStorage.setItem('fy-timelapse', JSON.stringify(v)); } catch {} };

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Подравняване: центровете на очите винаги на едни и същи места, образът огледален (като селфи).
export function captureAligned(video, L) {
  if (!video || !video.videoWidth || !L) return null;
  const vw = video.videoWidth; const vh = video.videoHeight;
  const eye = (a, b) => ({ x: ((L[a].x + L[b].x) / 2) * vw, y: ((L[a].y + L[b].y) / 2) * vh });
  const A = eye(33, 133); const B = eye(263, 362);
  // целеви места в изходната снимка (преди огледалото)
  // (в суровия кадър точка 33 е вляво, 263 вдясно – запазваме посоката, огледалото идва след това)
  const tA = { x: W * 0.36, y: H * 0.42 }; const tB = { x: W * 0.64, y: H * 0.42 };
  const sv = { x: B.x - A.x, y: B.y - A.y }; const tv = { x: tB.x - tA.x, y: tB.y - tA.y };
  const sl = Math.hypot(sv.x, sv.y); if (sl < 10) return null;
  const scale = Math.hypot(tv.x, tv.y) / sl;
  const rot = Math.atan2(tv.y, tv.x) - Math.atan2(sv.y, sv.x);
  const cos = Math.cos(rot) * scale; const sin = Math.sin(rot) * scale;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#17141C'; ctx.fillRect(0, 0, W, H);
  // огледално: x → W - x
  ctx.translate(W, 0); ctx.scale(-1, 1);
  const e = tA.x - (cos * A.x - sin * A.y); const f = tA.y - (sin * A.x + cos * A.y);
  ctx.transform(cos, sin, -sin, cos, e, f);
  ctx.drawImage(video, 0, 0, vw, vh);
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/jpeg', 0.85));
}

export async function saveToday(blob) {
  if (!blob) return;
  await tx('readwrite', (s) => s.put({ day: dayKey(), at: Date.now(), blob }));
}

export async function listFrames() {
  try { return ((await tx('readonly', (s) => s.getAll())) || []).sort((a, b) => a.day.localeCompare(b.day)); } catch { return []; }
}

export async function removeFrame(day) { await tx('readwrite', (s) => s.delete(day)); }
export async function clearFrames() { await tx('readwrite', (s) => s.clear()); }

const loadImg = (blob) => new Promise((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = URL.createObjectURL(blob);
});

// Видео: всяка снимка ~0,45 сек, плавен преход, „Ден N“ и марката.
export async function renderVideo(frames, onProgress) {
  const imgs = await Promise.all(frames.map((f) => loadImg(f.blob)));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const stream = c.captureStream(30);
  const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 2_500_000 } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((resolve) => { rec.onstop = resolve; });
  const first = new Date(frames[0].at);
  const label = (i) => `Ден ${Math.round((frames[i].at - first) / 86400000) + 1}`;

  const HOLD = 450; const FADE = 250; const END = 1200;
  const total = imgs.length * HOLD + END;
  const drawText = (i) => {
    ctx.fillStyle = 'rgba(23,20,28,0.65)';
    ctx.fillRect(0, H - 70, W, 70);
    ctx.fillStyle = '#F6F1EE'; ctx.font = '600 28px "Unbounded", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label(i), 22, H - 35);
    ctx.textAlign = 'right'; ctx.font = '600 20px "Unbounded", system-ui, sans-serif';
    ctx.fillStyle = '#F2B49B'; ctx.fillText('FACE', W - 22 - ctx.measureText('tetica').width - 1, H - 35);
    ctx.fillStyle = '#F2B49B'; ctx.font = '500 20px "Unbounded", system-ui, sans-serif'; ctx.fillText('tetica', W - 22, H - 35);
  };

  rec.start();
  const t0 = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      const t = performance.now() - t0;
      const i = Math.min(imgs.length - 1, Math.floor(t / HOLD));
      const into = t - i * HOLD;
      ctx.globalAlpha = 1; ctx.drawImage(imgs[i], 0, 0, W, H);
      if (i + 1 < imgs.length && into > HOLD - FADE) { ctx.globalAlpha = (into - (HOLD - FADE)) / FADE; ctx.drawImage(imgs[i + 1], 0, 0, W, H); ctx.globalAlpha = 1; }
      drawText(i);
      onProgress && onProgress(Math.min(1, t / total));
      if (t < total) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  await done;
  imgs.forEach((im) => URL.revokeObjectURL(im.src));
  const type = (mime || 'video/webm').split(';')[0];
  return new Blob(chunks, { type });
}
