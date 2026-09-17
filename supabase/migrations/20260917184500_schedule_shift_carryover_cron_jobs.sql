-- ==============================================================================
-- Migración: Programación Idempotente de Cron Jobs para Alertas de Cambio de Turno
-- Fecha: 2026-09-17 18:45:00
-- ==============================================================================

DO $$
BEGIN
  -- 1. Cron Matutino: 06:30 COT (11:30 UTC)
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'evaluate-shift-carryover-morning-0630'
  ) THEN
    PERFORM cron.schedule(
      'evaluate-shift-carryover-morning-0630',
      '30 11 * * *',
      'SELECT public.dispatch_shift_carryover_evaluation(''06:30'');'
    );
  END IF;

  -- 2. Cron Vespertino: 18:30 COT (23:30 UTC)
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'evaluate-shift-carryover-evening-1830'
  ) THEN
    PERFORM cron.schedule(
      'evaluate-shift-carryover-evening-1830',
      '30 23 * * *',
      'SELECT public.dispatch_shift_carryover_evaluation(''18:30'');'
    );
  END IF;
END;
$$;
