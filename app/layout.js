import './globals.css';

export const metadata = {
  title: 'Йога за лице',
  description: 'Кратки тренировки за лицето на български, с треньор, който следи техниката през камерата.',
  appleWebApp: { capable: true, title: 'Йога за лице', statusBarStyle: 'black-translucent' },
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=Unbounded:wght@500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
