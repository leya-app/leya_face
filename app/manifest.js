export default function manifest() {
  return {
    name: 'FACEtetica – йога за лице',
    short_name: 'FACEtetica – йога за лице',
    description: 'Кратки тренировки за лицето с AI треньор',
    start_url: '/',
    display: 'standalone',
    background_color: '#17141C',
    theme_color: '#17141C',
    lang: 'bg',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
