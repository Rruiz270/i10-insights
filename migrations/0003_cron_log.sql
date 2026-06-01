-- Cron execution log. Every time a cron endpoint is actually reached it records
-- the outcome here, so a silent failure (Manus error, webhook miss, bad config)
-- becomes visible in the admin instead of vanishing.
--
-- NOTE: a wrong cron PATH returns 404 and never reaches the route, so it can't
-- log itself. The signal for that case is the *absence* of recent rows — the
-- admin surfaces staleness ("nenhuma geração há N dias") from this table.

CREATE TABLE IF NOT EXISTS insights.cron_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job         text        NOT NULL,   -- 'daily-brief' | 'approval-reminder'
  status      text        NOT NULL,   -- 'ok' | 'error'
  detail      jsonb,                  -- task_id, category, stage, error, etc.
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cron_log_job_created_idx
  ON insights.cron_log (job, created_at DESC);

INSERT INTO insights._migrations (id) VALUES ('0003_cron_log')
  ON CONFLICT (id) DO NOTHING;
