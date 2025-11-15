// Service Worker for Push Notifications
// This file is served from /sw.js and handles push notifications

self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push notification received');
    
    let notificationData = {
        title: 'EuMatter',
        message: 'You have a new notification',
        icon: '/eumatter_logo.png',
        badge: '/eumatter_logo.png',
        tag: 'notification',
        data: {}
    };
    
    if (event.data) {
        try {
            const payload = event.data.json();
            notificationData = {
                title: payload.title || notificationData.title,
                message: payload.message || notificationData.message,
                icon: payload.icon || notificationData.icon,
                badge: payload.badge || notificationData.badge,
                tag: payload.tag || notificationData.tag,
                requireInteraction: payload.requireInteraction || false,
                actions: payload.actions || [],
                data: payload.data || {}
            };
        } catch (e) {
            console.error('[Service Worker] Error parsing push data:', e);
            notificationData.message = event.data.text() || notificationData.message;
        }
    }
    
    const promiseChain = self.registration.showNotification(notificationData.title, {
        body: notificationData.message,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag,
        data: notificationData.data,
        requireInteraction: notificationData.requireInteraction,
        actions: notificationData.actions,
        vibrate: [200, 100, 200],
        timestamp: Date.now()
    });
    
    event.waitUntil(promiseChain);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification clicked');
    
    event.notification.close();
    
    const data = event.notification.data || {};
    const action = event.action;
    
    // Handle action buttons
    if (action === 'accept' && data.eventId) {
        // Open event page and trigger accept action
        event.waitUntil(
            clients.openWindow(`/user/events/${data.eventId}?action=accept`)
        );
    } else if (action === 'view' || !action) {
        // Default: open the URL from data or notifications page
        const url = data.url || '/notifications';
        event.waitUntil(
            clients.openWindow(url)
        );
    }
    
    // Focus existing window if available
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === data.url || client.url.includes('/notifications')) {
                    return client.focus();
                }
            }
            // If no window found, open a new one
            if (clients.openWindow) {
                return clients.openWindow(data.url || '/notifications');
            }
        })
    );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
    console.log('[Service Worker] Notification closed');
});

// Service Worker activation
self.addEventListener('activate', function(event) {
    console.log('[Service Worker] Activated');
    event.waitUntil(
        clients.claim()
    );
});

// Service Worker installation
self.addEventListener('install', function(event) {
    console.log('[Service Worker] Installed');
    self.skipWaiting();
});

