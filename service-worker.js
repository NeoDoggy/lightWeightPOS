const CACHE_NAME = 'lw-pos-cache-v1';
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
    './src/core/dataExchange.js',
    './src/components/Sidebar.js',
    './src/components/ProductGrid.js',
    './src/components/Cart.js',
    './src/components/Dashboard.js',
    './src/components/Settings.js'
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
    // Ignore external requests (like FontAwesome or external APIs)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // Return from cache immediately
            }

            // If not in cache, fetch from network and add to cache dynamically
            return fetch(event.request).then((networkResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            }).catch(() => {
                // Optional: Return a specific offline fallback page here if needed
                console.error('[Service Worker] Network request failed and not in cache:', event.request.url);
            });
        })
    );
});