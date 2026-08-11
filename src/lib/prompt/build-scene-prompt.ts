export type ThreePointPosition = "unspecified" | "inside_arc" | "on_line" | "outside_arc";

export const THREE_POINT_POSITION_OPTIONS: { value: ThreePointPosition; label: string }[] = [
  { value: "unspecified", label: "Not specified" },
  { value: "inside_arc", label: "Inside the arc (closer to the basket)" },
  { value: "on_line", label: "Standing on the line" },
  { value: "outside_arc", label: "Outside the arc (behind the three-point line)" },
];

const THREE_POINT_TEXT: Record<ThreePointPosition, string> = {
  unspecified: "",
  inside_arc:
    "Position the named character(s) inside the three-point arc — closer to the basket than the painted three-point line (e.g. in the paint, near the free-throw line, or the mid-range area between the line and the hoop).",
  on_line:
    "Position the named character(s) standing directly on top of the three-point arc, straddling the painted three-point line.",
  outside_arc:
    "Position the named character(s) clearly outside the three-point arc — both feet farther from the basket than the painted three-point line, fully behind the three-point line.",
};

export interface CharacterPlacementInput {
  name: string;
  position: string;
}

export interface BuildScenePromptInput {
  /** The project's own style profile — not global, so different shows never bleed into each other. */
  styleInstructions: string;
  locationName: string | null;
  placements: CharacterPlacementInput[];
  threePointPosition: ThreePointPosition;
  sceneDescription: string;
}

/**
 * Deterministic (no LLM) prompt builder for Nano Banana Pro scene
 * composition. The court-line guidance is the important bit: image models
 * don't reliably infer court geometry from a vague phrase like "behind the
 * three-point line" on their own — this spells it out literally, and the
 * caller is expected to also pass in a location reference photo that
 * actually shows the lines so the model has something concrete to preserve
 * rather than invent.
 */
export function buildScenePrompt(input: BuildScenePromptInput): string {
  const parts: string[] = [];

  if (input.styleInstructions.trim()) parts.push(input.styleInstructions.trim());

  if (input.locationName) {
    parts.push(
      `Setting: ${input.locationName}. Keep the established environment design from the reference photo exactly as shown, including all court markings and lines — do not move, remove, or redraw them.`,
    );
  }

  const namedPlacements = input.placements.filter((p) => p.position.trim());
  if (namedPlacements.length) {
    const lines = namedPlacements.map((p) => `- ${p.name}: ${p.position.trim()}`).join("\n");
    parts.push(`Character placement:\n${lines}`);
  }

  const threePointText = THREE_POINT_TEXT[input.threePointPosition];
  if (threePointText) parts.push(threePointText);

  if (input.sceneDescription.trim()) parts.push(input.sceneDescription.trim());

  return parts.filter(Boolean).join("\n\n");
}
