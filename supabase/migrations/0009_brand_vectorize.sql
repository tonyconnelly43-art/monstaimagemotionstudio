-- Stores the vectorized (potrace-traced), recolorable version of each brand
-- element as jsonb: { width, height, bands: [{ threshold, path, color }] }.
-- Bands are ordered lightest-threshold-first (broadest silhouette, drawn on the
-- bottom) to darkest-threshold-last (core ink lines, drawn on top), so they can
-- be layered directly as SVG <path> tags with each band independently recolored.

alter table public.brand_projects
  add column if not exists mascot_vector jsonb,
  add column if not exists wordmark_vector jsonb,
  add column if not exists background_vector jsonb;
