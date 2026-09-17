-- Script de Creación de Tablas, Funciones y Seguridad para Camiones Caídos en Supabase

-- 1. Tabla de Usuarios (Perfiles de aplicación vinculados a Supabase Auth)
-- La autenticación se gestiona exclusivamente en auth.users (Supabase Auth).
-- app_users almacena el perfil de aplicación y metadatos operativos.
-- La columna legacy 'password' no pertenece a app_users.
-- 'must_change_password' se conserva como bandera funcional válida.
CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Encargado',
    mine TEXT NOT NULL DEFAULT 'Pribbenow',
    group_name TEXT NOT NULL DEFAULT 'Grupo 1',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT TRUE,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    auth_user_id UUID UNIQUE
);

-- 2. Tabla de Operadores
CREATE TABLE IF NOT EXISTS operators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mine TEXT NOT NULL DEFAULT 'Pribbenow',
    group_name TEXT NOT NULL DEFAULT 'Grupo 1',
    status TEXT DEFAULT 'Activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Reportes de Camiones Caídos
CREATE TABLE IF NOT EXISTS truck_reports (
    id TEXT PRIMARY KEY,
    truck_id TEXT NOT NULL,
    mine TEXT NOT NULL,
    shift TEXT NOT NULL DEFAULT 'Diurno',
    operator TEXT,
    system TEXT,
    detail TEXT,
    location TEXT,
    status TEXT DEFAULT 'DOWN',
    down_time TEXT,
    estimated_return_time TEXT,
    actual_return_time TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    operator_id TEXT
);

-- 4. Tabla de Notificaciones del Sistema (Alertas de Cambio de Turno)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mine TEXT NOT NULL,
    shift TEXT NOT NULL,
    group_name TEXT NOT NULL,
    operational_date DATE NOT NULL,
    evaluation_moment TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    truck_count INTEGER NOT NULL,
    truck_ids TEXT[] DEFAULT '{}'::TEXT[],
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_notifications_shift CHECK (shift IN ('Diurno', 'Nocturno')),
    CONSTRAINT check_notifications_moment CHECK (evaluation_moment IN ('06:30', '18:30')),
    CONSTRAINT check_notifications_truck_count CHECK (truck_count >= 0),
    CONSTRAINT check_notifications_read_at CHECK (read_at IS NULL OR is_read = TRUE),
    CONSTRAINT uq_notifications_user_shift_moment UNIQUE (user_id, mine, shift, operational_date, evaluation_moment)
);

-- ==============================================================================
-- 5. Funciones Helper de Autorización (SECURITY DEFINER, STABLE, search_path = public)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_mine()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT mine FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_user_id = auth.uid() AND role = 'Administrador'
  );
$$;

-- Restricción de permisos de ejecución: solo authenticated y service_role
REVOKE EXECUTE ON FUNCTION public.get_auth_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_mine() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_user_mine() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- ==============================================================================
-- 6. Blindaje de Columnas (Triggers BEFORE UPDATE)
-- ==============================================================================

-- 6.1 Protección de Columnas de app_users
CREATE OR REPLACE FUNCTION public.trg_protect_app_users_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 1. Reglas de Inmutabilidad Absoluta (Aplica a TODO UPDATE: Admin, service_role y usuarios):
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Operación denegada: id es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.national_id IS DISTINCT FROM OLD.national_id THEN
    RAISE EXCEPTION 'Operación denegada: national_id es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Operación denegada: auth_user_id es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Operación denegada: created_at es inmutable.' USING ERRCODE = '42501';
  END IF;

  -- 2. Bypass seguro para backend / service_role (Edge Functions con service_role o DBA directo sin JWT):
  IF (auth.jwt() ->> 'role') = 'service_role' OR (session_user = 'postgres' AND auth.jwt() IS NULL) THEN
    RETURN NEW;
  END IF;

  -- 3. Restricciones para usuarios NO Administradores:
  IF NOT public.is_admin() THEN
    -- Prohibir alteración de role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Operación denegada: No tiene privilegios para modificar role.' USING ERRCODE = '42501';
    END IF;

    -- Prohibir alteración de mine
    IF NEW.mine IS DISTINCT FROM OLD.mine THEN
      RAISE EXCEPTION 'Operación denegada: No tiene privilegios para modificar mine.' USING ERRCODE = '42501';
    END IF;

    -- Prohibir alteración de group_name
    IF NEW.group_name IS DISTINCT FROM OLD.group_name THEN
      RAISE EXCEPTION 'Operación denegada: No tiene privilegios para modificar group_name.' USING ERRCODE = '42501';
    END IF;

    -- Prohibir alteración de name
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      RAISE EXCEPTION 'Operación denegada: No tiene privilegios para modificar name.' USING ERRCODE = '42501';
    END IF;

    -- Prohibir alteración de is_active a no administradores
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Operación denegada: No tiene privilegios para modificar is_active.' USING ERRCODE = '42501';
    END IF;

    -- Respecto a must_change_password:
    -- permitir true -> false, pero impedir false -> true
    IF OLD.must_change_password IS FALSE AND NEW.must_change_password IS TRUE THEN
      RAISE EXCEPTION 'Operación denegada: No puede reactivar el cambio obligatorio de contraseña.' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_app_users_columns_trigger ON public.app_users;
CREATE TRIGGER protect_app_users_columns_trigger
BEFORE UPDATE ON public.app_users
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_app_users_columns();

