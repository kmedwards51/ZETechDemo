// Check if service worker is supported
// Register the service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(error => {
            console.log('Service Worker registration failed:', error);
        });
    });

    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
            // Show SweetAlert2 popup when a new version is available
            Swal.fire({
                title: 'New Version Available',
                text: event.data.message,
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#ffcc00',  
                cancelButtonColor: '#ff6600',  
                confirmButtonText: 'Refresh',
                cancelButtonText: 'Cancel',
                background: '#333',  
                color: '#fff',        
                customClass: {
                  confirmButton: 'swal-confirm-button',
                  cancelButton: 'swal-cancel-button'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    // User clicked "Refresh"
                    location.reload();  // Reload the page to apply the new version
                } else {
                    // User clicked "Cancel", do nothing
                    console.log('User canceled the update.');
                }
            });
        }
    });
}

// Handle Android 'beforeinstallprompt' event
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt event fired');
    e.preventDefault();
    deferredPrompt = e;
});

// Detect iOS
const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};

// Is App installed
const isAppInstalled = () => {
    return (
        ('standalone' in window.navigator && window.navigator.standalone) || 
        window.matchMedia('(display-mode: standalone)').matches
    );
};

// Opened in PWA
function isPwa() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('source') === 'pwa';
  }
  
// Example usage
if (isPwa()) {
    console.log("The page was opened as a PWA");
} else {
    console.log("The page was opened in a regular browser tab");
// TO DO: Check if subscribed to push, get the subscribers Id from indexedDB and retrieve the subscription details from the DB and send them a service worker push to prompt them to open the PWA instead
}  

var db;
function loadDexie() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/dexie@latest/dist/dexie.min.js';
      script.onload = () => {
        console.log('Dexie.js has been loaded');
        resolve();  // Resolve the promise once Dexie.js is loaded
      };
      script.onerror = () => {
        console.error('Failed to load Dexie.js');
        reject(new Error('Failed to load Dexie.js'));
      };
      document.head.appendChild(script);  // Append the script to the document
    });
  }
  
  // Setup IndexedDB cache:
  loadDexie().then(() => {
    // Dexie is loaded, you can now use it
    db = new Dexie('ZeTechWebPushDB');
    db.version(1).stores({
        subscribers: '++id, subscriberId'
    });
  
    // Continue with your Dexie code here
  }).catch(error => {
    console.error('Error loading Dexie.js:', error);
  });

// Expose functions
window.isAppInstalled = isAppInstalled;
window.isPushSubscribed = async function() {
    const registration = await navigator.serviceWorker.ready;
    return await checkPushSubscriptionStatus(registration);
};
window.isIosDevice = isIos;

// App Install & Subscribe Push Status
let resultAppInstall = false;
let resultSubscribeToPush = false;
let isSubscribed = false;

