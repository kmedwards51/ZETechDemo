const CACHE_NAME = 'pwa-wrapper-cache-v8';
const urlsToCache = [
    '/',
    '/index.html',
    '/redemption.html',
    '/order.html',
    '/styles.css',
    '/manifest.json',
    '/images/icon/icon-192x192.png',
    '/images/icon/icon-512x512.png',
    '/iPhoneShare.png',
    '/app.js'
];

// Install event: Caches the initial assets
self.addEventListener('install', event => {
    self.skipWaiting(); // Forces the service worker to activate immediately after installation
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        })
    );
});

// Fetch event: Implements cache-then-network strategy for GET requests only
self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                // Fetch the resource from the network in the background
                const networkFetch = fetch(event.request).then(async networkResponse => {
                    const cache = await caches.open(CACHE_NAME);
                    // Update the cache with the new response
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });

                // Return the cached response if available, otherwise use network fetch
                return cachedResponse || networkFetch;
            })
        );
    } else {
        // For POST or other non-GET requests, just fetch from the network without caching
        event.respondWith(fetch(event.request));
    }
});

// Handle push notifications
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
  
    const title = data.title || 'New Message';
    const options = {
      body: data.body || 'New Message',
      icon: data.icon || 'images/icon/icon-192x192.png',
      badge: 'images/icon/icon-192x192.png',
      image: data.image || null,  // URL of the image to be displayed
      data: {
        // url: data.url || '/'
        url: data.url
      },
      actions: data.actions || []  // Add actions from the payload
    };
  
    event.waitUntil(self.registration.showNotification(title, options));
  });

// Activate event to remove old caches, claim control, and notify clients
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME]; 
    console.log('Activating new service worker...');
  
    event.waitUntil(
      // Check if any old caches exist before proceeding
      caches.keys().then(async cacheNames => {
        const hasOldCaches = cacheNames.length > 0; // Check if there are existing caches (meaning this is not the first time the SW is activating)
        
        await Promise.all(
              cacheNames.map(cacheName => {
                  if (!cacheWhitelist.includes(cacheName)) {
                      console.log('Deleting old cache:', cacheName);
                      return caches.delete(cacheName);
                  }
              })
          );
          console.log('Claiming clients for new service worker...');
          clients.claim();
          // If this is not the first activation (i.e., old caches were present), notify clients
          if (hasOldCaches) {
              console.log('Notifying clients about new version...');
              return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
                  for (const client of clients) {
                      console.log('Sending message to client:', client);
                      client.postMessage({
                          type: 'NEW_VERSION_AVAILABLE',
                          message: 'A new version of the app is available. Please refresh the page.'
                      });
                  }
              });
          } else {
              console.log('First service worker activation, suppressing version notification.');
          }
      })
    );
  });  

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  const action = event.action;  // The action identifier from the button clicked
  const notification = event.notification;
  const urlToOpen = notification.data.url ? new URL(notification.data.url, self.location.origin).href : null;  // Full URL or null if not provided

  event.waitUntil(
    (async () => {
      if (!urlToOpen) {
        // If no URL is provided, close the notification and do nothing else
        console.log('No URL provided, doing nothing.');
        notification.close();
        return;
      }

      // Get all clients (open windows/tabs of the PWA)
      const allClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      let matchingClient = null;

      // Check if any client matches the URL to open
      for (const client of allClients) {
        const clientUrl = new URL(client.url).href;
        if (clientUrl === urlToOpen) {
          matchingClient = client;
          break;
        }
      }

      if (matchingClient) {
        // If a matching client is found, focus on it
        matchingClient.focus();
      } else if (!action || action === '') {
        // If no action was clicked (notification body was clicked), open the URL in a new tab
        await clients.openWindow(urlToOpen);
      } else if (action === 'explore') {
        // If 'Explore Offer' button was clicked, open the URL in a new tab
        await clients.openWindow(urlToOpen);
      } else if (action === 'close') {
        // If 'Dismiss' button was clicked, close the notification
        notification.close();
      }
    })()
  );
});


// Listen for messages from the main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SEND_PUSH_MESSAGE') {
        self.registration.showNotification(event.data.title, {
            body: event.data.message,
            icon: 'images/icon/icon-192x192.png',
            badge: 'images/icon/icon-192x192.png',
            data: {
                url: '/' // Set this to the URL you want to open on notification click
            }
        });
    }
    if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
        // Send a message to all clients (open pages) about the new version
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'NEW_VERSION_AVAILABLE',
                    message: event.data.message || 'A new version of the app is available. Please refresh the page.'
                });
            });
        });
    }
});

