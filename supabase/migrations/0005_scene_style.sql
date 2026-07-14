-- Adds a per-scene "style mode" (basketball vs. everyday/story) and two
-- editable default style descriptions in app_settings, so every generation
-- automatically layers in the right visual treatment without the creator
-- needing to paste it in each time.

alter table public.scenes
  add column if not exists style_mode text not null default 'everyday'
    check (style_mode in ('basketball', 'everyday'));

alter table public.app_settings
  add column if not exists basketball_style_instructions text not null default
    'The moment a basketball game or basketball action begins, shift the tone dramatically: animate it with the moody, cinematic energy of Marvel''s animated Batman-style superhero storytelling. Moodier, more dramatic lighting. Cinematic camera movement and framing. Dramatic, panel-like staging. Make the basketball feel important and weighty. The crowd fades into silhouettes in the background. The players feel larger than life and heroic — not because they are superheroes, but because that''s how basketball feels through a kid''s eyes.',
  add column if not exists everyday_style_instructions text not null default
    'Outside of basketball action, animate this scene like a Saturday morning cartoon in the style of Recess, Fillmore!, Pepper Ann, Hey Arnold!, and The Proud Family. Bright, saturated colors. Simple, uncluttered backgrounds. Funny, exaggerated facial expressions and reactions. Kids joking around with lighthearted, playful, playground energy. Keep the tone fun, silly, and warm.';
