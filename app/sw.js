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
  if (!event || !event.tag) {
    return;
  }
  if (event.tag.includes('syncReview')) {
    const reviewId = parseInt(event.tag.split('_')[1]);

    const syncReview = DBHelper
      .getIDBReview(reviewId)
      .then(review => {
        return DBHelper.createReview(review);
      });
    event.waitUntil(syncReview);
  }
  else if (event.tag.includes('syncFavorite')) {
    const args = event.tag.split('_');
    const id = parseInt(args[1]);
    const isFavorite = args[2] === 'true';

    const syncFavorite = DBHelper.updateFavoriteRestaurant(id, isFavorite);
    event.waitUntil(syncFavorite);
  }
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
