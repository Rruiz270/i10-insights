-- Add video support to drafts and articles.
-- Most articles will be image-only; video is reserved for tutorial/demo pieces
-- (typically ferramentas category). When present, the article template renders
-- the video in place of the hero image.

ALTER TABLE insights.drafts
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_aspect_ratio text DEFAULT '16:9';

ALTER TABLE insights.articles
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_aspect_ratio text DEFAULT '16:9';

INSERT INTO insights._migrations (id) VALUES ('0002_video_columns')
  ON CONFLICT (id) DO NOTHING;
