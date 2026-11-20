// Шрифтовете са на нашия сървър (без заявки към Google): само латиница + кирилица.
import '@fontsource/golos-text/latin-400.css';
import '@fontsource/golos-text/latin-500.css';
import '@fontsource/golos-text/latin-600.css';
import '@fontsource/golos-text/latin-700.css';
import '@fontsource/golos-text/cyrillic-400.css';
import '@fontsource/golos-text/cyrillic-500.css';
import '@fontsource/golos-text/cyrillic-600.css';
import '@fontsource/golos-text/cyrillic-700.css';
import '@fontsource/unbounded/latin-500.css';
import '@fontsource/unbounded/latin-600.css';
import '@fontsource/unbounded/cyrillic-500.css';
import '@fontsource/unbounded/cyrillic-600.css';
import './globals.css';

export const metadata = {
  title: 'FACEtetica – йога за лице',
  description: 'Кратки тренировки за лицето на български, с треньор, който следи техниката през камерата.',
  appleWebApp: { capable: true, title: 'FACEtetica', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icons/icon-180.png' },
};

export const viewport = {
  themeColor: '#17141C',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="bg">
      <body>{children}</body>
    </html>
  );
}
