import { supabase } from '../lib/supabase';

/**
 * Convierte una clave pública VAPID en Base64URL a un Uint8Array para el PushManager del navegador.
 */
export function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('Clave VAPID pública inválida o vacía.');
  }

  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detecta si el entorno actual soporta la API de Web Push y Service Workers.
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Detecta si el dispositivo es iOS (iPhone, iPad o iPod).
 */
export function isIOS() {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent || '';
  const isAppleTouch = window.navigator.maxTouchPoints > 1 && /Macintosh/.test(userAgent);
  return /iPad|iPhone|iPod/.test(userAgent) || isAppleTouch;
}

/**
 * Detecta si la aplicación está instalada y ejecutándose en modo Standalone (PWA en pantalla de inicio).
 */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Determina la plataforma del cliente para trazabilidad en push_subscriptions.
 */
export function getDevicePlatform() {
  if (typeof window === 'undefined') return 'unknown';
  const ua = window.navigator.userAgent.toLowerCase();

  if (/android/.test(ua)) return 'android';
  if (isIOS()) return 'ios';
  if (/windows|macintosh|linux/.test(ua)) return 'desktop';
  return 'unknown';
}

/**
 * Retorna el estado actual del permiso de notificaciones en el navegador.
 */
export function getNotificationPermission() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// Acotar esperas técnicas; el diálogo de permiso depende de la decisión del usuario.
const PUSH_TIMEOUT_MS = 5000;
async function waitForPush(promise) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('No se pudo confirmar la operación a tiempo. Revise la conexión e intente nuevamente.')), PUSH_TIMEOUT_MS);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Abortar la espera HTTP no revierte una escritura que el servidor ya haya aceptado.
async function queryPush(query) {
  const controller = new AbortController();
  try {
    return await waitForPush(query.abortSignal(controller.signal));
  } finally {
    controller.abort();
  }
}

async function getPushIdentity(user) {
  const expectedAuthId = user?.authUserId || user?.auth_user_id;
  const { data, error } = await waitForPush(supabase.auth.getSession());
  const authId = data?.session?.user?.id;
  if (error || !user?.id || !expectedAuthId || authId !== expectedAuthId) {
    throw new Error('La sesión cambió o no está disponible. Inicie sesión nuevamente.');
  }
  return authId;
}

export async function getExistingPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await waitForPush(navigator.serviceWorker.ready);
  return await waitForPush(registration.pushManager.getSubscription());
}

// Consultar no solicita permisos, no crea suscripciones y no cambia su propietario.
export async function getPushSubscriptionState(user) {
  if (!isPushSupported()) return { status: 'unsupported' };
  if (isIOS() && !isStandalone()) return { status: 'ios_not_standalone' };
  if (Notification.permission === 'denied') return { status: 'denied' };
  try {
    const authId = await getPushIdentity(user);
    const subscription = await getExistingPushSubscription();
    if (!subscription) return { status: 'inactive' };
    const { data, error } = await queryPush(supabase.from('push_subscriptions')
      .select('user_id, auth_user_id, is_active').eq('endpoint', subscription.endpoint)
      .eq('auth_user_id', authId).maybeSingle());
    if (error) throw new Error('No se pudo verificar la activación en el servidor.');
    const active = Notification.permission === 'granted' && data?.is_active === true
      && data.user_id === user.id && data.auth_user_id === authId;
    return { status: active ? 'active' : 'repair' };
  } catch (err) {
    return { status: 'unknown', message: err.message || 'No se pudo comprobar el estado de las alertas.' };
  }
}

