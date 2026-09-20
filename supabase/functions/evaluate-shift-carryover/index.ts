import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

// Constantes de negocio
const BASE_DATE_UTC = Date.UTC(2026, 8, 17); // 2026-09-17 (Mes 8 = Septiembre en JS Date.UTC)
const BASE_INDICES: Record<string, number> = {
  'Grupo 1': 2,  // DAY 3/7 (índice 2)
  'Grupo 2': 16, // NIGHT 7/7 (índice 16)
  'Grupo 3': 9   // REST 3/3 (índice 9)
};

const OFFICIAL_MINES = ['El Descanso', 'Pribbenow'];

export interface ShiftGroupResult {
  shift: 'Diurno' | 'Nocturno';
  group_name: 'Grupo 1' | 'Grupo 2' | 'Grupo 3';
  cycleDay: number;
  totalDays: 7;
}

/**
 * Función pura y autónoma para calcular el grupo asignado al turno entrante.
 * Basada en el ciclo canónico de 21 días (7 DAY -> 3 REST -> 7 NIGHT -> 4 REST).
 * Ancla: 2026-09-17 (G1: DAY 3/7, G2: NIGHT 7/7, G3: REST 3/3).
 *
 * @param operationalDate Fecha operativa en formato YYYY-MM-DD
 * @param evaluationMoment Momento de corte ('06:30' o '18:30')
 */
export function getShiftGroup(
  operationalDate: string,
  evaluationMoment: '06:30' | '18:30'
): ShiftGroupResult {
  if (evaluationMoment !== '06:30' && evaluationMoment !== '18:30') {
    throw new Error(`Momento de evaluación no soportado: ${evaluationMoment}`);
  }

  // Parsear fecha YYYY-MM-DD a medianoche UTC
  const parts = operationalDate.split('-');
  if (parts.length !== 3) {
    throw new Error(`Formato de fecha inválido: ${operationalDate}. Se espera YYYY-MM-DD`);
  }
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    throw new Error(`Componentes de fecha no numéricos: ${operationalDate}`);
  }

  const targetUtc = Date.UTC(y, m - 1, d);
  // Diferencia exacta en días entre fechas UTC normalizadas a medianoche (sin Math.round)
  const diffDays = (targetUtc - BASE_DATE_UTC) / 86400000;

  const targetShiftType = evaluationMoment === '06:30' ? 'DAY' : 'NIGHT';
  const shift = evaluationMoment === '06:30' ? 'Diurno' : 'Nocturno';

  const groupNames: Array<'Grupo 1' | 'Grupo 2' | 'Grupo 3'> = ['Grupo 1', 'Grupo 2', 'Grupo 3'];
  const matches: ShiftGroupResult[] = [];

  for (const g of groupNames) {
    const baseIndex = BASE_INDICES[g];
    const cycleIndex = ((baseIndex + diffDays) % 21 + 21) % 21;

    if (cycleIndex >= 0 && cycleIndex <= 6) {
      if (targetShiftType === 'DAY') {
        matches.push({
          shift,
          group_name: g,
          cycleDay: cycleIndex + 1,
          totalDays: 7
        });
      }
    } else if (cycleIndex >= 10 && cycleIndex <= 16) {
      if (targetShiftType === 'NIGHT') {
        matches.push({
          shift,
          group_name: g,
          cycleDay: cycleIndex - 10 + 1,
          totalDays: 7
        });
      }
    }
  }

  if (matches.length !== 1) {
    throw new Error(
      `Inconsistencia rotacional en ${operationalDate} ${evaluationMoment}: se encontraron ${matches.length} grupos para el turno ${targetShiftType}`
    );
  }

  return matches[0];
}

/**
 * Determina si la ubicación corresponde a CAMPO (excluyendo taller y bahías).
 * Coincide exactamente con la lógica de clasificación del sistema frontend.
 */
