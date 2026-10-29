# FACEtetica – йога за лице (face yoga) — Bulgarian facial exercise app

Brand name: FACEtetica (face + естетика), always spelled with "c"; "FACE" in capitals in the wordmark. Subtitle: „йога за лице“.

Owner: Мария Вълчева. All user-facing text is Bulgarian, gender-neutral "ти" (audience includes men).
Repo leya-app/leya_face; same GitHub org (leya-app) and Vercel account as Лея, separate project.

## Current state (stage 1)
- Next.js 16 (App Router, plain JS). Port of the approved Claude Design canvas
  "Йога за лице – екран упражнение" (Home, Zones, Intro, Main artboards).
- Screens: Начало (Сутрин / Вечер / Избери зона) → Зони (чело, очи, назолабиални, шия) → Интро → Сесия → Готово.
- `components/data.js`: exercises, programs, zones (prototype content, no medical claims).
- `components/tracker.js`: camera + MediaPipe Face Landmarker, on-device only. WASM is served from
  `public/mediapipe`, the model from Google's storage. Metrics: brows, eyesOpen, eyesClose, smile, mouthO,
  jawOpen, chinUp, tilt, calm (forehead stays still), fish, tuck (chin tuck, face shrinks in frame), cheekLift — progress is relative to a 1.5 s calibration of the relaxed face (all metrics calibrated at once). An exercise may have `seq` (e.g. vowels А-Е-И-О-У): each rep has its own metric and cue.
- Without a camera (or "Без камера") the session runs in demo mode with an animated illustrated face.
- Voice coach (components/voice.js): recorded ElevenLabs clips public/voice/NNN.mp3 (voice "Vesela", same as Лея), numbered by
  data/voice-lines.json, listed in public/voice/index.json; played through the Web Audio context; phrases are matched by
  normalized text. Missing clip → device bg speechSynthesis if available, else silent (never a foreign voice).
  Mariya generates blocks of ~19 phrases (blok-NN.mp3); `python3 scripts/split_block.py <blok.mp3> <first_n> <count>
  data/voice-lines.json public/voice` cuts them (pauses are short, so it aligns chunks to expected phrase length),
  then regenerate public/voice/index.json.
- Reps: reach → hold (countdown) → relax 3 s (ring counts down, coach announces the next rep/exercise). With the camera the reach threshold drops after 6 s and hold starts anyway after 10 s, so a session never stalls.
- Background music: generated in the browser (components/music.js, Web Audio pad + bells), no files or licences; toggle in the session top bar, ducks while the coach speaks; AudioContext is unlocked on the "Започни" tap.
- Streak days kept in localStorage only.

## Conventions
- Colors: bg #17141C, surfaces #241E2A / #2B2432, peach #F2B49B, sage #9CC5A1, ink #F6F1EE.
- Fonts: Unbounded (display), Golos Text (body) — both with Cyrillic.
- No medical claims; label AI content; face data never leaves the device (GDPR).

## Next ideas (from Mariya, not decided yet)
- More workouts.
- A massage section (самомасаж на лицето).
- Personal programs (Premium): a program assigned to ONE user only (owner = user id; Supabase row-level security
  so only that user and the trainer who made it can read it). Phase 1: trainer builds it from our exercise library
  (order, reps, hold, days) → camera tracking works everywhere. Trainer's own exercises run on a timer (text + steps).
  Phase 2: user pastes/photographs a program and AI maps it to library exercises for confirmation.
  Needs accounts + database first (same plan as Лея: Apple/Google login, Supabase EU).
