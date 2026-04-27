// ═══════════════════════════════════════════════════
// SERVICE WORKER — Cocktail Legend PWA v3.1.27
// ══════════════════════════════════════════════════
const CACHE_NAME = 'cocktail-legend-v3.1.27';

// ── File da pre-cachare all'installazione ──────────
const PRECACHE_FILES = [
  '/cocktail-legend/webapp/cocktail-legend.html',
  '/cocktail-legend/webapp/barman-ai.html',
  '/cocktail-legend/webapp/quiz.html',
  '/cocktail-legend/webapp/spirits-genesis.html',
  '/cocktail-legend/webapp/firebase-init.js',
  '/cocktail-legend/webapp/manifest.json',
  '/cocktail-legend/webapp/database/it/cocktails-it.json',
];

// ── Domini da NON cachare mai (sempre online) ──────
const NETWORK_ONLY = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'googleapis.com/v1',
  'anthropic.com',
  'cloudfunctions.net',
  'daniel-sportelli.workers.dev'
];

// ── Installazione ──────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_FILES).catch(function(err) {
        console.warn('[SW] Pre-cache parziale:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Attivazione — rimuovi cache vecchie ───────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          console.log('[SW] Rimozione cache vecchia:', key);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch — strategia per tipo di risorsa ─────────
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // 1. Network Only — Firebase, API, Anthropic
  var isNetworkOnly = NETWORK_ONLY.some(function(domain) {
    return url.includes(domain);
  });
  if (isNetworkOnly) return;

  // 2. Cache First — immagini e font (cambiano raramente)
  var isCacheFirst = (
    url.includes('/database/it/') ||          // JSON e immagini cocktail
    url.match(/\.(webp|png|jpg|jpeg|svg|ico|woff2|woff|ttf)$/) ||
    url.includes('fonts.gstatic.com') ||
    url.includes('fonts.googleapis.com')
  );

  if (isCacheFirst) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        // Non in cache → scarica e salva
        return fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(function() {
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // 3. Network First con fallback cache — HTML, CSS, JS
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        // Fallback offline per navigazione HTML
        if (event.request.destination === 'document') {
          return caches.match('/cocktail-legend/webapp/cocktail-legend.html');
        }
        return new Response('', { status: 408 });
      });
    })
  );
});