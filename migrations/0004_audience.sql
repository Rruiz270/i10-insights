-- Audience — consolidated contact base across every i10 source (webinars,
-- lead magnets, and external prefeitura/mayor lists). Lives in its own schema,
-- in the same database as crm.* so it can feed the CRM later without a migration.
--
-- One row = one reachable contact (email and/or phone). A single municipality
-- row in a source file explodes into several rows here (mayor / city-hall /
-- education secretary), each with its own `role`.

CREATE SCHEMA IF NOT EXISTS audience;

CREATE TABLE IF NOT EXISTS audience.contacts (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email        text,                  -- lowercased; nullable
  phone        text,                  -- digits-ish, nullable
  name         text,
  role         text,                  -- 'prefeito' | 'prefeitura' | 'educacao' | 'inscrito' | 'lead'
  municipio    text,
  uf           text,
  source       text NOT NULL,         -- 'bncc-webinar' | 'apm-fundeb-webinar' | 'file-prefeitos-br' | 'file-paraiba' | 'file-brasil-edu' | 'report-downloads'
  segment      text,                  -- 'inscrito' | 'prefeito-base' | 'secretaria-educacao' | ...
  consent      boolean,               -- opt-in where the source records it (else NULL = unknown)
  attributes   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- partido, populacao, reeleito, cargo, etc.
  external_ref text,                  -- reserved for future CRM linkage
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- A contact must be reachable somehow.
  CONSTRAINT contacts_reachable CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Dedup key: same (source, email, phone, role) collapses on re-import.
-- COALESCE so NULLs don't defeat uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS contacts_dedup_idx
  ON audience.contacts (
    source,
    coalesce(email, ''),
    coalesce(phone, ''),
    coalesce(role, '')
  );

CREATE INDEX IF NOT EXISTS contacts_email_idx ON audience.contacts (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS contacts_source_idx ON audience.contacts (source);
CREATE INDEX IF NOT EXISTS contacts_uf_idx ON audience.contacts (uf);

INSERT INTO insights._migrations (id) VALUES ('0004_audience')
  ON CONFLICT (id) DO NOTHING;
