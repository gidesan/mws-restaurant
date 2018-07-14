export class SWHelper {
  static register() { // based on service worker registration in https://github.com/facebook/create-react-app/
    if (!navigator.serviceWorker) {
      return;
    }
    const swUrl = '/sw.js';
    return navigator.serviceWorker
      .register(swUrl)
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content is available; please refresh.');
              } else {
                console.log('Content is cached for offline use.');
              }
            }
          };
        };
        return registration;
      })
      .catch(error => {
        console.error('Error during service worker registration:', error);
      });
  }
}
