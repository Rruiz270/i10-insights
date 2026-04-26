-- i10 Insights — initial schema
-- All objects live under the `insights` schema. Never touches crm.*, audit.*, or any other schema.

CREATE SCHEMA IF NOT EXISTS insights;

-- Idempotent migration tracking
CREATE TABLE IF NOT EXISTS insights._migrations (
  id          text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── article categories ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE insights.category AS ENUM (
    'politica',       -- política & equidade (segunda)
    'sala_de_aula',   -- sala de aula (terça)
    'pesquisa',       -- pesquisa (quarta)
    'ferramentas',    -- ferramentas & LLMs (quinta)
    'etica'           -- ética & futuro (sexta)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE insights.draft_status AS ENUM (
    'pending',     -- waiting for human review
    'approved',    -- human-approved, ready to publish
    'published',   -- moved to insights.articles
    'rejected',    -- explicitly rejected, archived
    'failed'       -- Manus pipeline error, archived
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE insights.subscriber_status AS ENUM (
    'pending_confirmation',  -- LGPD double opt-in: waiting for email confirmation
    'confirmed',
    'unsubscribed',
    'bounced',
    'complained'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── drafts (Manus output, pre-approval) ─────────────────────────────
CREATE TABLE IF NOT EXISTS insights.drafts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  status            insights.draft_status NOT NULL DEFAULT 'pending',
  manus_task_id     text,
  category          insights.category NOT NULL,

  title_pt          text NOT NULL,
  title_en          text NOT NULL,
  slug_pt           text NOT NULL,
  slug_en           text NOT NULL,
  excerpt_pt        text NOT NULL,
  excerpt_en        text NOT NULL,
  body_pt           text NOT NULL,    -- markdown
  body_en           text NOT NULL,    -- markdown

  hero_image_url    text,
  hero_image_alt_pt text,
  hero_image_alt_en text,

  citations         jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{url,title,publisher,published_at}]
  banned_word_hits  jsonb,                                -- {word: count} from voice validator

  approved_by       text,
  approved_at       timestamptz,
  rejection_reason  text
);

CREATE INDEX IF NOT EXISTS drafts_status_created_idx
  ON insights.drafts (status, created_at DESC);

-- ─── articles (published, public) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS insights.articles (
  id                uuid PRIMARY KEY,                      -- same id as the originating draft
  draft_id          uuid REFERENCES insights.drafts(id),
  published_at      timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  category          insights.category NOT NULL,

  title_pt          text NOT NULL,
  title_en          text NOT NULL,
  slug_pt           text NOT NULL UNIQUE,
  slug_en           text NOT NULL UNIQUE,
  excerpt_pt        text NOT NULL,
  excerpt_en        text NOT NULL,
  body_pt           text NOT NULL,
  body_en           text NOT NULL,

  hero_image_url    text,
  hero_image_alt_pt text,
  hero_image_alt_en text,

  citations         jsonb NOT NULL DEFAULT '[]'::jsonb,
  view_count        integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS articles_published_idx
  ON insights.articles (published_at DESC);
CREATE INDEX IF NOT EXISTS articles_category_published_idx
  ON insights.articles (category, published_at DESC);

-- ─── subscribers (newsletter, LGPD-compliant) ────────────────────────
CREATE TABLE IF NOT EXISTS insights.subscribers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 text NOT NULL,
  locale                text NOT NULL DEFAULT 'pt',  -- 'pt' | 'en'
  status                insights.subscriber_status NOT NULL DEFAULT 'pending_confirmation',
  confirmation_token    text,
  confirmed_at          timestamptz,
  unsubscribed_at       timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  last_email_sent_at    timestamptz,
  signup_ip             inet,                          -- LGPD audit trail
  signup_user_agent     text,
  consent_text_version  text NOT NULL DEFAULT 'v1',   -- which version of consent text they saw
  CONSTRAINT subscribers_email_lower CHECK (email = lower(email))
);

CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_unique
  ON insights.subscribers (email);
CREATE INDEX IF NOT EXISTS subscribers_status_idx
  ON insights.subscribers (status);

-- ─── email_log (LGPD audit trail of what we sent to whom) ────────────
CREATE TABLE IF NOT EXISTS insights.email_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id   uuid REFERENCES insights.subscribers(id) ON DELETE SET NULL,
  email           text NOT NULL,                  -- captured at send time, in case subscriber deleted
  kind            text NOT NULL,                  -- 'confirmation' | 'digest' | 'unsubscribe-confirm'
  subject         text NOT NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  resend_id       text,                           -- Resend message id for tracking
  bounced_at      timestamptz,
  complained_at   timestamptz
);

CREATE INDEX IF NOT EXISTS email_log_subscriber_idx
  ON insights.email_log (subscriber_id, sent_at DESC);

-- ─── update triggers ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION insights._touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS drafts_touch ON insights.drafts;
CREATE TRIGGER drafts_touch BEFORE UPDATE ON insights.drafts
  FOR EACH ROW EXECUTE FUNCTION insights._touch_updated_at();

DROP TRIGGER IF EXISTS articles_touch ON insights.articles;
CREATE TRIGGER articles_touch BEFORE UPDATE ON insights.articles
  FOR EACH ROW EXECUTE FUNCTION insights._touch_updated_at();

INSERT INTO insights._migrations (id) VALUES ('0001_init_insights')
  ON CONFLICT (id) DO NOTHING;
