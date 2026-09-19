-- ==============================================================================
-- Migración: Bloque A - Extensión de Notificaciones para Eventos Operacionales
-- ==============================================================================

-- 1. Agregar nuevas columnas a public.notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'shift_alert',
ADD COLUMN IF NOT EXISTS report_id TEXT NULL,
ADD COLUMN IF NOT EXISTS event_key TEXT NULL,
ADD COLUMN IF NOT EXISTS metadata JSONB NULL;

-- 2. Restricción para valores permitidos de event_type
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS check_notifications_event_type;

ALTER TABLE public.notifications
ADD CONSTRAINT check_notifications_event_type
CHECK (event_type IN ('shift_alert', 'new_report', 'status_change'));

-- 3. Permitir evaluation_moment NULL para eventos operacionales
ALTER TABLE public.notifications
ALTER COLUMN evaluation_moment DROP NOT NULL;

-- 4. Actualizar restricción de evaluation_moment:
-- Para shift_alert es estrictamente obligatorio ('06:30' o '18:30').
-- Para eventos operacionales (new_report, status_change) debe ser NULL.
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS check_notifications_moment;

ALTER TABLE public.notifications
ADD CONSTRAINT check_notifications_moment
CHECK (
  (event_type = 'shift_alert' AND evaluation_moment IS NOT NULL AND evaluation_moment IN ('06:30', '18:30'))
  OR
  (event_type != 'shift_alert' AND evaluation_moment IS NULL)
);

-- 5. Restricción de unicidad para idempotencia de eventos operacionales
-- Para shift_alert continúa aplicando uq_notifications_user_shift_moment intacto.
-- Para eventos operacionales con event_key no nulo, garantiza una sola notificación por destinatario.
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS uq_notifications_user_event_key;

ALTER TABLE public.notifications
ADD CONSTRAINT uq_notifications_user_event_key
UNIQUE (user_id, event_key);

-- 6. Índices de optimización para consultas operacionales
CREATE INDEX IF NOT EXISTS idx_notifications_report_id
ON public.notifications (report_id)
WHERE report_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_event_type
ON public.notifications (event_type);

-- 7. Actualizar el trigger de inmutabilidad de public.notifications
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

  IF NEW.event_type IS DISTINCT FROM OLD.event_type THEN
    RAISE EXCEPTION 'Operación denegada: event_type es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.report_id IS DISTINCT FROM OLD.report_id THEN
    RAISE EXCEPTION 'Operación denegada: report_id es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.event_key IS DISTINCT FROM OLD.event_key THEN
    RAISE EXCEPTION 'Operación denegada: event_key es inmutable.' USING ERRCODE = '42501';
  END IF;

  IF NEW.metadata IS DISTINCT FROM OLD.metadata THEN
    RAISE EXCEPTION 'Operación denegada: metadata es inmutable.' USING ERRCODE = '42501';
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
