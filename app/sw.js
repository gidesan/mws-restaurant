import { LocalDBHelper } from './scripts/localdbhelper';
import { DBHelper } from './scripts/dbhelper';

const staticCacheName = 'rr-static-v1';
const contentImgsCache = 'rr-content-imgs';
const allCaches = [
  staticCacheName,
  contentImgsCache
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      return cache.addAll([
        'index.html',
        'restaurant.html',
        'scripts/bundle.js',
        'scripts/bundle-detail.js',
        'styles/styles.css'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName.startsWith('rr-') && !allCaches.includes(cacheName);
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('sync', (event) => {
  if (!event || !event.tag || !event.tag.includes('syncReview')) {
    return;
  }
  const reviewId = Number(event.tag.split('_')[1]);

  const syncReview = LocalDBHelper
    .getReview(reviewId)
    .then(enqueuedReview => {
      return DBHelper
        .createReview(enqueuedReview)
        .then(res => {
          return LocalDBHelper.dequeueReview(enqueuedReview);
        });
    })

  event.waitUntil(syncReview);
});

self.addEventListener('fetch', function(event) {
  const urlString = event.request.url;
  const requestUrl = new URL(urlString);

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('index.html'));
      return;
    }
    else if (requestUrl.pathname.startsWith('/images/')) {
      event.respondWith(servePhoto(event.request));
      return;
    }
  }
  const urlStringWithoutParams = urlString.includes('?') ? urlString.replace(/\?(.)*$/, '') : urlString;

  event.respondWith(
    caches.match(urlStringWithoutParams).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

function servePhoto(request) {
  const storageUrl = request.url.replace(/-\d+px\.jpg$/, '');

  return caches.open(contentImgsCache).then(function(cache) {
    return cache.match(storageUrl).then(function(response) {
      if (response) return response;

      return fetch(request).then(function(networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}
