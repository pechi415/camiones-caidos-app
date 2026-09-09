import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

const TEMP_PASSWORD = 'caidos1234';

serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Método no permitido. Utilice POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: 'Configuración interna del servidor incompleta.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Validar autenticación del llamante mediante JWT
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado. Cabecera Authorization requerida.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user: callerUser }, error: callerAuthErr } = await callerClient.auth.getUser(token);
    if (callerAuthErr || !callerUser) {
      return new Response(JSON.stringify({ success: false, error: 'Sesión no válida o expirada.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cliente administrativo con service_role
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 2. Verificar rol en BD (La fuente de verdad es app_users, NUNCA el body)
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('app_users')
      .select('id, role')
      .eq('auth_user_id', callerUser.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'Administrador') {
      return new Response(JSON.stringify({ success: false, error: 'Acceso denegado. Se requieren privilegios de Administrador.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Validar payload
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Payload JSON inválido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const targetAppUserId = String(body.target_app_user_id || '').trim();
    if (!targetAppUserId) {
      return new Response(JSON.stringify({ success: false, error: 'El campo target_app_user_id es obligatorio.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Buscar usuario objetivo en app_users
    const { data: targetUser, error: targetUserErr } = await adminClient
      .from('app_users')
      .select('id, national_id, name, role, auth_user_id')
      .eq('id', targetAppUserId)
      .maybeSingle();

    if (targetUserErr || !targetUser) {
      return new Response(JSON.stringify({ success: false, error: 'Usuario objetivo no encontrado.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!targetUser.auth_user_id) {
      return new Response(JSON.stringify({ success: false, error: 'El usuario objetivo no tiene cuenta de autenticación vinculada.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. Restablecer contraseña en Supabase Auth
    const { error: resetAuthErr } = await adminClient.auth.admin.updateUserById(
      targetUser.auth_user_id,
      { password: TEMP_PASSWORD }
    );

    if (resetAuthErr) {
      console.error('[ERROR RESET AUTH]', resetAuthErr);
      return new Response(JSON.stringify({ success: false, error: 'Error al restablecer la contraseña en Supabase Auth.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 6. Actualizar app_users.must_change_password = true (hasta 3 intentos)
    let updateSuccess = false;
    let updateErrMessage = '';

    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error: updateDbErr } = await adminClient
        .from('app_users')
        .update({ must_change_password: true })
        .eq('id', targetAppUserId);

      if (!updateDbErr) {
        updateSuccess = true;
        break;
      }

      updateErrMessage = updateDbErr.message;
      console.warn(`[RETRY] Intento ${attempt}/3 falló al actualizar must_change_password para ${targetAppUserId}:`, updateErrMessage);
      if (attempt < 3) {
        await new Promise((res) => setTimeout(res, 200 * attempt));
      }
    }

    if (!updateSuccess) {
      console.error('[INCONSISTENCIA ADMINISTRATIVA] Contraseña de Auth restablecida pero falló must_change_password tras 3 intentos:', updateErrMessage);
      return new Response(JSON.stringify({
        success: false,
        error: 'La contraseña de autenticación fue restablecida pero no se pudo actualizar el indicador de cambio obligatorio tras 3 intentos. Requiere intervención administrativa.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 7. Respuesta sanitizada de éxito (200 OK)
    return new Response(JSON.stringify({
      success: true,
      message: 'Contraseña restablecida exitosamente a la clave temporal.',
      targetAppUserId: targetUser.id,
      mustChangePassword: true
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Error interno del servidor.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}, { port: Number(Deno.env.get('PORT') || 8000) });