-- 6.2 Protección de Columnas de notifications
CREATE OR REPLACE FUNCTION public.trg_protect_notifications_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Bypass seguro para backend / service_role:
  IF (auth.jwt() ->> 'role') = 'service_role' OR (session_user = 'postgres' AND auth.jwt() IS NULL) THEN
    RETURN NEW;
  END IF;

  -- Para usuarios normales: id, llaves, metadatos y contenido son inmutables
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Operación denegada: id es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Operación denegada: user_id es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Operación denegada: auth_user_id es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.mine IS DISTINCT FROM OLD.mine THEN
    RAISE EXCEPTION 'Operación denegada: mine es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.shift IS DISTINCT FROM OLD.shift THEN
    RAISE EXCEPTION 'Operación denegada: shift es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.group_name IS DISTINCT FROM OLD.group_name THEN
    RAISE EXCEPTION 'Operación denegada: group_name es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.operational_date IS DISTINCT FROM OLD.operational_date THEN
    RAISE EXCEPTION 'Operación denegada: operational_date es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.evaluation_moment IS DISTINCT FROM OLD.evaluation_moment THEN
    RAISE EXCEPTION 'Operación denegada: evaluation_moment es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title THEN
    RAISE EXCEPTION 'Operación denegada: title es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.message IS DISTINCT FROM OLD.message THEN
    RAISE EXCEPTION 'Operación denegada: message es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.truck_count IS DISTINCT FROM OLD.truck_count THEN
    RAISE EXCEPTION 'Operación denegada: truck_count es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.truck_ids IS DISTINCT FROM OLD.truck_ids THEN
    RAISE EXCEPTION 'Operación denegada: truck_ids es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Operación denegada: created_at es inmutable.' USING ERRCODE = '42501';
  END IF;

  -- Auto-asignar read_at si is_read pasa a true y read_at no fue provisto
  IF NEW.is_read IS TRUE AND NEW.read_at IS NULL THEN
    NEW.read_at := NOW();
  END IF;

  -- Limpiar read_at si se desmarca lectura
  IF NEW.is_read IS FALSE THEN
    NEW.read_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_notifications_columns_trigger ON public.notifications;
CREATE TRIGGER protect_notifications_columns_trigger
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_notifications_columns();

-- ==============================================================================
-- 7. Row Level Security (RLS) y Policies Restrictivas (13 Policies)
-- ==============================================================================

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 7.1 Policies para public.app_users (3 policies)
-- ------------------------------------------------------------------------------
CREATE POLICY "app_users_select_authenticated" ON public.app_users
FOR SELECT TO authenticated
USING (is_admin() OR (auth_user_id = auth.uid()));

CREATE POLICY "app_users_update_admin" ON public.app_users
FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "app_users_update_self" ON public.app_users
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 7.2 Policies para public.operators (4 policies)
-- ------------------------------------------------------------------------------
CREATE POLICY "operators_select_authenticated" ON public.operators
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "operators_insert_admin" ON public.operators
FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "operators_update_admin" ON public.operators
FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "operators_delete_admin" ON public.operators
FOR DELETE TO authenticated
USING (is_admin());

-- ------------------------------------------------------------------------------
-- 7.3 Policies para public.truck_reports (4 policies)
-- ------------------------------------------------------------------------------
CREATE POLICY "truck_reports_select_authenticated" ON public.truck_reports
FOR SELECT TO authenticated
USING (is_admin() OR (mine = get_auth_user_mine()));

CREATE POLICY "truck_reports_insert_authenticated" ON public.truck_reports
FOR INSERT TO authenticated
WITH CHECK (is_admin() OR (mine = get_auth_user_mine()));

CREATE POLICY "truck_reports_update_authenticated" ON public.truck_reports
FOR UPDATE TO authenticated
USING (is_admin() OR (mine = get_auth_user_mine()))
WITH CHECK (is_admin() OR (mine = get_auth_user_mine()));

CREATE POLICY "truck_reports_delete_authenticated" ON public.truck_reports
FOR DELETE TO authenticated
USING (is_admin() OR ((get_auth_user_role() = 'Encargado') AND (mine = get_auth_user_mine())));

-- ------------------------------------------------------------------------------
-- 7.4 Policies para public.notifications (2 policies)
-- Nota: Solo lectura y actualización (is_read/read_at) de notificaciones propias.
-- No hay INSERT ni DELETE para clientes; creación exclusiva vía Edge Function (service_role).
-- ------------------------------------------------------------------------------
CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- ==============================================================================
-- 8. Índices de Optimización para Notificaciones
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_auth_user_created
ON public.notifications (auth_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON public.notifications (auth_user_id)
WHERE is_read = FALSE;

-- ==============================================================================
-- 9. Publicación Realtime
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ==============================================================================
-- 10. Datos Iniciales Obligatorios (Seed Opcional)
-- ==============================================================================
INSERT INTO app_users (id, national_id, name, role, mine, group_name, is_active, must_change_password)
VALUES
    ('u1', '7574445', 'Alexander Francisco Ramirez Cordoba', 'Administrador', 'El Descanso', 'Grupo 1', true, true),
    ('u2', '18955918', 'Efrain Jose Tafur Buelvas', 'Encargado', 'El Descanso', 'Grupo 1', true, false)
ON CONFLICT (national_id) DO NOTHING;
