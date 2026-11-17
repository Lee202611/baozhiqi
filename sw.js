// 保质期管家 Service Worker
// 策略：网络优先（保证更新立即生效），失败时回退缓存（离线可用）
const CACHE = 'baozhiqi-v1';
const CORE = ['/', '/baozhiqi/', '/baozhiqi/index.html', '/baozhiqi/manifest.webmanifest', '/baozhiqi/icon-192.png', '/baozhiqi/icon-512.png'];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE).catch(function(){}); }));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  // 只处理同源
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(function(res){
      // 拿到新内容就更新缓存
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req, copy).catch(function(){}); });
      return res;
    }).catch(function(){
      // 断网/失败 -> 用缓存
      return caches.match(req).then(function(cached){
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('/baozhiqi/index.html');
        return Response.error();
      });
    })
  );
});
