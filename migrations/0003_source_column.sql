ALTER TABLE insights.subscribers ADD COLUMN IF NOT EXISTS source text DEFAULT 'organic';
INSERT INTO insights._migrations (id) VALUES ('0003_source_column') ON CONFLICT (id) DO NOTHING;