export function isEquipmentInField(locationStr: string | null | undefined): boolean {
  if (!locationStr) return true;
  const loc = locationStr.toLowerCase().trim();

  // 1. Taller: taller o tllr (ej. tllr, tlr)
  const isTaller = loc.includes('taller') || /\btll?r\b/i.test(loc);
  if (isTaller) return false;

  // 2. Bahía: bahia, bahía, bay, bh
  const isBahia = loc.includes('bahia') || loc.includes('bahía') || /\b(?:bh|bay)\b/i.test(loc);
  if (isBahia) return false;

  return true;
}

/**
 * Obtiene la fecha operativa actual en zona horaria COT (America/Bogota, UTC-5).
 */
function getTodayCOT(): string {
  const now = new Date();
  const cotFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return cotFormatter.format(now); // Retorna formato YYYY-MM-DD
}

serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método no permitido. Utilice POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración interna del servidor incompleta.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Cliente administrativo con service_role para operaciones seguras de backend
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // ==========================================
    // 1. AUTORIZACIÓN DUAL (Scheduler o Admin JWT)
    // ==========================================
    let isAuthorized = false;
    let callerIdentity = 'unknown';

    // A. Verificación de secreto dedicado de Scheduler
    const incomingSchedulerSecret = req.headers.get('x-scheduler-secret') || '';
    if (schedulerSecret && incomingSchedulerSecret && incomingSchedulerSecret === schedulerSecret) {
      isAuthorized = true;
      callerIdentity = 'scheduler';
    }

    // B. Verificación de JWT de usuario con rol Administrador
    if (!isAuthorized) {
      const authHeader = req.headers.get('Authorization') || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user: callerUser }, error: callerAuthErr } = await callerClient.auth.getUser(token);

        if (!callerAuthErr && callerUser) {
          // Verificar rol en app_users (fuente de verdad en DB)
          const { data: callerProfile, error: profileErr } = await adminClient
            .from('app_users')
            .select('id, role, name')
            .eq('auth_user_id', callerUser.id)
            .single();

          if (!profileErr && callerProfile && callerProfile.role === 'Administrador') {
            isAuthorized = true;
            callerIdentity = `admin:${callerProfile.id} (${callerProfile.name})`;
          } else {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Acceso denegado. Se requieren privilegios de Administrador.'
              }),
              {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No autorizado. Se requiere token Bearer de Administrador o secreto de scheduler.'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ==========================================
    // 2. PARSEO Y VALIDACIÓN DE PAYLOAD
    // ==========================================
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const evaluationMoment = body.evaluationMoment;
    if (!evaluationMoment || (evaluationMoment !== '06:30' && evaluationMoment !== '18:30')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Momento de evaluación inválido o faltante. Valores permitidos: "06:30" o "18:30".'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let operationalDate = body.date;
    if (!operationalDate) {
      operationalDate = getTodayCOT();
    } else {
      if (typeof operationalDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(operationalDate)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Formato de fecha inválido. Utilice formato YYYY-MM-DD.'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // ==========================================
    // 3. DETERMINACIÓN ROTACIONAL DE GRUPO Y TURNO
    // ==========================================
    const shiftGroup = getShiftGroup(operationalDate, evaluationMoment);

    // ==========================================
    // 4. EVALUACIÓN POR MINA
    // ==========================================
    const resultsSummary: any[] = [];
    let totalNotificationsInserted = 0;

    // Obtención de Administradores globales (una sola vez antes del loop de minas)
    // Cobertura transversal en todas las minas y grupos, activos y con auth_user_id válido
    const { data: globalAdmins, error: adminsErr } = await adminClient
      .from('app_users')
      .select('id, auth_user_id, name, mine, group_name, role')
      .eq('is_active', true)
      .eq('role', 'Administrador')
      .not('auth_user_id', 'is', null);

    if (adminsErr) {
      throw new Error(`Error consultando administradores globales en app_users: ${adminsErr.message}`);
    }

    for (const mine of OFFICIAL_MINES) {
      // Consulta a Supabase:
      // Obtener reportes de la mina cuyo origen sea anterior al turno evaluado (sin prefiltrar status)
      let query = adminClient
        .from('truck_reports')
        .select('id, truck_id, mine, shift, date, location, status, created_at')
        .eq('mine', mine);

      if (evaluationMoment === '06:30') {
        // Regla 06:30: origen anterior a la fecha operativa
        query = query.lt('date', operationalDate);
      } else {
        // Regla 18:30: fecha anterior O misma fecha pero turno Diurno
        query = query.or(`date.lt.${operationalDate},and(date.eq.${operationalDate},shift.eq.Diurno)`);
      }

      // Ordenar por created_at DESC para evaluar el reporte más reciente primero
      query = query.order('created_at', { ascending: false });

      const { data: rawReports, error: queryErr } = await query;
      if (queryErr) {
        throw new Error(`Error consultando truck_reports para mina ${mine}: ${queryErr.message}`);
      }

      // Deduplicación y selección del reporte vigente (último estado) por truck_id:
      // El primer reporte encontrado para cada camión representa su estado más reciente dentro del corte
      const seenTrucks = new Set<string>();
      const carryoverTrucks: string[] = [];

      for (const rep of (rawReports || [])) {
        const truckId = String(rep.truck_id || '').trim();
        if (!truckId) continue;

        if (seenTrucks.has(truckId)) {
          // Ya procesado por su reporte más reciente dentro del corte
          continue;
        }
        seenTrucks.add(truckId);

        // SOLO tras seleccionar el reporte vigente del camión dentro del corte,
        // evaluar si califica: status DOWN y ubicación en campo
        if (rep.status === 'DOWN' && isEquipmentInField(rep.location)) {
          carryoverTrucks.push(truckId);
        }
      }

      // Ordenar lista de camiones alfanuméricamente para consistencia
      carryoverTrucks.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      const carryoverCount = carryoverTrucks.length;

      // Si no hay camiones caídos en campo, no se crean notificaciones para esta mina
      if (carryoverCount === 0) {
        resultsSummary.push({
          mine,
          carryoverCount: 0,
          truckIds: [],
          recipientsCount: 0,
          notificationsCreated: 0,
          status: 'NO_CARRYOVER'
        });
        continue;
      }

      // ==========================================
      // 5. OBTENCIÓN DE DESTINATARIOS ACTIVOS
      // ==========================================
      // A) Destinatarios de turno: usuarios activos de la mina evaluada asignados al grupo activo
      const { data: shiftPeers, error: peersErr } = await adminClient
        .from('app_users')
        .select('id, auth_user_id, name, mine, group_name, role')
        .eq('mine', mine)
        .eq('group_name', shiftGroup.group_name)
        .eq('is_active', true)
        .not('auth_user_id', 'is', null);

      if (peersErr) {
        throw new Error(`Error consultando destinatarios de turno en app_users para mina ${mine}: ${peersErr.message}`);
      }

      // B) Deduplicación garantizada en memoria vía Map por auth_user_id
      const recipientsMap = new Map<string, any>();

      // 1. Incorporar compañeros de turno de la mina evaluada
      for (const p of (shiftPeers || [])) {
        if (p.auth_user_id && p.id) {
          recipientsMap.set(p.auth_user_id, p);
        }
      }

      // 2. Incorporar Administradores globales (cobertura transversal en ambas minas y todos los grupos)
      for (const a of (globalAdmins || [])) {
        if (a.auth_user_id && a.id) {
          recipientsMap.set(a.auth_user_id, a);
        }
      }

      const validRecipients = Array.from(recipientsMap.values());

      if (validRecipients.length === 0) {
        resultsSummary.push({
          mine,
          carryoverCount,
          truckIds: carryoverTrucks,
          recipientsCount: 0,
          notificationsCreated: 0,
          status: 'NO_ACTIVE_RECIPIENTS'
        });
        continue;
      }

      // ==========================================
      // 6. CREACIÓN DE NOTIFICACIONES IDEMPOTENTES
      // ==========================================
      const title = `Alerta Cambio de Turno — ${mine}`;
      const message = `Turno ${shiftGroup.shift} (${shiftGroup.group_name}): Existen ${carryoverCount} camiones caídos en campo pendientes de arrastre.`;

      const notificationRows = validRecipients.map(u => ({
        user_id: u.id,
        auth_user_id: u.auth_user_id,
        mine: mine,
        shift: shiftGroup.shift,
        group_name: shiftGroup.group_name,
        operational_date: operationalDate,
        evaluation_moment: evaluationMoment,
        title,
        message,
        truck_count: carryoverCount,
        truck_ids: carryoverTrucks,
        is_read: false,
        read_at: null
      }));

      // Upsert con ignoreDuplicates: true usando la restricción de unicidad:
      // uq_notifications_user_shift_moment (user_id, mine, shift, operational_date, evaluation_moment)
      const { data: insertedData, error: upsertErr } = await adminClient
        .from('notifications')
        .upsert(notificationRows, {
          onConflict: 'user_id,mine,shift,operational_date,evaluation_moment',
          ignoreDuplicates: true
        })
        .select('id, auth_user_id');

      if (upsertErr) {
        throw new Error(`Error insertando notificaciones para mina ${mine}: ${upsertErr.message}`);
      }

      const insertedCount = insertedData ? insertedData.length : 0;
      totalNotificationsInserted += insertedCount;

      let pushSummary: any = null;

      // Despacho de Web Push condicionado estrictamente a la inserción efectiva de nuevas notificaciones
      if (insertedCount > 0 && Array.isArray(insertedData)) {
        // Extraer únicamente los auth_user_id no nulos y sin duplicados correspondientes a las filas nuevas
        const newAuthUserIds = Array.from(
          new Set(
            insertedData
              .map((row: any) => row.auth_user_id)
              .filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0)
          )
        );

        if (newAuthUserIds.length > 0 && schedulerSecret) {
          const pushTitle = `Cambio de turno — ${mine}`;
          const downCountText = carryoverCount === 1 ? '1 camión DOWN en campo' : `${carryoverCount} camiones DOWN en campo`;
          const pushBody = `Turno ${shiftGroup.shift} · ${shiftGroup.group_name}\n${downCountText}`;
          const pushTag = `shift-alert-${mine.replace(/\s+/g, '-').toLowerCase()}-${shiftGroup.shift.toLowerCase()}-${operationalDate}-${Date.now()}`;

          const pushPayload = {
            title: pushTitle,
            body: pushBody,
            tag: pushTag,
            data: {
              url: '/'
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
              console.warn(`[PUSH WARNING] send-web-push respondió HTTP ${pushResponse.status} para mina ${mine}`);
              pushSummary = {
                dispatched: false,
                statusCode: pushResponse.status
              };
            }
          } catch (pushErr: any) {
            console.warn(`[PUSH ERROR] Fallo no bloqueante al invocar send-web-push para mina ${mine}:`, pushErr?.message);
            pushSummary = {
              dispatched: false,
              error: pushErr?.message || 'Error de red en despacho Push'
            };
          }
        }
      }

      resultsSummary.push({
        mine,
        carryoverCount,
        truckIds: carryoverTrucks,
        recipientsCount: validRecipients.length,
        notificationsCreated: insertedCount,
        push: pushSummary,
        status: 'SUCCESS'
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        callerIdentity,
        operationalDate,
        evaluationMoment,
        activeShift: shiftGroup.shift,
        activeGroup: shiftGroup.group_name,
        cycleDay: shiftGroup.cycleDay,
        totalCycleDays: shiftGroup.totalDays,
        totalNotificationsInserted,
        mines: resultsSummary
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Error inesperado evaluando arrastre de turno'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
