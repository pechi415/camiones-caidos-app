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

-- ==============================================================================
-- 4. Funciones Helper de Autorización (SECURITY DEFINER, STABLE, search_path = public)
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
-- 5. Blindaje de Columnas de app_users (Trigger BEFORE UPDATE)
-- ==============================================================================

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
  -- CRÍTICO: NO usar current_user = 'postgres' porque al ser una función SECURITY DEFINER,
  -- current_user siempre evalúa al dueño de la función ('postgres') para TODOS los llamantes (incluso anon o Digitador).
  -- Se valida estrictamente el claim del token JWT o una sesión nativa de base de datos sin JWT:
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

-- ==============================================================================
-- 6. Row Level Security (RLS) y Policies Restrictivas (11 Policies)
-- ==============================================================================

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_reports ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6.1 Policies para public.app_users (3 policies)
-- Nota: No hay policies de INSERT ni DELETE para authenticated; la creación y
-- eliminación se realiza de forma segura vía Edge Functions (service_role).
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
-- 6.2 Policies para public.operators (4 policies)
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
-- 6.3 Policies para public.truck_reports (4 policies)
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

-- ==============================================================================
-- 7. Datos Iniciales Obligatorios (Seed Opcional)
-- ==============================================================================
INSERT INTO app_users (id, national_id, name, role, mine, group_name, must_change_password)
VALUES 
    ('u1', '7574445', 'Alexander Francisco Ramirez Cordoba', 'Administrador', 'El Descanso', 'Grupo 1', true),
    ('u2', '18955918', 'Efrain Jose Tafur Buelvas', 'Encargado', 'El Descanso', 'Grupo 1', false)
ON CONFLICT (national_id) DO NOTHING;
