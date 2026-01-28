const CACHE_NAME = 'kodama-cache-v3'; // バージョンを v3 に上げる
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/script.js',
    './imgs/home-bg.png'
];

// インストール時にファイルをキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

// 【追加】古いキャッシュを自動で削除する（これが重要！）
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('古いキャッシュを削除しました:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 【修正】ネットワークを優先し、ダメな時だけキャッシュを使う（Network First）
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // ネットワークが成功したらキャッシュに保存して返す
                const resClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, resClone);
                });
                return response;
            })
            .catch(() => {
                // オフラインの時だけキャッシュを返す
                return caches.match(event.request);
            })
    );
});