/** Activa solo por una acción explícita del usuario. */
export async function subscribeUserToPush(user) {
  if (!isPushSupported()) return { success: false, code: 'UNSUPPORTED', message: 'Este navegador no es compatible con notificaciones Web Push.' };
  if (isIOS() && !isStandalone()) return { success: false, code: 'IOS_NOT_STANDALONE', message: 'En iPhone, primero agrega la aplicación a la Pantalla de Inicio desde Compartir.' };
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return { success: false, code: 'CONFIG_ERROR', message: 'Falta la configuración del servidor de notificaciones.' };

  try {
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') return { success: false, code: 'PERMISSION_DENIED', message: 'No se concedió el permiso. Puede habilitarlo desde la configuración del navegador.' };
    const authId = await getPushIdentity(user);
    const registration = await waitForPush(navigator.serviceWorker.ready);
    let subscription = await waitForPush(registration.pushManager.getSubscription());
    await getPushIdentity(user);

    if (subscription) {
      const { data, error } = await queryPush(supabase.from('push_subscriptions')
        .select('user_id, auth_user_id').eq('endpoint', subscription.endpoint)
        .eq('auth_user_id', authId).maybeSingle());
      if (error) throw new Error('No se pudo verificar la suscripción existente.');
      if (!data || data.user_id !== user.id || data.auth_user_id !== authId) {
        // No transferir una suscripción de otra cuenta: retirar la del navegador y crear otra.
        await getPushIdentity(user);
        await waitForPush(subscription.unsubscribe());
        if (await waitForPush(registration.pushManager.getSubscription())) {
          throw new Error('No se pudo retirar la suscripción anterior. Intente nuevamente.');
        }
        subscription = null;
      }
    }
    if (!subscription) {
      await getPushIdentity(user);
      subscription = await waitForPush(registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      }));
    }
    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) throw new Error('La suscripción del navegador está incompleta.');
    await getPushIdentity(user);
    const { error } = await queryPush(supabase.from('push_subscriptions').upsert({
      user_id: user.id, auth_user_id: authId, endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh, auth: subJson.keys.auth,
      platform: getDevicePlatform(), user_agent: window.navigator.userAgent.slice(0, 500),
      is_active: true, last_used_at: new Date().toISOString()
    }, { onConflict: 'endpoint' }));
    if (error) throw new Error('La suscripción del navegador existe, pero no se pudo activar en el servidor. Intente nuevamente.');
    const state = await getPushSubscriptionState(user);
    if (state.status !== 'active') throw new Error(state.message || 'No se pudo confirmar la activación de las alertas.');
    return { success: true };
  } catch (err) {
    return { success: false, code: 'SUBSCRIPTION_FAILED', message: err.message || 'No se pudo activar las alertas.' };
  }
}

/** Retira ambos registros; informa cada resultado, incluso cuando solo uno falla. */
export async function unsubscribeUserFromPush(user, pendingEndpoint = null) {
  if (!isPushSupported()) return { success: true };
  let endpoint = pendingEndpoint;
  let browserRemoved = false;
  let serverRemoved = false;
  try {
    const authId = await getPushIdentity(user);
    const registration = await waitForPush(navigator.serviceWorker.ready);
    const subscription = await waitForPush(registration.pushManager.getSubscription());
    endpoint = endpoint || subscription?.endpoint;
    // Un reintento de limpieza nunca cancela una nueva suscripción del navegador.
    if (!subscription || (pendingEndpoint && subscription.endpoint !== pendingEndpoint)) {
      browserRemoved = true;
    } else {
      try {
        await waitForPush(subscription.unsubscribe());
        browserRemoved = !(await waitForPush(registration.pushManager.getSubscription()));
      } catch {
        browserRemoved = false;
      }
    }
    if (!endpoint) serverRemoved = true;
    else {
      try {
        await getPushIdentity(user);
        const { error } = await queryPush(supabase.from('push_subscriptions').delete()
          .eq('auth_user_id', authId).eq('endpoint', endpoint));
        serverRemoved = !error;
      } catch {
        serverRemoved = false;
      }
    }
    if (browserRemoved && serverRemoved) return { success: true };
    const error = browserRemoved
      ? 'Las alertas se retiraron del navegador, pero falta confirmar la limpieza en el servidor. Reintente la desactivación.'
      : serverRemoved
        ? 'Se retiró el registro del servidor, pero el navegador no confirmó la desactivación. Reintente.'
        : 'No se pudo confirmar la desactivación. Revise la conexión y vuelva a intentarlo.';
    return { success: false, code: 'PARTIAL_DEACTIVATION', error, endpoint, browserRemoved, serverRemoved };
  } catch (err) {
    return { success: false, code: 'DEACTIVATION_FAILED', error: err.message || 'No se pudo desactivar las alertas.', endpoint, browserRemoved, serverRemoved };
  }
}
