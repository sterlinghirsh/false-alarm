// Reasonable Service Worker for False Alarm Game
// Network-first for HTML, Stale-while-revalidate for assets

const CACHE_NAME = 'false-alarm-v1';
const DEVELOPMENT = location.hostname.includes('replit.dev') || 
                   location.hostname === 'localhost' ||
                   location.hostname === '127.0.0.1';

// Install event - minimal precaching
self.addEventListener('install', (event) => {
  console.log('Service Worker installing with reasonable caching strategy');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - reasonable caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip Socket.io requests
  if (url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // Development mode: Always fetch fresh for HTML
  if (DEVELOPMENT && request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() => {
        console.log('Network failed for HTML, trying cache');
        return caches.match(request);
      })
    );
    return;
  }

  // Network-first for HTML (immediate title/content updates)
  if (request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Stale-while-revalidate for JS/CSS (fast but updates in background)
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Cache-first for images and other assets
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Let other requests pass through normally
});

// Network-first strategy (good for HTML)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale-while-revalidate strategy (good for JS/CSS)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background regardless
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(error => {
    console.log('Background fetch failed for:', request.url);
    return null;
  });

  // Return cached version immediately if available, otherwise wait for network
  if (cachedResponse) {
    return cachedResponse;
  }
  
  return fetchPromise;
}

// Cache-first strategy (good for images)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed for:', request.url);
    throw error;
  }
}