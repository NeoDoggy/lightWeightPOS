const CACHE_NAME = 'lwPosCache-v1.1.1';
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './src/main.js',
    './src/styles/variables.css',
    './src/styles/layouts.css',
    './src/styles/components.css',
    './src/core/store.js',
    './src/core/logger.js',
    './src/core/i18n.js',
    './src/core/db.js',
    './src/core/dialog.js',
    './src/core/toast.js',
    './src/core/dataExchange.js',
    './src/components/Sidebar.js',
    './src/components/ProductGrid.js',
    './src/components/Cart.js',
    './src/components/Dashboard.js',
    './src/components/Settings.js',
    './src/components/Onboarding.js'
];

// Install Event: Cache all core assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching Core Assets');
            return cache.addAll(CORE_ASSETS);
        })
    );
});

// Activate Event: Clean up old caches if the version bumps
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing Old Cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Fetch Event: Cache-First Strategy
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse; 

            return fetch(event.request).then((networkResponse) => {
                // Ignore bad responses
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                console.warn('[Service Worker] Network offline:', event.request.url);
            });
        })
    );
});