const CACHE_NAME = 'vocab-v2026.09.20-2330'; // 建議每次重大更新時順便改這裡的時間戳記

self.addEventListener('install', (event) => {
  self.skipWaiting(); // 跳過等待，強制安裝新版
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['./', 'index.html', 'manifest.json', 'sw.js']);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(
        keys.map((key) => {
          // 清除所有舊版本的快取
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim()) // 立即接管所有開啟中的分頁
  );
});

self.addEventListener('fetch', (event) => {
  // 針對網頁與主程式，強制採用「網路優先 (Network-First)」
  if (event.request.mode === 'navigate' || event.request.url.endsWith('index.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // 如果網路斷線或失敗，才退回抓取快取
          return caches.match('./') || caches.match('index.html');
        })
    );
  } else {
    // 其他靜態資源維持快取優先，但背景默默更新
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        }).catch(() => {});

        return cachedResponse || fetchPromise;
      })
    );
  }
});