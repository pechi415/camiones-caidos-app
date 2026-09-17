-- ==============================================================================
-- Migración: Creación de Dispatcher Seguro para Alertas de Cambio de Turno
-- Fecha: 2026-09-17 18:30:00
-- ==============================================================================

-- 1. Asegurar extensiones para scheduling y peticiones HTTP asíncronas
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Función mediadora segura (SECURITY DEFINER)
-- Invoca la Edge Function evaluate-shift-carryover leyendo el secreto desde Vault.
-- No expone secretos ni tokens en código versionado ni scripts cron.
CREATE OR REPLACE FUNCTION public.dispatch_shift_carryover_evaluation(p_moment text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net, pg_catalog
AS $$
DECLARE
  v_secret text;
  v_request_id bigint;
BEGIN
  -- Validación estricta del momento de evaluación
  IF p_moment NOT IN ('06:30', '18:30') THEN
    RAISE EXCEPTION 'Momento de evaluación no válido: %. Valores permitidos: "06:30" o "18:30".', p_moment;
  END IF;

  -- Lectura en memoria del secreto cifrado desde Supabase Vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'scheduler_secret'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'Secreto scheduler_secret no encontrado en Vault.';
  END IF;

  -- Despacho asíncrono no bloqueante vía pg_net
  SELECT net.http_post(
    url := 'https://zagiwbgajnxrdgruhthm.supabase.co/functions/v1/evaluate-shift-carryover',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-scheduler-secret', v_secret
    ),
    body := jsonb_build_object(
      'evaluationMoment', p_moment
    )
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- 3. Protección de acceso al Dispatcher
-- Revocar ejecución a todos los clientes web (anónimos y autenticados)
REVOKE ALL ON FUNCTION public.dispatch_shift_carryover_evaluation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_shift_carryover_evaluation(text) FROM anon;
REVOKE ALL ON FUNCTION public.dispatch_shift_carryover_evaluation(text) FROM authenticated;

-- Conceder ejecución exclusivamente a roles internos administrativos/motor
GRANT EXECUTE ON FUNCTION public.dispatch_shift_carryover_evaluation(text) TO postgres;
GRANT EXECUTE ON FUNCTION public.dispatch_shift_carryover_evaluation(text) TO service_role;
