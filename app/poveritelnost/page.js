import { readDoc, renderMd } from '../../lib/simple-md';

export const metadata = { title: 'Поверителност – FACEtetica' };

export default function Page() {
  return (
    <main className="shell">
      <article className="screen legal">
        <a href="/" className="legal-back">← Към приложението</a>
        {renderMd(readDoc('poveritelnost'))}
      </article>
    </main>
  );
}
