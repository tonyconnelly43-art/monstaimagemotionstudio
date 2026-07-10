export interface PromptSections {
  mainAction: string;
  characterMovement: string;
  facialExpression: string;
  basketballAction: string;
  cameraMovement: string;
  backgroundMovement: string;
  environmentalEffects: string;
  lighting: string;
  animationStyle: string;
  timing: string;
  dialogueBehavior: string;
  soundDesign: string;
  endingAction: string;
  negativeInstructions: string;
}

export const EMPTY_PROMPT_SECTIONS: PromptSections = {
  mainAction: "",
  characterMovement: "",
  facialExpression: "",
  basketballAction: "",
  cameraMovement: "",
  backgroundMovement: "",
  environmentalEffects: "",
  lighting: "",
  animationStyle: "",
  timing: "",
  dialogueBehavior: "",
  soundDesign: "",
  endingAction: "",
  negativeInstructions: "",
};

export const PROMPT_SECTION_LABELS: Record<keyof PromptSections, string> = {
  mainAction: "Main Action",
  characterMovement: "Character Movement",
  facialExpression: "Facial Expression",
  basketballAction: "Basketball Action",
  cameraMovement: "Camera Movement",
  backgroundMovement: "Background Movement",
  environmentalEffects: "Environmental Effects",
  lighting: "Lighting",
  animationStyle: "Animation Style",
  timing: "Timing",
  dialogueBehavior: "Dialogue Behavior",
  soundDesign: "Sound Design",
  endingAction: "Ending Action",
  negativeInstructions: "Negative Instructions",
};

export interface BasketballGuardrails {
  targetBasket?: string;
  playerDirection?: string;
  shootingHand?: string;
  dribblingHand?: string;
  startingPose?: string;
  endingPose?: string;
  ballOwnership?: string;
  defenderPlacement?: string;
  cameraSide?: string;
  courtDirection?: string;
}

export const DEFAULT_BASKETBALL_NEGATIVES = [
  "no ball teleportation",
  "no more than one basketball unless requested",
  "no shooting toward the wrong basket",
  "the basket must not change location",
  "no hands passing through the ball",
  "no reversed limbs",
  "no sliding feet",
  "the player must not face away from the target",
  "the ball must not disappear",
  "no duplicate players",
  "no unrequested spectators",
  "no random logos",
  "no photorealistic transformation",
];
