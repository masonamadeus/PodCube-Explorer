// BUMPED TO v2 to force users to download the new caching rules!
const CACHE_NAME = 'podcube-explorer-v3.2';

// Detect if we are running locally
const isLocalhost = Boolean(
    self.location.hostname === 'localhost' ||
    self.location.hostname === '[::1]' ||
    self.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

self.addEventListener('install', (event) => {
    // Skip installation caching if local, otherwise cache core files
    if (!isLocalhost) {
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.addAll([
                    // ROOT
                    './',
                    './index.html',
                    './explorer.css',
                    './explorer.js',
                    './PodCube.js',
                    './degradation.js',
                    './playlist-sharing.js',

                    // PODUSER
                    './poduser/poduser.js',
                    './poduser/profile-ui.js',
                    './poduser/achievements.js',
                    './poduser/bingbong_hilo-3.mp3',
                    './poduser/Bonk-2.mp3',
                    './poduser/Buzz-3.mp3',

                    // INTERACTIVE
                    './interactive/interactive.js',
                    './interactive/interactive.css',
                    './interactive/games/active-games.json',

                    // INTERACTIVE => BASE GAMES
                    './interactive/games/quiz.js',
                    './interactive/games/snake.js',
                    './interactive/games/datadash.js',
                    './interactive/games/bouncingbox.js',

                    // LIBRARIES
                    './libraries/html2canvas.min.js',
                    './libraries/jsQR.min.js',
                    './libraries/qrcode.min.js',
                    
                    // IMAGES
                    './favicon.png',
                    './PODCUBE.png',
                    './CLEAN-LOGO.png'
                ]);
            })
        );
    }
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // Development Mode: Bypass cache completely
    if (isLocalhost) {
        event.respondWith(fetch(event.request));
        return;
    }

    const url = new URL(event.request.url);

    // ===================================================================
    // THE FIREWALL: Exclude External Traffic (Pinecast, Analytics, Audio)
    // ===================================================================
    // If the request is NOT going to our own domain, bypass the cache entirely.
    if (!url.origin.includes(self.location.hostname)) {
        event.respondWith(fetch(event.request));
        return;
    }

    // ===================================================================
    // INTERNAL TRAFFIC: Cache-first, fallback to network + Dynamic Caching
    // ===================================================================
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Serve the App Shell from cache if we have it
            if (cachedResponse) {
                return cachedResponse;
            }

            // Otherwise, fetch it normally (The browser will automatically 
            // manage its own HTTP cache for images and dynamic media here!)
            return fetch(event.request);
        })
    );
});

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});
