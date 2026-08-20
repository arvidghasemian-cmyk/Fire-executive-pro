const CACHE_NAME = 'fireexec-pro-v2'; // نسخه جدید برای پاک کردن کش‌های خراب قبلی
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// ۱. نصب و کش کردن فایل‌ها
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] فایل‌ها با موفقیت کش شدند');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting()) // فعال‌سازی فوری
  );
});

// ۲. پاک کردن کش‌های قدیمی و خراب
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim()) // کنترل فوری صفحات باز
  );
});

// ۳. مدیریت درخواست‌ها (استراتژی هوشمند)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // اگر در کش بود، همان را فوراً برگردان (سریع‌ترین حالت)
      if (cached) return cached;

      // اگر در کش نبود، از شبکه بگیر
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // 🚨 اگر آفلاین بود و صفحه اصلی درخواست شد، صفحه کش‌شده را برگردان
        if (event.request.mode === 'navigate' || event.request.url.endsWith('.html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});