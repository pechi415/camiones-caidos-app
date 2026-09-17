-- ==============================================================================
-- Migración: L10.6-B.2 - Infraestructura de Notificaciones y is_active
-- ==============================================================================

-- 1. Agregar columna is_active a public.app_users
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Garantizar que todos los usuarios existentes tengan is_active = true
UPDATE public.app_users
SET is_active = TRUE
WHERE is_active IS NOT TRUE;

-- 2. Actualizar el trigger de protección de columnas de app_users
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

-- Re-vincular trigger si no estuviese activo
DROP TRIGGER IF EXISTS protect_app_users_columns_trigger ON public.app_users;
CREATE TRIGGER protect_app_users_columns_trigger
BEFORE UPDATE ON public.app_users
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_app_users_columns();

-- 3. Crear tabla public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
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

-- 4. Índices de optimización
-- Justificación: Acelera la consulta del feed personal del usuario autenticado ordenado cronológicamente (apoya el filtro RLS auth.uid() = auth_user_id)
CREATE INDEX IF NOT EXISTS idx_notifications_auth_user_created
ON public.notifications (auth_user_id, created_at DESC);

-- Justificación: Índice parcial ultraligero para el conteo instantáneo de notificaciones no leídas (badge de la campana en UI)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON public.notifications (auth_user_id)
WHERE is_read = FALSE;

-- 5. Trigger de protección de columnas para public.notifications
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

-- 6. Row Level Security (RLS) en notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Usuario autenticado solo lee sus propias notificaciones
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- Política UPDATE: Usuario autenticado solo actualiza sus propias notificaciones (is_read / read_at)
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Sin políticas de INSERT ni DELETE para authenticated ni anon
-- Toda creación se realiza exclusivamente vía Edge Functions con service_role

-- 7. Agregar notifications a la publicación Realtime
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
