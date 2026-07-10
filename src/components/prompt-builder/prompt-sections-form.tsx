"use client";

import { useState } from "react";
import { Wand2, Scissors, Video, Clapperboard, Palette, ShieldCheck, Sparkles, Shuffle, ListVideo } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  EMPTY_PROMPT_SECTIONS,
  PROMPT_SECTION_LABELS,
  type PromptSections,
} from "@/lib/prompt/types";
import {
  addCameraDirection,
  createThreePromptVariations,
  improvePrompt,
  makeMoreCartoonLike,
  makeMoreCinematic,
  protectCharacterDesign,
  reduceAiArtifacts,
  simplifyMotion,
  turnIntoMultiShotSequence,
} from "@/lib/prompt/transforms";

const SECTION_ORDER: Array<keyof PromptSections> = [
  "mainAction",
  "characterMovement",
  "facialExpression",
  "basketballAction",
  "cameraMovement",
  "backgroundMovement",
  "environmentalEffects",
  "lighting",
  "animationStyle",
  "timing",
  "dialogueBehavior",
  "soundDesign",
  "endingAction",
  "negativeInstructions",
];

export function PromptSectionsForm({
  casualIdea,
  sections,
  onCasualIdeaChange,
  onSectionsChange,
  onMultiShot,
}: {
  casualIdea: string;
  sections: PromptSections;
  onCasualIdeaChange: (value: string) => void;
  onSectionsChange: (sections: PromptSections) => void;
  onMultiShot?: (beats: ReturnType<typeof turnIntoMultiShotSequence>) => void;
}) {
  const [variations, setVariations] = useState<PromptSections[] | null>(null);

  const buttons: { label: string; icon: typeof Wand2; run: (s: PromptSections) => PromptSections }[] = [
    { label: "Improve Prompt", icon: Wand2, run: improvePrompt },
    { label: "Simplify Motion", icon: Scissors, run: simplifyMotion },
    { label: "Add Camera Direction", icon: Video, run: addCameraDirection },
    { label: "Make More Cinematic", icon: Clapperboard, run: makeMoreCinematic },
    { label: "Make More Cartoon-Like", icon: Palette, run: makeMoreCartoonLike },
    { label: "Protect Character Design", icon: ShieldCheck, run: protectCharacterDesign },
    { label: "Reduce AI Artifacts", icon: Sparkles, run: reduceAiArtifacts },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="casual-idea">Describe the idea casually</Label>
        <Textarea
          id="casual-idea"
          placeholder="e.g. Dash dribbles toward the basket, crosses the defender, takes two steps, jumps and makes the layup."
          value={casualIdea}
          onChange={(e) => onCasualIdeaChange(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          This becomes the Main Action below if you don&apos;t write one yourself — no prompt is ever sent to an LLM;
          Monsta Studio uses deterministic templates until you configure one (Settings).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {buttons.map(({ label, icon: Icon, run }) => (
          <Button key={label} type="button" variant="outline" size="sm" onClick={() => onSectionsChange(run(sections))}>
            <Icon className="size-3.5" />
            {label}
          </Button>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setVariations(createThreePromptVariations(sections))}>
          <Shuffle className="size-3.5" />
          Create Three Prompt Variations
        </Button>
        {onMultiShot ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onMultiShot(turnIntoMultiShotSequence(sections))}
          >
            <ListVideo className="size-3.5" />
            Turn Into Multi-Shot Sequence
          </Button>
        ) : null}
      </div>

      {variations ? (
        <div className="grid grid-cols-1 gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-3">
          {variations.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSectionsChange(v);
                setVariations(null);
              }}
              className="rounded-md border border-border/60 p-2 text-left text-xs hover:border-primary/50"
            >
              <p className="mb-1 font-medium">Variation {i + 1}</p>
              <p className="line-clamp-4 text-muted-foreground">{v.mainAction || casualIdea}</p>
            </button>
          ))}
        </div>
      ) : null}

      <Accordion multiple defaultValue={["mainAction"]}>
        {SECTION_ORDER.map((key) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="text-sm">{PROMPT_SECTION_LABELS[key]}</AccordionTrigger>
            <AccordionContent>
              <Textarea
                value={sections[key]}
                placeholder={key === "mainAction" ? "Leave blank to use the casual idea above." : undefined}
                onChange={(e) => onSectionsChange({ ...sections, [key]: e.target.value })}
                rows={2}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export { EMPTY_PROMPT_SECTIONS };
