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
  // спокойно чело: прогресът е висок, докато веждите стоят на мястото си
  calm: {
    mode: 'calm', target: 0.1,
    fn: (L) => ((d(L[105], L[159]) + d(L[334], L[386])) / 2) / d(L[10], L[152]),
  },
  // рибешка муцунка: устата се стеснява
  fish: {
    mode: 'rel', target: -0.14,
    fn: (L) => d(L[61], L[291]) / d(L[234], L[454]),
  },
  // прибиране на брадичката: главата отива назад и лицето в кадъра се смалява
  tuck: {
    mode: 'rel', target: -0.05,
    fn: (L) => d(L[234], L[454]),
  },
  // повдигане на скулите: бузата се приближава към долния клепач
  cheekLift: {
    mode: 'rel', target: -0.1,
    fn: (L) => ((d(L[145], L[205]) + d(L[374], L[425])) / 2) / d(L[10], L[152]),
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
  else if (m.mode === 'calm') p = 1 - Math.abs(value / base - 1) / m.target;
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

const HAND_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
let handPromise = null;
async function getHandLandmarker() {
  if (!handPromise) {
    handPromise = (async () => {
      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks('/mediapipe');
      return HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAND_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 2,
      });
    })().catch((e) => {
      handPromise = null;
      throw e;
    });
  }
  return handPromise;
}

// Пуска камерата във <video>, вика onFrame(face | null, hands[]) на всеки кадър.
// opts.hands: следи и ръцете (за масажите); лицето и ръцете се редуват по кадри.
export async function startTracking(video, onFrame, opts = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  let landmarker;
  let hands = null;
  try {
    landmarker = await getLandmarker();
    if (opts.hands) hands = await getHandLandmarker().catch(() => null);
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }

  let raf = 0;
  let last = -1;
  let face = null;
  let handList = [];
  let odd = false;
  let timer = 0;
  // Във фонов раздел requestAnimationFrame спира – тогава проверяваме 2 пъти в секунда.
  const schedule = () => {
    if (typeof document !== 'undefined' && document.hidden) timer = setTimeout(loop, 500);
    else raf = requestAnimationFrame(loop);
  };
  const loop = () => {
    schedule();
    if (video.readyState < 2 || (!document.hidden && video.currentTime === last)) return;
    last = video.currentTime;
    const now = performance.now();
    if (hands && odd) {
      const r = hands.detectForVideo(video, now);
      handList = r.landmarks || [];
    } else {
      const res = landmarker.detectForVideo(video, now);
      face = res.faceLandmarks && res.faceLandmarks[0] ? res.faceLandmarks[0] : null;
    }
    odd = !odd;
    onFrame(face, handList);
  };
  loop();

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
}
