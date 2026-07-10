import type { PromptSections } from "@/lib/prompt/types";

/**
 * Deterministic, template-based prompt transforms — no LLM call is made.
 * Each transform returns a new PromptSections object. Swapping in an LLM
 * later only requires replacing the function body; call sites don't change.
 * See docs/PROMPT_ENHANCEMENT.md.
 */

function appendUnique(base: string, addition: string): string {
  const trimmed = base.trim();
  if (!trimmed) return addition;
  if (trimmed.toLowerCase().includes(addition.toLowerCase())) return trimmed;
  return `${trimmed} ${addition}`;
}

export function improvePrompt(sections: PromptSections): PromptSections {
  return {
    ...sections,
    mainAction: sections.mainAction.trim()
      ? appendUnique(sections.mainAction, "with clear, readable staging.")
      : sections.mainAction,
    cameraMovement: sections.cameraMovement.trim() || "Steady, motivated camera movement that follows the action.",
    lighting: sections.lighting.trim() || "Consistent lighting that matches the established scene.",
    timing: sections.timing.trim() || "Natural pacing — no rushed or frozen moments.",
  };
}

export function simplifyMotion(sections: PromptSections): PromptSections {
  return {
    ...sections,
    characterMovement: appendUnique(sections.characterMovement, "Keep motion minimal, smooth, and limited in range."),
    cameraMovement: appendUnique(sections.cameraMovement, "Camera holds mostly still with only slight movement."),
    animationStyle: appendUnique(sections.animationStyle, "Favor limited animation over extreme motion."),
  };
}

export function addCameraDirection(sections: PromptSections): PromptSections {
  return {
    ...sections,
    cameraMovement: sections.cameraMovement.trim()
      ? sections.cameraMovement
      : "Slow push-in on the main subject, held at eye level, no whip pans or reversals.",
  };
}

export function makeMoreCinematic(sections: PromptSections): PromptSections {
  return {
    ...sections,
    cameraMovement: appendUnique(sections.cameraMovement, "Cinematic camera framing with shallow depth cues."),
    lighting: appendUnique(sections.lighting, "Dramatic, motivated lighting with soft contrast."),
    environmentalEffects: appendUnique(sections.environmentalEffects, "Subtle atmospheric detail (dust motes, light rays) where appropriate."),
  };
}

export function makeMoreCartoonLike(sections: PromptSections): PromptSections {
  return {
    ...sections,
    animationStyle: appendUnique(
      sections.animationStyle,
      "Polished children's cartoon animation style, expressive and readable, not photorealistic.",
    ),
    facialExpression: appendUnique(sections.facialExpression, "Bold, expressive, age-appropriate facial expression."),
  };
}

export function protectCharacterDesign(sections: PromptSections): PromptSections {
  return {
    ...sections,
    negativeInstructions: appendUnique(
      sections.negativeInstructions,
      "Do not redesign, restyle, age, or replace any character. Preserve the exact illustrated character design.",
    ),
  };
}

export function reduceAiArtifacts(sections: PromptSections): PromptSections {
  return {
    ...sections,
    negativeInstructions: appendUnique(
      sections.negativeInstructions,
      "No extra limbs or fingers, no warped hands, no melting faces, no flickering, no duplicate objects, no morphing background.",
    ),
  };
}

export function createThreePromptVariations(sections: PromptSections): PromptSections[] {
  return [
    improvePrompt(sections),
    { ...makeMoreCinematic(sections), timing: appendUnique(sections.timing, "Slightly slower, more deliberate pacing.") },
    { ...makeMoreCartoonLike(sections), timing: appendUnique(sections.timing, "Energetic, upbeat pacing.") },
  ];
}

export interface MultiShotBeat {
  label: string;
  sections: PromptSections;
}

/**
 * Splits a single scene idea into a connected 3-beat sequence (setup / peak
 * action / resolution) for Multi-Shot Mode. Each beat inherits the shared
 * sections and only the timing/main-action text differs, so downstream
 * continuity (character/scene lock, references) stays identical per shot.
 */
export function turnIntoMultiShotSequence(sections: PromptSections): MultiShotBeat[] {
  const base = sections.mainAction.trim() || "The scene continues.";
  return [
    {
      label: "Shot 1 — Setup",
      sections: { ...sections, mainAction: `${base} (beginning of the action, establishing beat)`, timing: "Brief, establishing." },
    },
    {
      label: "Shot 2 — Peak Action",
      sections: { ...sections, mainAction: `${base} (the main action reaches its peak)`, timing: "The core beat, full motion." },
    },
    {
      label: "Shot 3 — Resolution",
      sections: { ...sections, mainAction: `${base} (settles into the finishing pose)`, timing: "Short resolution beat." },
    },
  ];
}
