// Мини Markdown за правните страници: # и ## заглавия, параграфи, списъци с „-“, **удебелено**.
import fs from 'fs';
import path from 'path';

function inline(text, key) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith('**') ? <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong> : p));
}

export function readDoc(name) {
  return fs.readFileSync(path.join(process.cwd(), 'content', `${name}.md`), 'utf8');
}

export function renderMd(md) {
  const out = []; let list = null; let para = [];
  const flushPara = () => { if (para.length) { out.push(<p key={`p${out.length}`}>{inline(para.join(' '), out.length)}</p>); para = []; } };
  const flushList = () => { if (list) { out.push(<ul key={`u${out.length}`}>{list.map((t, i) => <li key={i}>{inline(t, i)}</li>)}</ul>); list = null; } };
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    if (line.startsWith('# ')) { flushPara(); flushList(); out.push(<h1 key={`h${out.length}`} className="display-28">{line.slice(2)}</h1>); continue; }
    if (line.startsWith('## ')) { flushPara(); flushList(); out.push(<h2 key={`h${out.length}`}>{line.slice(3)}</h2>); continue; }
    if (line.startsWith('- ')) { flushPara(); (list ||= []).push(line.slice(2)); continue; }
    flushList(); para.push(line);
  }
  flushPara(); flushList();
  return out;
}
