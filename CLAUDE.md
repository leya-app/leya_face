# Йога за лице (face yoga) — Bulgarian facial exercise app

Owner: Мария Вълчева. All user-facing text is Bulgarian, gender-neutral "ти" (audience includes men).
Repo leya-app/leya_face; same GitHub org (leya-app) and Vercel account as Лея, separate project.

## Current state (stage 1)
- Next.js 16 (App Router, plain JS). Port of the approved Claude Design canvas
  "Йога за лице – екран упражнение" (Home, Zones, Intro, Main artboards).
- Screens: Начало (Сутрин / Вечер / Избери зона) → Зони (чело, очи, назолабиални, шия) → Интро → Сесия → Готово.
- `components/data.js`: exercises, programs, zones (prototype content, no medical claims).
- `components/tracker.js`: camera + MediaPipe Face Landmarker, on-device only. WASM is served from
  `public/mediapipe`, the model from Google's storage. Metrics: brows, eyesOpen, eyesClose, smile, mouthO,
  jawOpen, chinUp, tilt — progress is relative to a 1.5 s calibration of the relaxed face.
- Without a camera (or "Без камера") the session runs in demo mode with an animated illustrated face.
- Voice coach = browser speechSynthesis, ONLY with a bg voice; if the device has none it stays silent (a foreign voice reading Cyrillic sounds garbled). Later: pre-recorded Bulgarian audio.
- Reps: reach → hold (countdown) → relax 3 s (ring counts down, coach announces the next rep/exercise). With the camera the reach threshold drops after 6 s and hold starts anyway after 10 s, so a session never stalls.
- Streak days kept in localStorage only.

## Conventions
- Colors: bg #17141C, surfaces #241E2A / #2B2432, peach #F2B49B, sage #9CC5A1, ink #F6F1EE.
- Fonts: Unbounded (display), Golos Text (body) — both with Cyrillic.
- No medical claims; label AI content; face data never leaves the device (GDPR).

## Next ideas (from Mariya, not decided yet)
- More workouts.
- A massage section (самомасаж на лицето).
- Pre-recorded Bulgarian voice instead of device text-to-speech.
