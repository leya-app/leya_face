# FACEtetica – йога за лице (face yoga) — Bulgarian facial exercise app

Brand name: FACEtetica (face + естетика), always spelled with "c"; "FACE" in capitals in the wordmark. Subtitle: „йога за лице“.

Owner: Мария Вълчева. All user-facing text is Bulgarian, gender-neutral "ти" (audience includes men).
Repo leya-app/leya_face; same GitHub org (leya-app) and Vercel account as Лея, separate project.

## Current state (stage 1)
- Next.js 16 (App Router, plain JS). Port of the approved Claude Design canvas
  "Йога за лице – екран упражнение" (Home, Zones, Intro, Main artboards).
- Screens: Начало (Сутрин / Вечер / Избери зона / Масажи) → Зони (чело, очи, назолабиални, шия) → Интро → Сесия → Готово.
- Massages (components/massage.js + Massage.jsx): 8 massages (neck drainage, jaw circles, oval, cheeks, under eyes,
  between brows, forehead, temples) + "Цялото лице" sequence. Each has a path per side: stroke (p0→p1→p2) or circle (c, r),
  in illustration coords (demo) and from face landmarks (live). Camera mode also runs MediaPipe Hand Landmarker
  (fingertip = avg of index+middle tips; face and hands alternate frames) and counts strokes (t 0.3→0.8 along the path)
  or full circles; pace = stroke duration vs tempo. No hands for 9 s → counts by tempo. Without camera → demo by tempo.
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
- Occasions (data.js OCCASIONS): Преди снимка, Преди среща, След полет — short programs, chips on Home.
- Тихо огледало (components/QuietMirror.jsx): desk mode. Calibrates the relaxed face 3 s, then watches frown
  (inner-brow distance ↓), raised brows, leaning to the screen (face width ↑); sustained 2/2/5 s → soft chime
  (or voice), on-screen hint, Notification when the tab is hidden; 60 s cooldown per signal; baseline drifts slowly.
  tracker.js switches to a 500 ms timer when the tab is hidden. Picture-in-picture button. Log in localStorage fy-mirror-log.
- Твоята седмица (components/progress.js + Progress.jsx): camera sessions record per exercise: amp (peak relative change),
  stab (hold steadiness 1 − sd/mean of progress), sym (left/right ratio for brows/smile/cheekLift via browL/R, cornerL/R
  metrics). Stored in localStorage fy-progress; Home card + screen compare last 7 days vs previous 7 (first week: first
  2 vs last 2 sessions). Wording measures movement only — never skin or wrinkles.
- Streak days kept in localStorage only.

## Conventions
- Colors: bg #17141C, surfaces #241E2A / #2B2432, peach #F2B49B, sage #9CC5A1, ink #F6F1EE.
- Fonts: Unbounded (display), Golos Text (body) — both with Cyrillic.
- No medical claims; label AI content; face data never leaves the device (GDPR).

## Next ideas (from Mariya, not decided yet)
- More workouts (Mariya will send ideas).
- Later: auto-aligned face time-lapse (day 1 → day N video) and 15-second shareable clip with AR overlay.
- Personal programs (Premium): a program assigned to ONE user only (owner = user id; Supabase row-level security
  so only that user and the trainer who made it can read it). Phase 1: trainer builds it from our exercise library
  (order, reps, hold, days) → camera tracking works everywhere. Trainer's own exercises run on a timer (text + steps).
  Phase 2: user pastes/photographs a program and AI maps it to library exercises for confirmation.
  Needs accounts + database first (same plan as Лея: Apple/Google login, Supabase EU).