// Dynamic element creation function
function createDynamicElement(options) {

    const {
        type = 'button',
        location = '.content-container',
        position = 'relative',
        style = {},
        text = '',
        size = { width: 'auto', height: 'auto' },
        imageUrl = '',
        action = 'none',
        redirectUrl = ''
    } = options;

    const targetElement = document.querySelector(location);
    if (!targetElement) {
        console.error(`Element not found: ${location}`);
        return;
    }

    let element;   

    if (type === 'button') {
        element = document.createElement('button');
        element.innerText = text;
        element.style.cursor = 'pointer';
    } else if (type === 'image') {
        element = document.createElement('img');
        element.src = imageUrl;
        element.alt = text;
        element.style.width = size.width;
        element.style.height = size.height;
        element.style.cursor = 'pointer';
    } else {
        console.error('Unsupported element type');
        return;
    }

    element.style.display = 'none';

    Object.keys(style).forEach((key) => {
        element.style[key] = style[key];
    });

    element.style.position = position;
    targetElement.appendChild(element);

    // Store the action and redirectUrl as data attributes
    element.dataset.action = action;
    element.dataset.redirectUrl = redirectUrl;

    // For IOS, the app needs to be installed to allow user to subscribe to push, so change action to pwaInstallAndSubscribe
    if (isIos && (action === 'pwaSubscribe')) {
        action = 'pwaInstallAndSubscribe'
    }

    if (action === 'pwaSubscribe' || action === 'pwaInstallAndSubscribe') {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(async registration => {
                console.log("Checking Subscription Status");
                isSubscribed = await checkPushSubscriptionStatus(registration);
                console.log('Subscribed to push notifications: ', isSubscribed);
                // Check if the element should be hidden based on installation status and subscription status
                if (isAppInstalled() && isSubscribed) {
                    element.style.display = 'none';
                } 
                else if ((isIos() && !isSubscribed && isAppInstalled()) || (!isIos() && !isSubscribed)) {
                    if(isIos()) {
                        element.src = 'FreeBurgerSignup.png';
                    }
                    element.style.display = 'block';
                    // Show a SweetAlert popup asking the user to allow push notifications with the logo
                    Swal.fire({
                        title: '<img src="Burgers4ULogo.png" alt="Burgers4U Logo" style="width: 100px; margin-bottom: 20px;"><br>Sign up to get your FREE Burger',
                        text: 'Sign up to get your FREE burger voucher code and receive future hot deals and special offers 🍔😋',
                        showCancelButton: true,
                        confirmButtonColor: '#ffcc00',  // Match the share button color
                        cancelButtonColor: '#ff6600',   // Match the floating button color
                        confirmButtonText: 'Yes, Sign Me Up!',
                        cancelButtonText: 'No, Thanks',
                        background: '#333',  // Dark background to match the page
                        color: '#fff',        // White text for contrast
                        customClass: {
                            confirmButton: 'swal-confirm-button',
                            cancelButton: 'swal-cancel-button'
                        }
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            if (!isAppInstalled() && !isIos()) {
                                resultAppInstall = await triggerPwaInstall();
                                if (resultAppInstall) {
                                    element.style.display = 'none';
                                    // Create and dispatch the app installed event
                                    const appInstallEvent = new CustomEvent('appInstalled', {
                                        detail: { element }
                                    });
                                    window.dispatchEvent(appInstallEvent);
                                }
                            }
                            // Trigger push subscription after the user confirms
                            resultSubscribeToPush = await subscribeToPushNotifications();                            
                            if (resultSubscribeToPush) {
                                Swal.fire({
                                    title: '<img src="Burgers4ULogo.png" alt="Burgers4U Logo" style="width: 100px; margin-bottom: 20px;"><br>Thank You!',
                                    text: 'Your FREE burger voucher code is ready and you will be the first to know about our future hot deals and offers 😋 Enjoy your burger! 🍔',                                   
                                    confirmButtonColor: '#ffcc00',
                                    customClass: {
                                        confirmButton: 'swal-confirm-button'
                                    },
                                    background: '#333',  // Dark background to match the page
                                    color: '#fff',        // White text for contrast
                                }).then((result) => {
                                    if (result.isConfirmed) {
                                        // Execute actions after the confirm button is clicked
                                        element.style.display = 'none';
                                        sendPushMessageToServiceWorker("Thank you 👍", "Click to see your FREE Double Decker Burger 🍔 Voucher Code 😋", "/");
                                        
                                        // Create a new CustomEvent with the element in the detail property
                                        const pushSubscribeEvent = new CustomEvent('pushSubscribed', {
                                            detail: { element }
                                        });                                        
                                        // Dispatch the push subscribed event
                                        window.dispatchEvent(pushSubscribeEvent);
                                    }
                                });
                            }
                             else {
                                // Show an error if the subscription fails
                                Swal.fire({
                                    title: '<img src="Burgers4ULogo.png" alt="Burgers4U Logo" style="width: 100px; margin-bottom: 20px;"><br>Subscription Failed',
                                    text: 'There was an issue subscribing to push notifications. Please try again later.',
                                    icon: 'error',
                                    confirmButtonColor: '#ffcc00',
                                    customClass: {
                                        confirmButton: 'swal-confirm-button'
                                    },
                                    background: '#333',  // Dark background to match the page
                                    color: '#fff',        // White text for contrast
                                });
                            }
                        }
                    });
                }                               
                else {
                    element.style.display = 'block';
                }
            }).catch(error => {
                console.error('Service Worker ready error:', error);
                element.style.display = 'block';
            });
        }
    } 
    else if (action === 'pwaInstall') {
        // Check if the element should be hidden based on installation status
        if (isAppInstalled()) {
            element.style.display = 'none';
        } else {
            element.style.display = 'block';
        }
    } 
    else if (action === 'redirect' || action === 'pwaPageRedirect') {      
        element.style.display = 'block';
    }

    element.addEventListener('click', () => {
        handleAction(action, redirectUrl, element);
    });

    return element;
}

function showInstallPrompt() {
    Swal.fire({
        html: `
            <div class="swal2-content">
                <p>To get your FREE burger voucher code, install our web app by tapping <img src="iPhoneShare.png" alt="Share Icon" class="share-icon"> and clicking "Add to Home Screen". Then, open the app from your home screen and sign up when prompted 😉🍔</p>
            </div>
        `,
        confirmButtonText: 'OK',
        confirmButtonColor: '#ffcc00',
        position: 'bottom',  // Position the Swal at the bottom of the page
        showConfirmButton: true,  // Display the "OK" button
        customClass: {
            popup: 'swal2-bottom-popup',
            confirmButton: 'swal-confirm-button'
        }
    });
}

