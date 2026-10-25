// Камера + MediaPipe Face Landmarker. Всичко се обработва в браузъра.

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Всяка метрика връща число; прогресът се смята спрямо базата от калибрирането.
// mode 'rel': (v / base - 1) / target, 'abs': |v - base| / target, 'delta': (v - base) / target
export const METRICS = {
  brows: {
    mode: 'rel', target: 0.22,
    fn: (L) => ((d(L[105], L[159]) + d(L[334], L[386])) / 2) / d(L[10], L[152]),
  },
  eyesOpen: {
    mode: 'rel', target: 0.3,
    fn: (L) => ((d(L[159], L[145]) + d(L[386], L[374])) / 2) / d(L[10], L[152]),
  },
  eyesClose: {
    mode: 'rel', target: -0.35,
    fn: (L) => ((d(L[159], L[145]) + d(L[386], L[374])) / 2) / d(L[10], L[152]),
  },
  smile: {
    mode: 'rel', target: 0.12,
    fn: (L) => d(L[61], L[291]) / d(L[234], L[454]),
  },
  mouthO: {
    mode: 'delta', target: 0.35,
    fn: (L) => d(L[13], L[14]) / d(L[61], L[291]),
  },
  jawOpen: {
    mode: 'delta', target: 0.1,
    fn: (L) => d(L[13], L[14]) / d(L[10], L[152]),
  },
  chinUp: {
    mode: 'abs', target: 0.06,
    fn: (L) => (L[1].y - (L[33].y + L[263].y) / 2) / d(L[10], L[152]),
  },
  tilt: {
    mode: 'abs', target: 14,
    fn: (L) => (Math.atan2(L[263].y - L[33].y, L[263].x - L[33].x) * 180) / Math.PI,
  },
};

export function progressFor(metric, value, base) {
  const m = METRICS[metric];
  if (!m || base == null) return 0;
  let p;
  if (m.mode === 'rel') p = (value / base - 1) / m.target;
  else if (m.mode === 'delta') p = (value - base) / m.target;
  else p = Math.abs(value - base) / m.target;
  return Math.max(0, Math.min(1.2, p));
}

let landmarkerPromise = null;

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks('/mediapipe');
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    })().catch((e) => {
      landmarkerPromise = null;
      throw e;
    });
  }
  return landmarkerPromise;
}

// Пуска камерата във <video>, вика onFrame(landmarks | null) на всеки кадър.
export async function startTracking(video, onFrame) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  let landmarker;
  try {
    landmarker = await getLandmarker();
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }

  let raf = 0;
  let last = -1;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (video.readyState < 2 || video.currentTime === last) return;
    last = video.currentTime;
    const res = landmarker.detectForVideo(video, performance.now());
    onFrame(res.faceLandmarks && res.faceLandmarks[0] ? res.faceLandmarks[0] : null);
  };
  loop();

  return () => {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
}
