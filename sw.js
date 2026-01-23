const CACHE_NAME = 'come-app-v1';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/script.js',
    './imgs/home-bg.png'
];

// インストール時にファイルをキャッシュに保存
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

// ネットワークがオフラインでもキャッシュから表示
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});