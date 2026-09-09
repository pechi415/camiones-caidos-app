import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

const AUTH_DOMAIN = 'camionescaidos.internal';
const TEMP_PASSWORD = 'caidos1234';
const VALID_ROLES = ['Administrador', 'Encargado', 'Digitador'];
const VALID_MINES = ['El Descanso', 'Pribbenow'];

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

    // 3. Validar payload de creación
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Payload JSON inválido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const name = String(body.name || '').trim();
    const rawNationalId = String(body.nationalId || '').trim();
    const nationalId = rawNationalId.replace(/\D/g, '');
    const role = String(body.role || '').trim();
    const mine = String(body.mine || '').trim();
    const group = String(body.group || '').trim() || 'Grupo 1';
    const avatar = String(body.avatar || '').trim();

    if (!name || name.length < 3) {
      return new Response(JSON.stringify({ success: false, error: 'El nombre completo es obligatorio y debe tener al menos 3 caracteres.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!nationalId || nationalId.length < 5) {
      return new Response(JSON.stringify({ success: false, error: 'La cédula es obligatoria y debe tener al menos 5 dígitos.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return new Response(JSON.stringify({ success: false, error: `Rol inválido. Roles permitidos: ${VALID_ROLES.join(', ')}.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!VALID_MINES.includes(mine)) {
      return new Response(JSON.stringify({ success: false, error: `Mina inválida. Minas permitidas: ${VALID_MINES.join(', ')}.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const technicalEmail = `${nationalId}@${AUTH_DOMAIN}`;

    // 4. Comprobación de duplicados
    const { data: existingDbUser } = await adminClient
      .from('app_users')
      .select('id')
      .eq('national_id', nationalId)
      .maybeSingle();

    if (existingDbUser) {
      return new Response(JSON.stringify({ success: false, error: 'El número de identificación ya se encuentra registrado.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: authUsersList } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = authUsersList?.users?.find(
      u => u.email?.toLowerCase() === technicalEmail.toLowerCase()
    );

    if (existingAuthUser) {
      return new Response(JSON.stringify({ success: false, error: 'El correo técnico de autenticación ya existe en el sistema.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. Creación en Supabase Auth
    const newUserId = `u-${Date.now()}`;
    const { data: newAuthData, error: createAuthErr } = await adminClient.auth.admin.createUser({
      email: technicalEmail,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        national_id: nationalId,
        app_user_id: newUserId
      }
    });

    if (createAuthErr || !newAuthData?.user) {
      return new Response(JSON.stringify({ success: false, error: createAuthErr?.message || 'Error al crear la cuenta en Supabase Auth.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authUserId = newAuthData.user.id;

    // 6. Inserción en public.app_users (la contraseña no forma parte del perfil de app_users; se gestiona exclusivamente mediante Supabase Auth)
    const { data: insertedUser, error: insertDbErr } = await adminClient
      .from('app_users')
      .insert({
        id: newUserId,
        national_id: nationalId,
        name,
        role,
        mine,
        group_name: group,
        avatar: avatar || null,
        auth_user_id: authUserId,
        must_change_password: true
      })
      .select('id, national_id, name, role, mine, group_name, avatar, auth_user_id, must_change_password, created_at')
      .single();

    // 7. Acción compensatoria inmediata (Rollback) si falla la inserción en DB
    if (insertDbErr || !insertedUser) {
      console.error('[ROLLBACK COMPENSATORIO] Falló inserción en app_users, eliminando cuenta Auth recién creada:', authUserId);
      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(authUserId);
      if (deleteErr) {
        console.error('[ALERTA CRÍTICA] Falló la eliminación compensatoria en Auth:', deleteErr);
      }
      return new Response(JSON.stringify({ success: false, error: 'Error al registrar el perfil de usuario. La operación fue revertida.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 8. Respuesta sanitizada de éxito (201 Created)
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: insertedUser.id,
        nationalId: insertedUser.national_id,
        name: insertedUser.name,
        role: insertedUser.role,
        mine: insertedUser.mine,
        group: insertedUser.group_name,
        avatar: insertedUser.avatar || '',
        authUserId: insertedUser.auth_user_id,
        mustChangePassword: insertedUser.must_change_password,
        createdAt: insertedUser.created_at
      }
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Error interno del servidor.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}, { port: Number(Deno.env.get('PORT') || 8000) });
