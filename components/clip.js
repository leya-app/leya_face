// 15-секундно видео за споделяне: огледало + точки + брояч + реплика + марка, 9:16.
import { recordingAudio } from './music';

export const CLIP_W = 720;
export const CLIP_H = 1280;

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function wrap(ctx, text, maxW) {
  const words = String(text || '').split(' '); const lines = []; let line = '';
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

// getState() → { L, points, good, title, sub, rep, reps, holdFrac, holdText, cue }
export function recordClip(video, getState, { seconds = 15, onTick } = {}) {
  const c = document.createElement('canvas'); c.width = CLIP_W; c.height = CLIP_H;
  const ctx = c.getContext('2d');
  const stream = c.captureStream(30);
  const audio = recordingAudio();
  if (audio) audio.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => { rec.onstop = r; });

  const W = CLIP_W; const H = CLIP_H;
  const t0 = performance.now(); let raf = 0; let cancelled = false;

  const frame = () => {
    const t = (performance.now() - t0) / 1000;
    const st = getState();
    // огледален образ, изрязан до 9:16
    ctx.fillStyle = '#17141C'; ctx.fillRect(0, 0, W, H);
    let sc = 1, ox = 0, oy = 0;
    if (video.videoWidth) {
      sc = Math.max(W / video.videoWidth, H / video.videoHeight);
      const dw = video.videoWidth * sc; const dh = video.videoHeight * sc; ox = (dw - W) / 2; oy = (dh - H) / 2;
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(video, -ox, -oy, dw, dh); ctx.restore();
    }
    // точките върху лицето
    if (st.L && st.points && video.videoWidth) {
      ctx.fillStyle = st.good ? '#9CC5A1' : '#F2B49B';
      for (const i of st.points) {
        const x = W - (st.L[i].x * video.videoWidth * sc - ox); const y = st.L[i].y * video.videoHeight * sc - oy;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
    // горе: марка + упражнение
    const grad = ctx.createLinearGradient(0, 0, 0, 260); grad.addColorStop(0, 'rgba(23,20,28,0.85)'); grad.addColorStop(1, 'rgba(23,20,28,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 260);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = '600 34px "Unbounded", system-ui, sans-serif'; ctx.fillStyle = '#F2B49B'; ctx.fillText('FACE', 44, 90);
    const fw = ctx.measureText('FACE').width; ctx.font = '500 34px "Unbounded", system-ui, sans-serif'; ctx.fillText('tetica', 44 + fw, 90);
    ctx.font = '600 44px "Unbounded", system-ui, sans-serif'; ctx.fillStyle = '#F6F1EE'; ctx.fillText(st.title || '', 44, 160);
    ctx.font = '400 28px "Golos Text", system-ui, sans-serif'; ctx.fillStyle = '#E8DFE3'; ctx.fillText(st.sub || 'йога за лице', 44, 205);
    // долу: реплика + брояч + пръстен
    const g2 = ctx.createLinearGradient(0, H - 420, 0, H); g2.addColorStop(0, 'rgba(23,20,28,0)'); g2.addColorStop(1, 'rgba(23,20,28,0.9)');
    ctx.fillStyle = g2; ctx.fillRect(0, H - 420, W, 420);
    if (st.reps) {
      ctx.font = '400 28px "Golos Text", system-ui, sans-serif'; ctx.fillStyle = '#BDB2BA'; ctx.fillText('Повторение', 44, H - 270);
      ctx.font = '600 64px "Unbounded", system-ui, sans-serif'; ctx.fillStyle = '#F6F1EE'; ctx.fillText(`${st.rep}`, 44, H - 200);
      const rw = ctx.measureText(`${st.rep}`).width; ctx.font = '400 34px "Golos Text", system-ui, sans-serif'; ctx.fillStyle = '#BDB2BA'; ctx.fillText(` / ${st.reps}`, 50 + rw, H - 200);
    }
    if (st.holdText != null) {
      const cx = W - 120; const cy = H - 245; const r = 70;
      ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(246,241,238,0.2)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#9CC5A1'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (st.holdFrac || 0)); ctx.stroke();
      ctx.textAlign = 'center'; ctx.font = '600 52px "Unbounded", system-ui, sans-serif'; ctx.fillStyle = '#F6F1EE'; ctx.fillText(st.holdText, cx, cy + 18); ctx.textAlign = 'left';
    }
    if (st.cue) {
      ctx.font = '500 34px "Golos Text", system-ui, sans-serif'; ctx.fillStyle = '#F6F1EE';
      wrap(ctx, st.cue, W - 88).forEach((ln, i) => ctx.fillText(ln, 44, H - 110 + i * 44));
    }
    // лента за записа
    ctx.fillStyle = 'rgba(246,241,238,0.2)'; roundRect(ctx, 44, H - 36, W - 88, 6, 3); ctx.fill();
    ctx.fillStyle = '#F2B49B'; roundRect(ctx, 44, H - 36, (W - 88) * Math.min(1, t / seconds), 6, 3); ctx.fill();
    onTick && onTick(Math.min(1, t / seconds));
    if (t < seconds && !cancelled) raf = requestAnimationFrame(frame); else rec.stop();
  };

  rec.start(250);
  raf = requestAnimationFrame(frame);
  const promise = stopped.then(() => {
    const type = (mime || 'video/webm').split(';')[0];
    return new Blob(chunks, { type });
  });
  return { promise, cancel: () => { cancelled = true; cancelAnimationFrame(raf); if (rec.state !== 'inactive') rec.stop(); } };
}
