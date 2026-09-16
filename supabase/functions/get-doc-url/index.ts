import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

// Documentos permitidos y mapeo estricto a Storage (inmune a path traversal)
const ALLOWED_DOCS: Record<string, string> = {
  user: 'user/MANUAL_USUARIO_CAMIONES_CAIDOS.pdf',
  admin: 'admin/MANUAL_ADMINISTRATIVO_CAMIONES_CAIDOS.pdf'
};

// Duración de la URL firmada en segundos
const SIGNED_URL_EXPIRES_IN = 60;
const BUCKET_NAME = 'docs-private';

serve(async (req: Request) => {
  // Manejo de CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 1. Exigir método HTTP POST
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

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración interna del servidor incompleta.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Exigir header Authorization: Bearer <JWT>
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado. Cabecera Authorization requerida.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado. Token no proporcionado.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 3. Validar el JWT del usuario mediante el mecanismo oficial de Supabase
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user: callerUser }, error: callerAuthErr } = await callerClient.auth.getUser(token);
    if (callerAuthErr || !callerUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sesión no válida o expirada.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 4. Cliente administrativo interno (service_role no expuesta al cliente)
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 5. Consultar public.app_users vinculando app_users.auth_user_id = callerUser.id
    const { data: userProfile, error: profileErr } = await adminClient
      .from('app_users')
      .select('id, role, mine, name')
      .eq('auth_user_id', callerUser.id)
      .single();

    if (profileErr || !userProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuario no registrado en el sistema.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 6. Validar payload JSON del cliente
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Payload JSON inválido.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const requestedDoc = String(body.document || body.docType || '').trim().toLowerCase();

    // 7. Validar documento permitido (rechaza rutas arbitrarias, path traversal, etc.)
    if (!requestedDoc || !(requestedDoc in ALLOWED_DOCS)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Documento no permitido o no especificado. Valores aceptados: "user", "admin".'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 8. Autorización por rol
    // Roles oficiales actuales: Administrador, Encargado, Digitador
    const role = userProfile.role;

    if (role === 'Digitador') {
      // Digitador solo puede solicitar "user", NUNCA "admin"
      if (requestedDoc !== 'user') {
        console.warn(`[get-doc-url] Acceso denegado: rol "${role}" intentó acceder a doc "${requestedDoc}"`);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Acceso denegado. Su rol no tiene permisos para consultar este documento.'
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else if (role === 'Administrador' || role === 'Encargado') {
      // Administrador y Encargado pueden solicitar "user" y "admin"
      // Autorizado
    } else {
      // Cualquier otro rol desconocido
      console.warn(`[get-doc-url] Acceso denegado: rol desconocido "${role}"`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Acceso denegado. Rol no autorizado.'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 9. Generar URL firmada de corta duración (60 segundos) en bucket privado
    const storagePath = ALLOWED_DOCS[requestedDoc];
    const { data: signData, error: signError } = await adminClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN);

    if (signError || !signData?.signedUrl) {
      const errMsg = signError?.message || '';
      if (errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('nosuchkey')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Documento no encontrado en el almacenamiento.' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.error('[get-doc-url] Error generando URL firmada');
      return new Response(
        JSON.stringify({ success: false, error: 'Error interno al generar enlace seguro para el documento.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Normalizar a URL completa si el SDK devuelve ruta relativa
    let fullSignedUrl = signData.signedUrl;
    if (fullSignedUrl && !fullSignedUrl.startsWith('http://') && !fullSignedUrl.startsWith('https://')) {
      if (fullSignedUrl.startsWith('/storage/v1')) {
        fullSignedUrl = `${supabaseUrl}${fullSignedUrl}`;
      } else {
        const cleanPath = fullSignedUrl.startsWith('/') ? fullSignedUrl : `/${fullSignedUrl}`;
        fullSignedUrl = `${supabaseUrl}/storage/v1${cleanPath}`;
      }
    }

    console.log(`[get-doc-url] doc="${requestedDoc}" role="${role}" status=SUCCESS`);

    // 10. Respuesta exitosa HTTP 200
    return new Response(
      JSON.stringify({
        success: true,
        document: requestedDoc,
        url: fullSignedUrl,
        expires_in: SIGNED_URL_EXPIRES_IN
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (_err) {
    // Log seguro sin secretos
    console.error('[get-doc-url] Error inesperado en el procesamiento de la solicitud');
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
