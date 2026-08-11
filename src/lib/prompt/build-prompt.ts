import type { ConsistencyStrength } from "@/lib/fal/models";
import { DEFAULT_BASKETBALL_NEGATIVES, type BasketballGuardrails, type PromptSections } from "@/lib/prompt/types";

export interface CharacterForPrompt {
  name: string;
  description?: string | null;
  personality?: string | null;
  jersey_number?: string | null;
  approved_color_palette?: string | null;
  negative_instructions?: string | null;
}

export interface SceneLocationForPrompt {
  name: string;
  environment_description?: string | null;
  required_objects?: string | null;
  forbidden_objects?: string | null;
  consistency_instructions?: string | null;
  negative_instructions?: string | null;
}

const CHARACTER_LOCK_STRENGTH_TEXT: Record<ConsistencyStrength, string> = {
  flexible: "Stay close to each character's established design, allowing minor natural variation.",
  balanced: "Preserve each character's established design closely while allowing natural, limited animation.",
  strong: "Preserve each character's exact established design. Favor subtle, controlled motion over extreme motion.",
  maximum:
    "Preserve each character's exact established design with zero deviation. Use only the most minimal motion needed to convey the action; never redesign, restyle, age, or replace the character.",
};

export const SCENE_LOCK_STRENGTH_TEXT: Record<ConsistencyStrength, string> = {
  flexible: "Keep the environment recognizable, allowing minor incidental variation.",
  balanced: "Preserve the approved environment design and keep major objects in their established places.",
  strong: "Preserve the exact approved environment layout, objects, and color palette. Do not redesign the background.",
  maximum:
    "Preserve the exact approved environment with zero deviation: room layout, hoop location, doors, windows, bleachers, banners, scoreboard, benches, and court markings must not move, be added to, or be removed.",
};

export interface BuildPromptInput {
  casualIdea: string;
  sections: PromptSections;
  characters: CharacterForPrompt[];
  location: SceneLocationForPrompt | null;
  cameraAngle?: string | null;
  timeOfDay?: string | null;
  characterPlacements?: string | null;
  basketball?: BasketballGuardrails;
  characterLock: boolean;
  characterLockStrength: ConsistencyStrength;
  sceneLock: boolean;
  sceneLockStrength: ConsistencyStrength;
  /** The project's own style profile — not global, so different shows on the same account never bleed into each other. */
  styleInstructions: string;
  globalNegativePrompt: string;
  /** "basketball" = active game action; "everyday" = hangout/story moments outside the game. */
  sceneStyleMode: "basketball" | "everyday";
  basketballStyleInstructions: string;
  everydayStyleInstructions: string;
}

function joinNonEmpty(parts: Array<string | null | undefined>, sep = " "): string {
  return parts.map((p) => p?.trim()).filter(Boolean).join(sep);
}

/**
 * Deterministic, template-based prompt construction (no LLM call). Combines
 * character identity, scene identity, guided sections, and guardrails into
 * one production prompt + one negative prompt. See `docs/PROMPT_ENHANCEMENT.md`
 * for how an LLM-backed version could be swapped in later behind the same
 * interface.
 */
