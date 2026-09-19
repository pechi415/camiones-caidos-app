import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
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
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración del servidor incompleta.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Autenticación estricta del usuario mediante JWT
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado. Se requiere token Bearer.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user: callerUser }, error: authErr } = await callerClient.auth.getUser(token);
    if (authErr || !callerUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido o expirado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Cliente con privilegios administrativos para consultar DB y resolver identidades
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 4. Obtener identidad verificada del actor desde app_users (NO confiar en el payload)
    const { data: profile, error: profileErr } = await adminClient
      .from('app_users')
      .select('id, national_id, name, role, mine, group_name, is_active, auth_user_id')
      .eq('auth_user_id', callerUser.id)
      .single();

    if (profileErr || !profile || profile.is_active !== true) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuario no autorizado o inactivo.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actorId = profile.id;
    const actorAuthUserId = profile.auth_user_id;
    const actorName = profile.name;
    const actorFirstName = (profile.name || '').trim().split(' ')[0] || 'Usuario';
    const actorMine = profile.mine;
    const actorGroup = profile.group_name || 'Grupo 1';
    const actorRole = profile.role;

    // 5. Parsear y validar el cuerpo de la solicitud
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Cuerpo de solicitud JSON inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      event_type,
      report_id,
      truck_id,
      failure_system,
      previous_status,
      new_status,
      event_id
    } = body;

    if (!event_type || (event_type !== 'new_report' && event_type !== 'status_change')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'event_type no válido. Valores permitidos: "new_report" o "status_change".'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!report_id || typeof report_id !== 'string' || !report_id.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'report_id es obligatorio.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!truck_id || typeof truck_id !== 'string' || !truck_id.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'truck_id es obligatorio.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Validar existencia del reporte en truck_reports
    const { data: reportRecord, error: reportErr } = await adminClient
      .from('truck_reports')
      .select('id, truck_id, mine, shift, date, status, system, created_at, updated_at')
      .eq('id', report_id.trim())
      .single();

    if (reportErr || !reportRecord) {
      return new Response(
        JSON.stringify({ success: false, error: 'El reporte especificado no existe en la base de datos.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reportMine = reportRecord.mine || actorMine;
    const reportShift = reportRecord.shift || 'Diurno';
    const reportDate = reportRecord.date || new Date().toISOString().split('T')[0];
    const failureSystemResolved = (failure_system || reportRecord.system || '').trim() || 'No especificada';

    // 7. Validaciones específicas según el tipo de evento
    if (event_type === 'status_change') {
      const prevStatus = (previous_status || '').trim();
      const nextStatus = (new_status || reportRecord.status || '').trim();

      if (!nextStatus || (nextStatus !== 'OPERATIVO' && nextStatus !== 'DOWN')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Para status_change, new_status debe ser "OPERATIVO" o "DOWN".'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si el estado anterior y el nuevo son idénticos, no hubo cambio real de estado (ej. edición sin cambio de status)
      if (prevStatus && prevStatus === nextStatus) {
        return new Response(
          JSON.stringify({
            success: true,
            notified: false,
            reason: 'NO_STATUS_CHANGE',
            message: 'El estado no ha cambiado. No se generan notificaciones.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 8. Construcción de título y mensaje según el evento
    let title = '';
    let message = '';
    let calculatedEventKey = '';

    if (event_type === 'new_report') {
      title = `Nuevo reporte — ${reportMine}`;
      message = `${actorFirstName} registró el camión ${truck_id.trim()}\nFalla: ${failureSystemResolved}`;
      calculatedEventKey = `new_report:${report_id.trim()}`;
    } else {
      // status_change
      const effectiveNextStatus = (new_status || reportRecord.status || '').trim();
      title = `Cambio de estado — ${reportMine}`;
      if (effectiveNextStatus === 'OPERATIVO') {
        message = `${actorFirstName} marcó OPERATIVO el camión ${truck_id.trim()}`;
      } else {
        message = `${actorFirstName} reportó DOWN el camión ${truck_id.trim()}`;
      }

      // Identificador de mutación para soportar múltiples transiciones reales (DOWN -> OPERATIVO -> DOWN)
      // mientras se garantiza idempotencia contra dobles clics y reintentos de red
      const mutationId = (event_id && typeof event_id === 'string' && event_id.trim().length > 0)
        ? event_id.trim()
        : (reportRecord.updated_at || reportRecord.created_at || new Date().toISOString());

      calculatedEventKey = `status_change:${report_id.trim()}:${effectiveNextStatus}:${mutationId}`;
    }

    // 9. Resolución arquitectónica de destinatarios (Principio global)
    // A) Compañeros de turno: activos, misma mina, mismo grupo, distinto al actor
    // B) Administradores: activos, alcance global en todas las minas y grupos, distinto al actor
    // C) Deduplicación garantizada en memoria vía Map por auth_user_id
    const recipientsMap = new Map<string, any>();

    // Consulta A: Compañeros de la misma mina y mismo grupo
    const { data: peers, error: peersErr } = await adminClient
      .from('app_users')
      .select('id, auth_user_id, name, role, mine, group_name')
      .eq('is_active', true)
      .eq('mine', reportMine)
      .eq('group_name', actorGroup)
      .not('auth_user_id', 'is', null)
      .neq('auth_user_id', actorAuthUserId);

    if (peersErr) {
      throw new Error(`Error consultando compañeros de grupo: ${peersErr.message}`);
    }

    for (const p of (peers || [])) {
      if (p.auth_user_id && p.auth_user_id !== actorAuthUserId) {
        recipientsMap.set(p.auth_user_id, p);
      }
    }

    // Consulta B: Administradores globales (todas las minas y todos los grupos)
    const { data: admins, error: adminsErr } = await adminClient
      .from('app_users')
      .select('id, auth_user_id, name, role, mine, group_name')
      .eq('is_active', true)
      .eq('role', 'Administrador')
      .not('auth_user_id', 'is', null)
      .neq('auth_user_id', actorAuthUserId);

    if (adminsErr) {
      throw new Error(`Error consultando administradores globales: ${adminsErr.message}`);
    }

    for (const a of (admins || [])) {
      if (a.auth_user_id && a.auth_user_id !== actorAuthUserId) {
        recipientsMap.set(a.auth_user_id, a);
      }
    }

    const validRecipients = Array.from(recipientsMap.values());

    if (validRecipients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          event_type,
          recipients_count: 0,
          notifications_created: 0,
          push: null,
          message: 'No existen otros destinatarios activos elegibles para este evento.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 10. Construcción e inserción en batch de filas en public.notifications
    const metadataPayload = {
      event_key: calculatedEventKey,
      event_type,
      truck_id: truck_id.trim(),
      actor_id: actorId,
      actor_name: actorName,
      actor_role: actorRole,
      actor_mine: actorMine,
      actor_group: actorGroup,
      failure_system: event_type === 'new_report' ? failureSystemResolved : null,
      previous_status: event_type === 'status_change' ? (previous_status || null) : null,
      new_status: event_type === 'status_change' ? (new_status || reportRecord.status) : null
    };

    const notificationRows = validRecipients.map((r: any) => ({
      user_id: r.id,
      auth_user_id: r.auth_user_id,
      mine: reportMine,
      shift: reportShift,
      group_name: actorGroup,
      operational_date: reportDate,
      evaluation_moment: null,
      event_type: event_type,
      report_id: report_id.trim(),
      event_key: calculatedEventKey,
      metadata: metadataPayload,
      title,
      message,
      truck_count: 1,
      truck_ids: [truck_id.trim()],
      is_read: false,
      read_at: null
    }));

    // Inserción con ignoreDuplicates: true basada en uq_notifications_user_event_key (user_id, event_key)
    const { data: insertedData, error: upsertErr } = await adminClient
      .from('notifications')
      .upsert(notificationRows, {
        onConflict: 'user_id,event_key',
        ignoreDuplicates: true
      })
      .select('id, auth_user_id');

    if (upsertErr) {
      throw new Error(`Error insertando notificaciones operacionales: ${upsertErr.message}`);
    }

    const insertedCount = insertedData ? insertedData.length : 0;

    // 11. Despacho no bloqueante de Web Push (condicionado estrictamente a filas nuevas)
    let pushSummary: any = null;

    if (insertedCount > 0 && Array.isArray(insertedData)) {
      const newAuthUserIds = Array.from(
        new Set(
          insertedData
            .map((row: any) => row.auth_user_id)
            .filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0)
        )
      );

      if (newAuthUserIds.length > 0 && schedulerSecret) {
        const pushPayload = {
          title,
          body: message,
          tag: `operational-${event_type}-${truck_id.trim()}-${Date.now()}`,
          data: {
            url: '/',
            report_id: report_id.trim(),
            truck_id: truck_id.trim(),
            event_type
          },
          target_auth_user_ids: newAuthUserIds
        };

        try {
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-web-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-scheduler-secret': schedulerSecret
            },
            body: JSON.stringify(pushPayload)
          });

          if (pushResponse.ok) {
            const pushJson = await pushResponse.json().catch(() => ({}));
            pushSummary = {
              dispatched: true,
              totalTargets: pushJson.total_targets ?? 0,
              successful: pushJson.successful ?? 0,
              expired: pushJson.expired ?? 0,
              failed: pushJson.failed ?? 0
            };
          } else {
            console.warn(`[PUSH WARNING] send-web-push respondió HTTP ${pushResponse.status} para evento ${event_type}`);
            pushSummary = {
              dispatched: false,
              statusCode: pushResponse.status
            };
          }
        } catch (pushErr: any) {
          console.warn(`[PUSH ERROR] Fallo no bloqueante al invocar send-web-push:`, pushErr?.message);
          pushSummary = {
            dispatched: false,
            error: pushErr?.message || 'Error de red en despacho Push'
          };
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_type,
        report_id: report_id.trim(),
        truck_id: truck_id.trim(),
        event_key: calculatedEventKey,
        actor: {
          id: actorId,
          name: actorName,
          mine: actorMine,
          group: actorGroup,
          role: actorRole
        },
        recipients_count: validRecipients.length,
        notifications_created: insertedCount,
        push: pushSummary
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Error inesperado procesando notificación operacional'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