async function handleAction(action, redirectUrl, element) {

    action = element.dataset.action;
    redirectUrl = element.dataset.redirectUrl;

    if (isIos()) {
        if (action === 'pwaInstallAndSubscribe' && !isAppInstalled()) {
            document.getElementById('ios-install-prompt').style.display = 'block';
            //showInstallPrompt();
            return;
        }
    }

    switch (action) {
        case 'pwaInstall':
            if (!isAppInstalled()) {
                resultAppInstall = await triggerPwaInstall();
                if (resultAppInstall) {
                    element.style.display = 'none';
                    // Create and dispatch the app installed event
                    const appInstallEvent = new CustomEvent('appInstalled', {
                        detail: { element }
                    });
                    window.dispatchEvent(appInstallEvent);
                }
            }
            break;
        case 'pwaSubscribe':
            if(!isSubscribed) {
                resultSubscribeToPush = await subscribeToPushNotifications();
                if (resultSubscribeToPush) {
                    element.style.display = 'none';
                    sendPushMessageToServiceWorker("Thank you 👍", "Click to see your FREE Double Decker Burger 🍔 Voucher Code 😋", "/");
                    // Create a new CustomEvent with the element in the detail property
                    const pushSubscribeEvent = new CustomEvent('pushSubscribed', {
                        detail: { element }
                    });
                    // Dispatch the push subscribed event
                    window.dispatchEvent(pushSubscribeEvent);
                }
            }
            break;
        case 'pwaInstallAndSubscribe':
            if (!isAppInstalled()) {
                resultAppInstall = await triggerPwaInstall();
                if (resultAppInstall) {
                    // Create and dispatch both events
                    const appInstallEvent = new CustomEvent('appInstalled', {
                        detail: { element }
                    });
                    window.dispatchEvent(appInstallEvent);
                }
            }
            if(!isSubscribed) {
                resultSubscribeToPush = await subscribeToPushNotifications();
                if (resultSubscribeToPush) {
                    // Create and dispatch both events
                    const pushSubscribeEvent = new CustomEvent('pushSubscribed', {
                        detail: { element }
                    });
                    window.dispatchEvent(pushSubscribeEvent);
                }
                if (resultAppInstall && resultSubscribeToPush || isAppInstalled() && resultSubscribeToPush) {
                    sendPushMessageToServiceWorker("Thank you 👍", "Click to see your FREE Double Decker Burger 🍔 Voucher Code 😋", "/");
                    element.style.display = 'none';                
                } 
                else {
                    element.style.display = 'block';
                }
            }
            break;
        case 'redirect':
            if (redirectUrl) {
                window.open(redirectUrl, '_blank');
            }
            break;
        case 'pwaPageRedirect':
            if (redirectUrl) {
                window.location.href = redirectUrl;
            }
            break;
        default:
            console.error('Unsupported action');
    }
}

function triggerPwaInstall() {
    return new Promise((resolve) => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    resolve(true); // Resolve the promise with true if accepted
                } else {
                    resolve(false); // Resolve the promise with false if dismissed
                }
                deferredPrompt = null;
            });
        } else {
            console.log('PWA install prompt not available');
            resolve(false); // Resolve with false if prompt is not available
        }
    });
}

function subscribeToPushNotifications() {
    return new Promise((resolve) => {
        if (!('serviceWorker' in navigator)) {
            console.error('Service Workers not supported');
            return resolve(false); // Resolve with false if Service Workers are not supported
        }

        if (!('PushManager' in window)) {
            console.error('Push API not supported');
            return resolve(false); // Resolve with false if Push API is not supported
        }

        navigator.serviceWorker.ready.then(registration => {
            console.log('Service Worker is ready:', registration);

            Notification.requestPermission().then(permission => {
                console.log('Notification permission status:', permission);
                if (permission !== 'granted') {
                    console.error('Permission not granted for notifications');
                    return resolve(false); // Resolve with false if permission is not granted
                }
                const applicationServerKey = urlB64ToUint8Array('BKS_v2_cNXlCC7UH3mY2RO1AcO5psuQ_9Ei_ctW3MInVLp-UbPFF-Zygdugx0GvhaJvNneuquB3lhiTJD_xtuUc');
                registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey
                }).then(subscription => {
                    console.log('Successfully subscribed to push notifications:', subscription);
                    sendSubscriptionToBackend(subscription);
                    resolve(true); // Resolve with true if the subscription is successful
                    // Send the subscription to your server
                }).catch(error => {
                    console.error('Subscription failed:', error);
                    resolve(false); // Resolve with false if the subscription fails
                });
            }).catch(error => {
                console.error('Error requesting notification permission:', error);
                resolve(false); // Resolve with false if permission request fails
            });
        }).catch(error => {
            console.error('Service Worker ready error:', error);
            resolve(false); // Resolve with false if Service Worker is not ready
        });
    });
}

