import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';

// 1. Control inmediato del ciclo de vida del Service Worker
self.skipWaiting();
clientsClaim();

// 2. Precache y limpieza de cachés obsoletas mediante Workbox
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// 3. Estrategia de navegación SPA offline
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// 4. Manejador de eventos PUSH del sistema operativo / navegador
self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      try {
        const rawText = event.data.text();
        payload = {
          title: 'Camiones Caídos — Notificación',
          body: rawText || 'Actualización en el sistema de flota.'
        };
      } catch {
        payload = {
          title: 'Camiones Caídos — Notificación',
          body: 'Actualización en el estado operativo de camiones en campo.'
        };
      }
    }
  }

  // Sanitización estricta de título y cuerpo
  const rawTitle = typeof payload.title === 'string' ? payload.title.trim() : '';
  const title = rawTitle || 'Camiones Caídos — Notificación';

  const rawBody = typeof payload.body === 'string' ? payload.body.trim() : '';
  const body = rawBody || 'Actualización en el estado operativo de camiones en campo.';

  const icon = payload.icon || '/pwa-192x192.png';
  const badge = payload.badge || '/favicon.svg';
  const tag = payload.tag || 'shift-carryover-alert';

  // Sanitización estricta de la URL de destino (solo rutas relativas al origen de la PWA)
  let targetUrl = '/';
  if (payload.data && typeof payload.data.url === 'string') {
    const rawUrl = payload.data.url.trim();
    if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
      targetUrl = rawUrl;
    }
  }

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    data: {
      url: targetUrl,
      receivedAt: Date.now(),
      ...(typeof payload.data === 'object' && payload.data !== null ? payload.data : {})
    },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    (async () => {
      // Detección de ventana activa en primer plano (Foreground)
      let isForeground = false;
      try {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        isForeground = clientList.some((client) => client.focused || client.visibilityState === 'visible');
      } catch {
        // Fallback no bloqueante
      }

      // Si la aplicación ya está visible en primer plano, el usuario experimenta el Toast de Supabase Realtime.
      // Para evitar saturación sonora/vibratoria sin infringir la regla obligatoria userVisibleOnly de Chromium,
      // la notificación nativa se emite en modo silencioso sin vibración.
      if (isForeground) {
        notificationOptions.silent = true;
        delete notificationOptions.vibrate;
      }

      return self.registration.showNotification(title, notificationOptions);
    })()
  );
});

// 5. Manejador de clics en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Validación de seguridad de URL (defensa en profundidad)
  let targetPath = '/';
  if (event.notification.data && typeof event.notification.data.url === 'string') {
    const rawPath = event.notification.data.url.trim();
    if (rawPath.startsWith('/') && !rawPath.startsWith('//')) {
      targetPath = rawPath;
    }
  }

  // Enriquecer URL con metadatos operacionales si están presentes
  const notifData = event.notification.data || {};
  const truckId = notifData.truck_id || (Array.isArray(notifData.truck_ids) ? notifData.truck_ids[0] : null);
  if (truckId && targetPath === '/') {
    const params = new URLSearchParams();
    params.set('truck_id', String(truckId).trim());
    if (notifData.mine) params.set('mine', String(notifData.mine).trim());
    if (notifData.shift) params.set('shift', String(notifData.shift).trim());
    if (notifData.operational_date) params.set('date', String(notifData.operational_date).trim());
    const query = params.toString();
    if (query) {
      targetPath = `/?${query}`;
    }
  }

  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Si existe una ventana del mismo origen, enfocarla y navegar si corresponde
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && client.url !== targetUrl) {
            client.navigate(targetUrl);
          } else if ('postMessage' in client) {
            client.postMessage({
              type: 'OPERATIONAL_NOTIFICATION_CLICK',
              truck_id: truckId,
              mine: notifData.mine,
              shift: notifData.shift,
              date: notifData.operational_date
            });
          }
          return client.focus();
        }
      }
      // 2. Si no hay ninguna ventana abierta, abrir una nueva en el origen validado
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 6. Manejador de cambio de suscripción (pushsubscriptionchange)
// Nota: Soportado de forma heterogénea entre navegadores (Firefox / Chromium reciente).
// Difunde el evento a las ventanas activas para que re-sincronicen de forma segura.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
      }
    })
  );
});
