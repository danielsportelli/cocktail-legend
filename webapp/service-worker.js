// ═══════════════════════════════════════════════════
// SERVICE WORKER — Cocktail Legend PWA
// ═══════════════════════════════════════════════════
const CACHE_NAME = 'cocktail-legend-v1';

// File da cachare per uso offline
const CACHE_FILES = [
  '/cocktail-legend/webapp/cocktail-legend.html',
  '/cocktail-legend/webapp/css/css.css',
  '/cocktail-legend/webapp/js/js.js',
  '/cocktail-legend/webapp/js/firebase-init.js',
  '/cocktail-legend/webapp/quiz.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Syne:wght@700;800&display=swap'
];

// Installazione — cacha i file principali
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES).catch(function(err) {
        console.warn('Cache parziale:', err);
      });
    })
  );
  self.skipWaiting();
});

// Attivazione — rimuovi cache vecchie
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch — Network first, fallback cache
self.addEventListener('fetch', function(event) {
  // Ignora richieste Firebase/API (sempre online)
  if (
    event.request.url.includes('firestore') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('googleapis.com/v1') ||
    event.request.url.includes('anthropic')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Salva in cache una copia fresca
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        // Offline → servi dalla cache
        return caches.match(event.request);
      })
  );
});
