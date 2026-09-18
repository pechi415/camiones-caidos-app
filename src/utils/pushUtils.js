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

/**
 * Obtiene la suscripción Push activa existente en el navegador, si la hay.
 */
export async function getExistingPushSubscription() {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('No se pudo verificar la suscripción Push existente:', err);
    return null;
  }
}

/**
 * Suscribe al usuario autenticado a Web Push y persiste el endpoint en public.push_subscriptions.
 */
export async function subscribeUserToPush(user) {
  if (!isPushSupported()) {
    return {
      success: false,
      code: 'UNSUPPORTED',
      message: 'Este navegador no es compatible con notificaciones Web Push.'
    };
  }

  // Validación para iOS: Safari exige instalación en pantalla de inicio para Web Push (iOS 16.4+)
  if (isIOS() && !isStandalone()) {
    return {
      success: false,
      code: 'IOS_NOT_STANDALONE',
      message: 'En iPhone, primero debes agregar la aplicación a tu Pantalla de Inicio desde el menú Compartir para activar notificaciones.'
    };
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('Variable VITE_VAPID_PUBLIC_KEY no configurada en el cliente.');
    return {
      success: false,
      code: 'CONFIG_ERROR',
      message: 'Error de configuración en el servidor de notificaciones.'
    };
  }

  try {
    // 1. Solicitar permiso explícito al usuario
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return {
        success: false,
        code: 'PERMISSION_DENIED',
        message: 'El permiso de notificaciones fue denegado. Puedes habilitarlo desde la configuración de tu navegador.'
      };
    }

    // 2. Obtener el registro del Service Worker
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    // Si no existe suscripción, crear una nueva con la clave VAPID pública
    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      throw new Error('La suscripción generada por el navegador carece de credenciales completas.');
    }

    // 3. Persistir o sincronizar en Supabase push_subscriptions
    // Validar sesión actual en Supabase Auth
    const { data: { session } } = await supabase.auth.getSession();
    const authUserId = session?.user?.id || user?.auth_user_id;
    const appUserId = user?.id;

    if (!authUserId || !appUserId) {
      throw new Error('No hay sesión de usuario válida para registrar la suscripción.');
    }

    const subscriptionRecord = {
      user_id: appUserId,
      auth_user_id: authUserId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
      platform: getDevicePlatform(),
      user_agent: window.navigator.userAgent.slice(0, 500),
      is_active: true,
      last_used_at: new Date().toISOString()
    };

    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert(subscriptionRecord, { onConflict: 'endpoint' });

    if (dbError) {
      console.error('Error al persistir push_subscription en base de datos:', dbError);
      throw new Error('No se pudo guardar la suscripción en el servidor.');
    }

    return {
      success: true,
      subscription
    };
  } catch (err) {
    console.error('Excepción al suscribir a notificaciones push:', err);
    return {
      success: false,
      code: 'SUBSCRIPTION_FAILED',
      message: err.message || 'Ocurrió un error al activar las notificaciones en este dispositivo.'
    };
  }
}

/**
 * Desactiva y elimina la suscripción del dispositivo tanto en el navegador como en Supabase.
 */
export async function unsubscribeUserFromPush(user) {
  if (!isPushSupported()) return { success: true };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;

      // 1. Eliminar la suscripción en Supabase para este endpoint
      const { data: { session } } = await supabase.auth.getSession();
      const currentAuthId = session?.user?.id || user?.auth_user_id;

      if (currentAuthId && endpoint) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('auth_user_id', currentAuthId)
          .eq('endpoint', endpoint);
      }

      // 2. Anular la suscripción en el navegador
      await subscription.unsubscribe();
    }

    return { success: true };
  } catch (err) {
    console.warn('Error al desuscribir de notificaciones push:', err);
    // Intentar purgar en base de datos de todos modos si se conoce el endpoint
    return { success: false, error: err.message };
  }
}
