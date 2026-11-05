const FAVICON_CACHE = 'homepage-favicons-v2';

self.addEventListener('install', function (event) {
  // 不等待旧页面关闭，首次注册后即可进入激活流程。
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  // 接管当前已打开的页面，避免必须再刷新一次才能拦截图标请求。
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(function (keys) {
      return Promise.all(keys
        .filter(function (key) { return key.indexOf('homepage-favicons-') === 0 && key !== FAVICON_CACHE; })
        .map(function (key) { return caches.delete(key); }));
    })
  ]));
});

function isFaviconRequest(request) {
  if (request.method !== 'GET' || request.destination !== 'image') return false;
  try {
    const url = new URL(request.url);
    return url.pathname === '/favicon.ico';
  } catch (e) {
    return false;
  }
}

self.addEventListener('fetch', function (event) {
  if (!isFaviconRequest(event.request)) return;

  event.respondWith(
    caches.open(FAVICON_CACHE).then(function (cache) {
      return cache.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (response) {
          // 跨域 favicon 常是 opaque 响应；它们可以安全地原样写入 Cache Storage。
          if (response && (response.ok || response.type === 'opaque')) {
            cache.put(event.request, response.clone()).catch(function () {});
          }
          return response;
        });
      });
    })
  );
});
