-- Add genre column for catalog categories (safe to re-run)
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS genre TEXT;
CREATE INDEX IF NOT EXISTS idx_content_items_genre ON public.content_items(genre) WHERE genre IS NOT NULL;
