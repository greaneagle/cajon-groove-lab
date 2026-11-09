const CACHE = 'cajon-groove-shell-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './audio-ml.js', './detector-worklet.js', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))), self.clients.claim()]));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok && response.type === 'basic') { const copy=response.clone(); caches.open(CACHE).then(cache => cache.put(new URL('index.html',self.registration.scope), copy)); }
      return response;
    }).catch(() => caches.match(new URL('index.html',self.registration.scope))));
  } else {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
