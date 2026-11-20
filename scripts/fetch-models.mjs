// При build (във Vercel) сваля моделите за лице и ръце в public/models, за да не зависим от Google.
// Ако свалянето не стане, build-ът продължава – приложението тогава ги взима от Google.
import fs from 'fs';
import path from 'path';

const MODELS = {
  'face_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  'hand_landmarker.task': 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
};
const dir = path.join(process.cwd(), 'public', 'models');
fs.mkdirSync(dir, { recursive: true });
for (const [name, url] of Object.entries(MODELS)) {
  const file = path.join(dir, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 1e6) { console.log(`models: ${name} вече е тук`); continue; }
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    console.log(`models: свалих ${name} (${Math.round(fs.statSync(file).size / 1e6)} MB)`);
  } catch (e) {
    console.warn(`models: ${name} не се свали (${e.message}) – ще се ползва от Google`);
  }
}
