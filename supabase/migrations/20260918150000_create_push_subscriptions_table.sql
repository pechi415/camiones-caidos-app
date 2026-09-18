-- ==============================================================================
-- Migración: L10.6-B.7.3 - Infraestructura de push_subscriptions y RLS
-- ==============================================================================

-- 1. Crear tabla public.push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id TEXT NOT NULL
        REFERENCES public.app_users(id)
        ON DELETE CASCADE,

    auth_user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    endpoint TEXT NOT NULL,

    p256dh TEXT NOT NULL,

    auth TEXT NOT NULL,

    user_agent TEXT,

    platform TEXT DEFAULT 'unknown'
        CHECK (platform IN (
            'android',
            'ios',
            'desktop',
            'unknown'
        )),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    last_used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint)
);

-- 2. Índices de optimización
-- Justificación: Acelera la consulta y filtrado de suscripciones activas del usuario autenticado (RLS auth.uid() = auth_user_id)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_auth_active
ON public.push_subscriptions (auth_user_id)
WHERE is_active = TRUE;

-- Justificación: Acelera la búsqueda de suscripciones activas por user_id durante el despacho de notificaciones de turno
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
ON public.push_subscriptions (user_id)
WHERE is_active = TRUE;

-- 3. Trigger de integridad, inmutabilidad y updated_at
CREATE OR REPLACE FUNCTION public.trg_protect_push_subscriptions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expected_user_id TEXT;
BEGIN
  -- 1. Bypass seguro para backend / service_role y postgres directo:
  IF (auth.jwt() ->> 'role') = 'service_role' OR (session_user = 'postgres' AND auth.jwt() IS NULL) THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.updated_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- 2. Validaciones para usuarios autenticados
  IF TG_OP = 'INSERT' THEN
    -- auth_user_id SIEMPRE debe ser auth.uid()
    IF NEW.auth_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Operación denegada: auth_user_id debe coincidir con el usuario autenticado.' USING ERRCODE = '42501';
    END IF;

    -- user_id debe corresponder al perfil legítimo del usuario autenticado en app_users
    SELECT id INTO v_expected_user_id
    FROM public.app_users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_expected_user_id IS NULL OR NEW.user_id IS DISTINCT FROM v_expected_user_id THEN
      RAISE EXCEPTION 'Operación denegada: user_id no corresponde a su perfil en app_users.' USING ERRCODE = '42501';
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Inmutabilidad de id y created_at
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Operación denegada: id es inmutable.' USING ERRCODE = '42501';
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Operación denegada: created_at es inmutable.' USING ERRCODE = '42501';
    END IF;

    -- Inmutabilidad de auth_user_id y user_id para usuarios normales en UPDATE
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'Operación denegada: auth_user_id es inmutable.' USING ERRCODE = '42501';
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Operación denegada: user_id es inmutable.' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Actualizar timestamp automáticamente
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_push_subscriptions_trigger ON public.push_subscriptions;
CREATE TRIGGER protect_push_subscriptions_trigger
BEFORE INSERT OR UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_push_subscriptions();

-- 4. Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuario autenticado solo ve sus propias suscripciones
DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- INSERT: Usuario autenticado solo inserta con su propio auth.uid() y su user_id legítimo
DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
FOR INSERT TO authenticated
WITH CHECK (
  auth_user_id = auth.uid()
  AND user_id IN (
    SELECT id FROM public.app_users WHERE auth_user_id = auth.uid()
  )
);

-- UPDATE: Usuario autenticado solo actualiza sus propias suscripciones
DROP POLICY IF EXISTS "push_subscriptions_update_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update_own" ON public.push_subscriptions
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (
  auth_user_id = auth.uid()
  AND user_id IN (
    SELECT id FROM public.app_users WHERE auth_user_id = auth.uid()
  )
);

-- DELETE: Usuario autenticado solo elimina sus propias suscripciones
DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own" ON public.push_subscriptions
FOR DELETE TO authenticated
USING (auth_user_id = auth.uid());

-- Sin políticas para rol 'anon' (todo acceso anónimo queda estrictamente bloqueado por RLS)