export function buildFinalPrompt(input: BuildPromptInput): { prompt: string; negativePrompt: string } {
  const promptParts: string[] = [];

  promptParts.push(input.styleInstructions);
  promptParts.push(
    input.sceneStyleMode === "basketball" ? input.basketballStyleInstructions : input.everydayStyleInstructions,
  );

  if (input.characters.length > 0) {
    const names = input.characters.map((c) => c.name).join(", ");
    promptParts.push(`Characters in this shot: ${names}.`);
    for (const c of input.characters) {
      const identity = joinNonEmpty([
        c.description,
        c.personality ? `Personality: ${c.personality}.` : null,
        c.jersey_number ? `Jersey number ${c.jersey_number}.` : null,
        c.approved_color_palette ? `Approved colors: ${c.approved_color_palette}.` : null,
      ]);
      if (identity) promptParts.push(`${c.name} — ${identity}`);
    }
    if (input.characterLock) {
      promptParts.push(
        `Character Lock (${input.characterLockStrength}): ${CHARACTER_LOCK_STRENGTH_TEXT[input.characterLockStrength]}`,
      );
    }
  }

  if (input.location) {
    promptParts.push(`Setting: ${input.location.name}. ${input.location.environment_description ?? ""}`.trim());
    if (input.location.required_objects) {
      promptParts.push(`Keep these objects visible and in place: ${input.location.required_objects}.`);
    }
    if (input.location.consistency_instructions) {
      promptParts.push(input.location.consistency_instructions);
    }
    if (input.sceneLock) {
      promptParts.push(`Scene Lock (${input.sceneLockStrength}): ${SCENE_LOCK_STRENGTH_TEXT[input.sceneLockStrength]}`);
    }
  }

  if (input.cameraAngle) promptParts.push(`Camera angle: ${input.cameraAngle}.`);
  if (input.timeOfDay) promptParts.push(`Time of day: ${input.timeOfDay}.`);
  if (input.characterPlacements) promptParts.push(`Character positions: ${input.characterPlacements}.`);

  if (input.basketball) {
    const b = input.basketball;
    const bball = joinNonEmpty([
      b.shotType ? `Shot type: ${b.shotType} — the shot must actually be this type (e.g. a three-pointer means feet clearly behind the three-point arc, not a mid-range or paint shot).` : null,
      b.targetBasket ? `Target basket: ${b.targetBasket}.` : null,
      b.playerDirection ? `Player direction: ${b.playerDirection}.` : null,
      b.shootingHand ? `Shooting hand: ${b.shootingHand}.` : null,
      b.dribblingHand ? `Dribbling hand: ${b.dribblingHand}.` : null,
      b.startingPose ? `Starting pose: ${b.startingPose}.` : null,
      b.endingPose ? `Ending pose: ${b.endingPose}.` : null,
      b.ballOwnership ? `Ball ownership: ${b.ballOwnership}.` : null,
      b.defenderPlacement ? `Defender placement: ${b.defenderPlacement}.` : null,
      b.cameraSide ? `Camera side: ${b.cameraSide}.` : null,
      b.courtDirection ? `Court direction: ${b.courtDirection}.` : null,
    ]);
    if (bball) promptParts.push(bball);
  }

  const s = input.sections;
  const mainAction = s.mainAction.trim() || input.casualIdea.trim();
  const sectionOrder: Array<[string, string]> = [
    ["Action", mainAction],
    ["Character movement", s.characterMovement],
    ["Facial expression", s.facialExpression],
    ["Basketball action", s.basketballAction],
    ["Camera movement", s.cameraMovement],
    ["Background movement", s.backgroundMovement],
    ["Environmental effects", s.environmentalEffects],
    ["Lighting", s.lighting],
    ["Animation style", s.animationStyle],
    ["Timing", s.timing],
    ["Dialogue behavior", s.dialogueBehavior],
    ["Sound design", s.soundDesign],
    ["Ending action", s.endingAction],
  ];
  for (const [label, value] of sectionOrder) {
    if (value?.trim()) promptParts.push(`${label}: ${value.trim()}`);
  }

  const negativeParts: string[] = [input.globalNegativePrompt];
  for (const c of input.characters) {
    if (c.negative_instructions) negativeParts.push(`${c.name}: ${c.negative_instructions}`);
  }
  if (input.location?.negative_instructions) negativeParts.push(input.location.negative_instructions);
  if (input.location?.forbidden_objects) {
    negativeParts.push(`Do not add: ${input.location.forbidden_objects}.`);
  }
  if (input.basketball && Object.values(input.basketball).some(Boolean)) {
    negativeParts.push(DEFAULT_BASKETBALL_NEGATIVES.join(", ") + ".");
  }
  if (s.negativeInstructions.trim()) negativeParts.push(s.negativeInstructions.trim());

  return {
    prompt: promptParts.filter(Boolean).join("\n"),
    negativePrompt: negativeParts.filter(Boolean).join(" "),
  };
}
