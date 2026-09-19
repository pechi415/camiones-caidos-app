/**
 * Servicio de Notificaciones Operacionales Frontend
 * Centraliza la invocación del Edge Function 'notify-operational-event'.
 * 
 * Reglas de Arquitectura:
 * - Emplea la sesión JWT activa del usuario autenticado.
 * - Envía exclusivamente datos operacionales esenciales (report_id, truck_id, estados, etc.).
 * - Toda excepción es capturada internamente para no bloquear ni revertir el guardado del reporte.
 * - No inserta directamente en la tabla notifications (autoridad del backend).
 * - No resuelve destinatarios ni permisos en frontend.
 */

import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zagiwbgajnxrdgruhthm.supabase.co';

/**
 * Notifica la creación exitosa de un nuevo reporte de camión.
 * 
 * @param {Object} params
 * @param {string} params.report_id - ID único del reporte guardado (ej. REP-123-4567)
 * @param {string} params.truck_id - Número/identificador del camión (ej. 7934)
 * @param {string} [params.failure_system] - Sistema de falla (ej. Sistema hidráulico)
 * @param {string} [params.shift] - Turno del reporte (Diurno / Nocturno)
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function notifyNewReport({ report_id, truck_id, failure_system, shift }) {
  if (!report_id || !truck_id) {
    console.warn('[NOTIFICATIONS] notifyNewReport omitido: faltan campos obligatorios (report_id o truck_id).');
    return { success: false, error: 'Faltan parámetros requeridos.' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.warn('[NOTIFICATIONS] notifyNewReport omitido: no hay sesión activa.');
      return { success: false, error: 'Sin sesión activa.' };
    }

    const payload = {
      event_type: 'new_report',
      report_id: String(report_id).trim(),
      truck_id: String(truck_id).trim(),
      failure_system: failure_system ? String(failure_system).trim() : 'No especificada',
      shift: shift || 'Diurno'
    };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-operational-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn(`[NOTIFICATIONS] notify-operational-event respondió HTTP ${response.status}:`, result?.error || 'Error desconocido');
      return { success: false, error: result?.error || `HTTP ${response.status}` };
    }

    return { success: true, data: result };
  } catch (err) {
    console.warn('[NOTIFICATIONS] Error no bloqueante al invocar notifyNewReport:', err?.message || err);
    return { success: false, error: err?.message || 'Error de red' };
  }
}

/**
 * Notifica un cambio real de estado de un camión (DOWN <-> OPERATIVO).
 * 
 * @param {Object} params
 * @param {string} params.report_id - ID único del reporte
 * @param {string} params.truck_id - Número/identificador del camión
 * @param {string} params.previous_status - Estado antes del cambio (ej. DOWN u OPERATIVO)
 * @param {string} params.new_status - Nuevo estado asignado (ej. OPERATIVO o DOWN)
 * @param {string} [params.shift] - Turno del reporte
 * @param {string} [params.mutation_id] - Identificador único de la mutación para idempotencia
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function notifyStatusChange({ report_id, truck_id, previous_status, new_status, shift, mutation_id }) {
  if (!report_id || !truck_id || !new_status) {
    console.warn('[NOTIFICATIONS] notifyStatusChange omitido: faltan campos obligatorios.');
    return { success: false, error: 'Faltan parámetros requeridos.' };
  }

  // Si el estado anterior y el nuevo son idénticos, no hubo cambio de estado real
  if (previous_status && previous_status === new_status) {
    return { success: true, notified: false, reason: 'NO_STATUS_CHANGE' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.warn('[NOTIFICATIONS] notifyStatusChange omitido: no hay sesión activa.');
      return { success: false, error: 'Sin sesión activa.' };
    }

    const payload = {
      event_type: 'status_change',
      report_id: String(report_id).trim(),
      truck_id: String(truck_id).trim(),
      previous_status: previous_status || null,
      new_status: String(new_status).trim(),
      shift: shift || 'Diurno',
      event_id: mutation_id || `mut-${Date.now()}`
    };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-operational-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn(`[NOTIFICATIONS] notify-operational-event respondió HTTP ${response.status}:`, result?.error || 'Error desconocido');
      return { success: false, error: result?.error || `HTTP ${response.status}` };
    }

    return { success: true, data: result };
  } catch (err) {
    console.warn('[NOTIFICATIONS] Error no bloqueante al invocar notifyStatusChange:', err?.message || err);
    return { success: false, error: err?.message || 'Error de red' };
  }
}
