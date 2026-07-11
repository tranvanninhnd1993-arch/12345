/* Service worker cho Gia Sư AI (PWA) */
const VERSION = 'gsai-v10';
const FB = 'https://www.gstatic.com/firebasejs/10.12.5/';
const CORE = [
  './',
  'index.html',
  'unblock.html',
  FB + 'firebase-app-compat.js',
  FB + 'firebase-auth-compat.js',
  FB + 'firebase-firestore-compat.js',
  'steps.json',
  'curriculum_g2.json',
  'curriculum_g3.json',
  'curriculum_g4.json',
  'curriculum_g5.json',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(VERSION).then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // chỉ xử lý GET
  const url = new URL(req.url);
  if (url.host === 'www.gstatic.com') {             // SDK Firebase: cache-first để chạy offline
    e.respondWith(caches.match(req).then((c) => c || fetch(req).then((res) => { const cp = res.clone(); caches.open(VERSION).then((k) => k.put(req, cp)); return res; })));
    return;
  }
  if (url.origin !== self.location.origin) return;  // bỏ qua API ngoài (Gemini, Firestore...), để mạng lo

  // Điều hướng trang: ưu tiên mạng, hỏng thì lấy bản cache (chạy offline)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put('index.html', copy));
        return res;
      }).catch(() => caches.match('index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Tài nguyên khác (steps.json, icon, audio...): có cache trả ngay, nền tự cập nhật
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