// Send subscription details to the backend
async function sendSubscriptionToBackend(subscription) {
    const geolocationOptIn = true;
    const softOptIn = true;
    const userAgent = getUserAgentData();
    const appInstalled = isAppInstalled();
    const locationId = 1;
  
    try {
      const response = await fetch('https://webpushapi.zetechgroup.co.uk/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ac54d0e1-7d80-11ef-9b7d-005056387bc5'
        },
        body: JSON.stringify({
          subscription,
          geolocationOptIn,
          softOptIn,
          userAgent,
          appInstalled,
          locationId
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to send subscription to backend');
      }
  
      const responseData = await response.json();
      const subscriberId = responseData.subscriberId;
      const message = responseData.message;
  
      // Cache the subscriberId in IndexedDB using Dexie
      await db.subscribers.put({
        subscriberId
      });
  
      // Log success message with subscriberId and response message
      console.log(`Subscription sent to backend successfully. SubscriberId: ${subscriberId}, Message: ${message}`);
  
    } catch (error) {
      console.error('Failed to send subscription to backend:', error);
    }
  }

// Function to capture detailed user agent information
function getUserAgentData() {
    const userAgent = navigator.userAgent;
     
    // Detect if the device is mobile or tablet
    const isMobile = /Mobi|Android/i.test(userAgent);
    const isTablet = /Tablet|iPad/i.test(userAgent);
  
    // Detect specific device type
    const deviceType = (() => {
      if (/Android/i.test(userAgent)) return 'Android';
      if (/iPhone/i.test(userAgent)) return 'iPhone';
      if (/iPad/i.test(userAgent)) return 'iPad';
      if (/Macintosh/i.test(userAgent) && 'ontouchend' in document) return 'iOS'; // Detect iOS on Mac with touch support
      if (/Macintosh/i.test(userAgent)) return 'Mac';
      if (/Windows/i.test(userAgent)) return 'Windows PC';
      if (/Linux/i.test(userAgent)) return 'Linux';
      return 'Unknown Device';
    })();
  
    // Detect operating system
    const os = (() => {
      if (/Android/i.test(userAgent)) return 'Android';
      if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
      if (/Windows NT/i.test(userAgent)) return 'Windows';
      if (/Macintosh/i.test(userAgent)) return 'MacOS';
      if (/Linux/i.test(userAgent)) return 'Linux';
      return 'Unknown OS';
    })();
  
    // Detect browser
    const browser = (() => {
      if (userAgent.indexOf("Firefox") > -1) return "Firefox";
      if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) return "Opera";
      if (userAgent.indexOf("Chrome") > -1) return "Chrome";
      if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1) return "Safari"; // Exclude Chrome from Safari detection
      if (userAgent.indexOf("MSIE") > -1 || !!document.documentMode) return "Internet Explorer";
      if (userAgent.indexOf("Edg") > -1) return "Edge"; // Detect modern Edge (Chromium-based)
      return "Unknown Browser";
    })();
  
    // Determine device category (Mobile, Tablet, or Desktop)
    const deviceCategory = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop';
  
    // Return the collected user agent information
    return {
      device: deviceType,    // Specific device type (e.g., iPhone, Android, etc.)
      os: os,                // Operating system (e.g., Android, iOS, Windows, etc.)
      browser: browser,      // Browser type (e.g., Chrome, Firefox, Safari, etc.)
      deviceCategory: deviceCategory  // General device category (Mobile, Tablet, Desktop)
    };
  }
  

// Helper function for converting VAPID key
function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return new Uint8Array(rawData.split('').map(char => char.charCodeAt(0)));
}

// Function to check if the user is already subscribed to push notifications
function checkPushSubscriptionStatus(registration) {
    return new Promise((resolve, reject) => {
        registration.pushManager.getSubscription().then(subscription => {
            if (subscription) {
                resolve(true); // Resolve with true if already subscribed
            } else {
                console.log('User is not subscribed to push notifications');
                resolve(false); // Resolve with false if not subscribed
            }
        }).catch(error => {
            console.error('Failed to get push subscription:', error);
            reject(error); // Reject the promise if an error occurs
        });
    });
}

function sendPushMessageToServiceWorker(title, message, url = null) {
    // Prepare the message object to send
    const messageData = {
        type: 'SEND_PUSH_MESSAGE',
        title: title,
        message: message,
    };

    // Optionally include the URL if it's provided
    if (url) {
        messageData.url = url;
    }

    // Check if the service worker is controlling the page
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(messageData);
    } else {
        // Wait for the service worker to take control if it's not already
        navigator.serviceWorker.ready.then(registration => {
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage(messageData);
            } else {
                console.error('Service Worker is still not controlling the page.');
            }
        }).catch(error => {
            console.error('Service Worker ready error:', error);
        });
    }
}



