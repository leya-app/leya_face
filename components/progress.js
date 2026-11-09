// „Твоята седмица“: записи от тренировките с камера и сравнение седмица срещу седмица.
// Мерим движението (обхват, стабилност, симетрия), не бръчки – без медицински обещания.
const KEY = 'fy-progress';
const DAY = 86400000;

const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const put = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
function stability(hold) {
  if (hold.length < 5) return null;
  const m = mean(hold); if (!m) return null;
  const sd = Math.sqrt(mean(hold.map((x) => (x - m) ** 2)));
  return Math.max(0, Math.min(1, 1 - sd / m));
}

export function saveProgress(stats) {
  const ex = {};
  for (const [k, st] of Object.entries(stats || {})) {
    const stab = stability(st.hold);
    const sym = st.symN >= 5 ? st.symSum / st.symN : null;
    if (st.amp > 0 || stab != null) ex[k] = { amp: st.amp || null, stab, sym };
  }
  if (!Object.keys(ex).length) return;
  const all = get();
  all.push({ at: Date.now(), ex });
  put(all.slice(-300));
}

export function loadProgress() { return get(); }

// Средно по упражнения, общи за двата периода.
function compare(a, b, field) {
  const ratios = [];
  const keys = new Set(a.flatMap((s) => Object.keys(s.ex)));
  for (const k of keys) {
    const va = mean(a.map((s) => s.ex[k]?.[field]).filter((x) => x != null));
    const vb = mean(b.map((s) => s.ex[k]?.[field]).filter((x) => x != null));
    if (va != null && vb != null && va > 0) ratios.push(vb / va);
  }
  return ratios.length ? mean(ratios) - 1 : null;
}

export function weekly(days = []) {
  const all = get();
  const now = Date.now();
  let cur = all.filter((s) => now - s.at < 7 * DAY);
  let prev = all.filter((s) => now - s.at >= 7 * DAY && now - s.at < 14 * DAY);
  let against = 'миналата седмица';
  if (!prev.length) {
    // първа седмица: сравняваме първите тренировки с последните
    if (cur.length >= 4) { prev = cur.slice(0, 2); cur = cur.slice(-2); against = 'първите ти тренировки'; }
    else prev = [];
  }
  const syms = cur.flatMap((s) => Object.values(s.ex).map((e) => e.sym)).filter((x) => x != null);
  const prevSyms = prev.flatMap((s) => Object.values(s.ex).map((e) => e.sym)).filter((x) => x != null);
  const daySet = new Set(days);
  let active = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now - i * DAY);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (daySet.has(k)) active++;
  }
  return {
    sessions: all.length,
    ready: prev.length > 0 && cur.length > 0,
    against,
    active,
    amp: prev.length ? compare(prev, cur, 'amp') : null,
    stab: prev.length ? compare(prev, cur, 'stab') : null,
    sym: mean(syms),
    symDelta: prevSyms.length && syms.length ? mean(syms) - mean(prevSyms) : null,
    all,
  };
}

export const pct = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;
