/* 保质期管家 Service Worker
   关键原则：install 阶段绝不卡住，保证 WebAPK 能装完 */
const CACHE = 'baozhiqi-v25';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// 安装：逐个缓存，单个失败不影响整体；无论如何都会 activate
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 不等旧SW，立即接管
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      // 用 Promise.allSettled，逐个 add，任何一个失败都不阻断
      return Promise.allSettled(
        CORE.map((url) => cache.add(url).catch(() => null))
      );
    }).then(() => null) // 永远 resolve
  );
});

// 激活：立刻控制所有页面
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

// 请求策略：页面走网络优先（保证更新及时），静态资源缓存兜底
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 导航请求（HTML页面）：网络优先，失败再回缓存
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // 其他资源：缓存优先，没有就网络，拿到再存
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
