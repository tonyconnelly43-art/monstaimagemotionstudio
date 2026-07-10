-- Seed data: system-wide Hoop Squad prompt presets, and a per-user bootstrap
-- that creates editable placeholder Character + Scene profiles on signup.

-- ---------------------------------------------------------------------------
-- System prompt presets (Hoop Squad animation presets). user_id is null;
-- readable by everyone via the "prompt_presets system read" policy.
-- ---------------------------------------------------------------------------
insert into public.prompt_presets (user_id, is_system_default, name, category, description, prompt_sections, negative_instructions)
values
  (null, true, 'Character Introduction', 'hoop_squad', 'Player stands in the gym, subtle basketball action, looks to camera, finishes in a hero pose.',
    '{"main_action":"The selected player stands in the gym and performs a subtle basketball action.","character_movement":"Natural weight shift, ball handling idle, confident posture.","camera_movement":"Slow push-in toward the character.","ending_action":"The player looks toward the camera and finishes in a strong hero pose."}'::jsonb,
    'Do not change the character''s design, proportions, or uniform mid-shot.'),
  (null, true, 'Dribble Sequence', 'hoop_squad', 'Player dribbles naturally toward camera or across the court with correct hand-to-ball contact.',
    '{"main_action":"The player dribbles the basketball naturally while moving toward the camera or across the court.","character_movement":"Natural footwork synced to each dribble.","basketball_action":"Preserve correct hand-to-ball contact on every bounce."}'::jsonb,
    'No ball teleportation, no hands passing through the ball, no sliding feet.'),
  (null, true, 'Jump Shot', 'hoop_squad', 'Gather, bend knees, jump, release toward the basket, hold follow-through, land naturally.',
    '{"basketball_action":"The player gathers the basketball, bends their knees, jumps, releases the ball toward the visible basket, holds the follow-through, and lands naturally.","camera_movement":"Track the ball from release to the basket."}'::jsonb,
    'No shooting toward the wrong basket, no ball disappearing, no reversed limbs.'),
  (null, true, 'Layup', 'hoop_squad', 'Controlled steps toward the basket, jump from the correct side, release toward the backboard, land naturally.',
    '{"basketball_action":"The player takes controlled steps toward the visible basket, jumps from the correct side, releases the ball toward the backboard, and lands naturally."}'::jsonb,
    'No basket changing location, no duplicate players, no photorealistic transformation.'),
  (null, true, 'Defensive Stance', 'hoop_squad', 'Lower into a defensive stance, slide laterally, hands active, stay focused on the offensive player.',
    '{"basketball_action":"The player lowers into a defensive stance, slides laterally, keeps their hands active, and stays focused on the offensive player."}'::jsonb,
    'No sliding feet artifacts, no player facing away from the target.'),
  (null, true, 'Rebound', 'hoop_squad', 'Track the ball, jump, catch with both hands, secure near chest, land balanced.',
    '{"basketball_action":"The player tracks the ball, jumps, catches it with both hands, secures it near the chest, and lands balanced."}'::jsonb,
    'Only one basketball on screen, no extra fingers, no duplicate players.'),
  (null, true, 'Team Introduction', 'hoop_squad', 'Selected characters stand together in the gym with subtle individual movement while camera pushes in.',
    '{"main_action":"The selected Hoop Squad characters stand together in the rec-center gym with subtle individual movement.","camera_movement":"Slow push-in on the group."}'::jsonb,
    'No unrequested spectators, no duplicate characters, no characters swapping places.'),
  (null, true, 'Coach Speech', 'hoop_squad', 'Coach addresses the team while players listen and react subtly.',
    '{"main_action":"The coach addresses the team while players listen and react with subtle, natural movement.","dialogue_behavior":"Coach is the primary speaker; players react without upstaging."}'::jsonb,
    'No lip-sync desync, no characters wandering out of frame.'),
  (null, true, 'Motion Comic', 'hoop_squad', 'Animate only selected parts of the illustration with controlled camera movement and layered depth.',
    '{"animation_style":"Limited motion comic style: animate only selected parts of the illustration.","camera_movement":"Controlled movement with layered depth and subtle parallax."}'::jsonb,
    'Do not fully redraw or repaint the illustration; keep flat illustrated layers intact.'),
  (null, true, 'Celebration', 'hoop_squad', 'Players celebrate a made basket naturally without changing designs or creating extra players.',
    '{"main_action":"The players celebrate a made basket naturally.","character_movement":"Natural, age-appropriate celebration gestures."}'::jsonb,
    'No extra players, no design changes, no unapproved logos or text.')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Extend the signup trigger to bootstrap editable placeholder profiles.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  demo_project_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.app_settings (user_id) values (new.id) on conflict do nothing;

  insert into public.characters (user_id, slot_key, name, is_placeholder, notes)
  values
    (new.id, 'g', 'G', true, 'Editable placeholder — upload approved artwork to complete this profile.'),
    (new.id, 'zo', 'Zo', true, 'Editable placeholder — upload approved artwork to complete this profile.'),
    (new.id, 'zach', 'Zach', true, 'Editable placeholder — upload approved artwork to complete this profile.'),
    (new.id, 'dash', 'Dash', true, 'Editable placeholder — upload approved artwork to complete this profile.'),
    (new.id, 'fifth', 'Fifth Hoop Squad Player', true, 'Editable placeholder — name and appearance not yet finalized.'),
    (new.id, 'coach', 'Coach', true, 'Editable placeholder — upload approved artwork to complete this profile.')
  on conflict (user_id, slot_key) do nothing;

  insert into public.hoop_squad_scenes (user_id, name, category, is_placeholder, environment_description)
  values
    (new.id, 'Main Rec Center Gym', 'main_rec_center_gym', true,
     'Editable placeholder — upload approved wide, angle, and empty-court references to complete this location.')
  on conflict do nothing;

  insert into public.projects (user_id, name, project_type, is_demo, description)
  values (
    new.id, 'Hoop Squad – Character Introduction', 'character_introduction', true,
    'Demo project — no copyrighted or unapproved artwork included. Upload your approved Hoop Squad character art to the placeholder scene below to complete it.'
  )
  returning id into demo_project_id;

  insert into public.scenes (user_id, project_id, scene_number, name, sort_order, casual_idea, notes)
  values (
    new.id, demo_project_id, 1, 'Scene 1 — Hero Pose', 1,
    'The selected player stands in the gym, performs a subtle basketball action, looks toward the camera, and finishes in a strong hero pose.',
    'Placeholder scene. Upload your approved character artwork as the Main Starting Frame, select a character from the Character Library, and choose the Main Rec Center Gym location before generating.'
  );

  return new;
end;
$$;
