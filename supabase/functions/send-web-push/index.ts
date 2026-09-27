import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import webpush from 'npm:web-push@3.6.7';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // 1. Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método no permitido. Utilice POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@camionescaidos.com';
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey || !vapidPrivateKey || !vapidPublicKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración de servidor o claves VAPID incompleta.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Control de Autorización Estricta
    // Opción A: Cabecera interna x-scheduler-secret (para integraciones seguras)
    const incomingSchedulerSecret = req.headers.get('x-scheduler-secret') || '';
    const isSchedulerAuth = schedulerSecret && incomingSchedulerSecret && incomingSchedulerSecret === schedulerSecret;

    // Opción B: JWT de usuario con rol Administrador
    let isAdminAuth = false;
    const authHeader = req.headers.get('Authorization') || '';

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      });

      const { data: { user: callerUser }, error: authErr } = await callerClient.auth.getUser(token);
      if (!authErr && callerUser) {
        const { data: profile } = await adminClient
          .from('app_users')
          .select('role')
          .eq('auth_user_id', callerUser.id)
          .single();

        if (profile?.role === 'Administrador') {
          isAdminAuth = true;
        }
      }
    }

    if (!isSchedulerAuth && !isAdminAuth) {
      return new Response(
        JSON.stringify({ success: false, error: 'Acceso denegado: se requieren credenciales administrativas o secret autorizado.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Lectura y validación del Payload
    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Cuerpo de solicitud JSON inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bodyData || typeof bodyData !== 'object' || Array.isArray(bodyData)) {
      return new Response(JSON.stringify({ success: false, error: 'El cuerpo debe ser un objeto JSON.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const {
      title,
      body,
      icon = '/pwa-192x192.png',
      badge = '/favicon.svg',
      tag = 'shift-alert',
      data = {},
      target_user_ids,
      target_auth_user_ids,
      target_subscription_ids,
      target_subscription
    } = bodyData;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'El campo title es obligatorio y debe ser texto no vacío.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body || typeof body !== 'string' || !body.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'El campo body es obligatorio y debe ser texto no vacío.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regla de negocio y seguridad: Prohibido usar la palabra "arrastre"
    const fullText = `${title} ${body} ${JSON.stringify(data)}`.toLowerCase();
    if (fullText.includes('arrastre')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Terminología no autorizada detectada en el payload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Destinos explícitos: nunca convertir una lista vacía o inválida en un envío global.
    const rejectTargets = (error: string) => new Response(JSON.stringify({ success: false, error }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    const targetLists = [target_user_ids, target_auth_user_ids, target_subscription_ids];
    for (const list of targetLists) {
      if (list !== undefined && (!Array.isArray(list) || list.some(id => typeof id !== 'string' || !id.trim()))) {
        return rejectTargets('Los destinatarios deben ser listas de identificadores de texto no vacíos.');
      }
    }
    const [userIds, authUserIds, subscriptionIds] = targetLists.map(list =>
      Array.isArray(list) ? [...new Set(list.map(id => id.trim()))] : []
    );
    let directSubscription: { endpoint: string; keys: { p256dh: string; auth: string } } | null = null;
    if (target_subscription !== undefined) {
      const sub = target_subscription;
      if (!sub || typeof sub.endpoint !== 'string' || !sub.endpoint.trim()
        || typeof sub.keys?.p256dh !== 'string' || !sub.keys.p256dh.trim()
        || typeof sub.keys?.auth !== 'string' || !sub.keys.auth.trim()) {
        return rejectTargets('La suscripción de destino está incompleta.');
      }
      try {
        if (new URL(sub.endpoint).protocol !== 'https:') return rejectTargets('El destino push debe usar HTTPS.');
      } catch {
        return rejectTargets('La dirección de la suscripción no es válida.');
      }
      directSubscription = {
        endpoint: sub.endpoint.trim(),
        keys: { p256dh: sub.keys.p256dh.trim(), auth: sub.keys.auth.trim() }
      };
    }
    if (!directSubscription && !userIds.length && !authUserIds.length && !subscriptionIds.length) {
      return rejectTargets('Debe indicar al menos un destinatario explícito. No se permiten envíos globales implícitos.');
    }

    // 4. Obtención de suscripciones objetivo
    let subscriptionsToNotify: Array<{
      id?: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }> = [];

    if (directSubscription) {
      subscriptionsToNotify.push({
        endpoint: directSubscription.endpoint,
        p256dh: directSubscription.keys.p256dh,
        auth: directSubscription.keys.auth
      });
    } else {
      let query = adminClient
        .from('push_subscriptions')
        .select('id, user_id, auth_user_id, endpoint, p256dh, auth')
        .eq('is_active', true);

      if (userIds.length > 0) {
        query = query.in('user_id', userIds);
      }
      if (authUserIds.length > 0) {
        query = query.in('auth_user_id', authUserIds);
      }
      if (subscriptionIds.length > 0) {
        query = query.in('id', subscriptionIds);
      }

      const { data: dbSubs, error: dbErr } = await query;
      if (dbErr) {
        return new Response(
          JSON.stringify({ success: false, error: 'Error al consultar suscripciones activas en base de datos.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      subscriptionsToNotify = (dbSubs || []).map((s: any) => ({
        id: s.id,
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth
      }));
    }

    if (subscriptionsToNotify.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No se encontraron suscripciones activas para los destinatarios especificados.',
          total_targets: 0,
          successful: 0,
          expired: 0,
          failed: 0,
          results: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Configurar VAPID en web-push
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const pushPayload = JSON.stringify({
      title: title.trim(),
      body: body.trim(),
      icon,
      badge,
      tag,
      data: {
        url: (data && data.url) || '/',
        ...data
      }
    });

    // 6. Despacho concurrente protegido con Promise.allSettled
    const results = await Promise.allSettled(
      subscriptionsToNotify.map(async (sub) => {
        const pushSubscriptionObj = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          const sendRes = await webpush.sendNotification(pushSubscriptionObj, pushPayload, {
            TTL: 3600 // 1 hora de tiempo de vida en el Push Service
          });

          // Actualizar last_used_at si tenemos el ID o endpoint
          if (sub.endpoint) {
            await adminClient
              .from('push_subscriptions')
              .update({ last_used_at: new Date().toISOString() })
              .eq('endpoint', sub.endpoint);
          }

          return {
            endpoint: sub.endpoint,
            status: 'success',
            statusCode: sendRes.statusCode || 201
          };
        } catch (pushErr: any) {
          const statusCode = pushErr?.statusCode || 500;

          // Si el push service responde 404 Not Found o 410 Gone, la suscripción expiró o fue eliminada en el navegador
          if (statusCode === 404 || statusCode === 410) {
            if (sub.endpoint) {
              await adminClient
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('endpoint', sub.endpoint);
            }

            return {
              endpoint: sub.endpoint,
              status: 'expired',
              statusCode,
              deactivated: true
            };
          }

          if (statusCode === 429) {
            return {
              endpoint: sub.endpoint,
              status: 'rate_limited',
              statusCode: 429,
              error: 'Push service limit reached'
            };
          }

          return {
            endpoint: sub.endpoint,
            status: 'failed',
            statusCode,
            error: pushErr?.message || 'Push dispatch failed'
          };
        }
      })
    );

    // 7. Consolidación de métricas de entrega
    let successful = 0;
    let expired = 0;
    let failed = 0;
    const formattedResults = results.map((r) => {
      if (r.status === 'fulfilled') {
        const val = r.value;
        if (val.status === 'success') successful++;
        else if (val.status === 'expired') expired++;
        else failed++;
        return val;
      } else {
        failed++;
        return {
          status: 'error',
          error: r.reason?.message || 'Error no controlado en el worker'
        };
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_targets: subscriptionsToNotify.length,
        successful,
        expired,
        failed,
        results: formattedResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error no controlado en send-web-push:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor al procesar el envío push.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
