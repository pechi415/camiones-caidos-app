import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Método: Aceptar únicamente POST. Otros responden 405.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Configuración interna del servidor incompleta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Autenticación: Requerir header Authorization Bearer <JWT>
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
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
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cliente administrativo con service_role
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 4. Autorización: Validar rol Administrador en public.app_users (NUNCA en frontend)
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('app_users')
      .select('id, role')
      .eq('auth_user_id', callerUser.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'Administrador') {
      return new Response(JSON.stringify({ error: 'No tienes permisos para realizar esta operación' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. Validar payload esperado: { "target_app_user_id": "..." }
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Payload JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const targetAppUserId = typeof body?.target_app_user_id === 'string' ? body.target_app_user_id.trim() : '';
    if (!targetAppUserId) {
      return new Response(JSON.stringify({ error: 'El campo target_app_user_id es obligatorio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 6 & 7. Buscar usuario objetivo en public.app_users
    const { data: targetUser, error: targetUserErr } = await adminClient
      .from('app_users')
      .select('id, auth_user_id, national_id, name, role')
      .eq('id', targetAppUserId)
      .maybeSingle();

    if (targetUserErr || !targetUser) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 8. PROTECCIÓN CRÍTICA: El administrador NO puede eliminarse a sí mismo
    if (targetUser.auth_user_id === callerUser.id || targetUser.id === callerProfile.id) {
      return new Response(JSON.stringify({ error: 'No es posible eliminarse a sí mismo como administrador' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 9. PROTECCIÓN DEL ÚLTIMO ADMINISTRADOR
    if (targetUser.role === 'Administrador') {
      const { count: adminCount, error: countErr } = await adminClient
        .from('app_users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'Administrador');

      if (countErr) {
        return new Response(JSON.stringify({ error: 'No fue posible validar la cantidad de administradores' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if ((adminCount ?? 1) <= 1) {
        return new Response(JSON.stringify({ error: 'No es posible eliminar al único administrador del sistema' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 10. ELIMINACIÓN AUTH
    const targetAuthUserId = targetUser.auth_user_id;
    if (targetAuthUserId) {
      const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(targetAuthUserId);
      if (deleteAuthErr) {
        console.error('[ERROR ELIMINACIÓN AUTH]', deleteAuthErr.message);
        return new Response(JSON.stringify({ error: 'No fue posible eliminar la cuenta de autenticación del usuario' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Si no tiene auth_user_id, verificar si existe en auth.users por email técnico y eliminarlo
      const technicalEmail = `${targetUser.national_id}@camionescaidos.internal`;
      const { data: authList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const orphanAuthUser = authList?.users?.find(
        (u: any) => u.email?.toLowerCase() === technicalEmail.toLowerCase()
      );
      if (orphanAuthUser) {
        const { error: deleteOrphanErr } = await adminClient.auth.admin.deleteUser(orphanAuthUser.id);
        if (deleteOrphanErr) {
          console.error('[ERROR ELIMINACIÓN AUTH HUÉRFANO]', deleteOrphanErr.message);
          return new Response(JSON.stringify({ error: 'No fue posible eliminar la cuenta de autenticación asociada' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // 11. ELIMINACIÓN DEL PERFIL EN public.app_users
    const { error: deleteDbErr } = await adminClient
      .from('app_users')
      .delete()
      .eq('id', targetAppUserId);

    if (deleteDbErr) {
      console.error('[ERROR INCONSISTENCIA CRÍTICA] Usuario eliminado en Auth pero falló DELETE en app_users:', deleteDbErr.message);
      return new Response(JSON.stringify({ error: 'No fue posible eliminar el usuario en la base de datos tras eliminar su autenticación' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 13. RESPUESTA DE ÉXITO
    return new Response(JSON.stringify({
      success: true,
      message: 'Usuario eliminado correctamente',
      targetAppUserId: targetUser.id,
      targetAuthUserId: targetAuthUserId || null
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('[ERROR NO CONTROLADO ADMIN-DELETE-USER]', err?.message);
    return new Response(JSON.stringify({ error: 'No fue posible eliminar el usuario' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
