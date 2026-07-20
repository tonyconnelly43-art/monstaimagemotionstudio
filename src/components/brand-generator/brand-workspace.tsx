"use client";

import { useCallback, useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, Trash2, ImagePlus, Check, Wand2, Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ImageLightboxButton } from "@/components/shared/image-lightbox-button";
import { VectorizePanel } from "@/components/brand-generator/vectorize-panel";
import { uploadBrandReference } from "@/lib/supabase/upload";
import {
  deleteBrandReferenceAction,
  updateBrandProjectAction,
  updateBrandRulesAction,
  generateBrandOptionsAction,
  generateSimilarBrandOptionsAction,
  selectBrandFavoriteAction,
  generateFinalBrandAction,
} from "@/lib/actions/brand";
import {
  BRAND_ELEMENT_TYPES,
  getBrandVector,
  type BrandProject,
  type BrandReference,
  type BrandGenerationBatch,
  type BrandElementType,
} from "@/lib/data/brand";

export function BrandWorkspace({
  project,
  references,
  batches,
}: {
  project: BrandProject;
  references: BrandReference[];
  batches: BrandGenerationBatch[];
}) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<BrandElementType>("mascot");
  const [prompts, setPrompts] = useState<Record<BrandElementType, string>>({ mascot: "", wordmark: "", background: "" });
  const [rules, setRules] = useState<Record<BrandElementType, string>>({
    mascot: project.mascot_rules ?? "",
    wordmark: project.wordmark_rules ?? "",
    background: project.background_rules ?? "",
  });
  const [generating, setGenerating] = useState(false);
  const [generatingSimilar, setGeneratingSimilar] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [finalizing, setFinalizing] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState("");

  const latestBatch = batches.find((b) => b.element_type === activeType) ?? null;
  const activeReferences = references.filter((r) => r.element_type === activeType);

  const favoriteUrls: Record<BrandElementType, string | null> = {
    mascot: project.mascot_favorite_url,
    wordmark: project.wordmark_favorite_url,
    background: project.background_favorite_url,
  };
  const allFavoritesSet = Boolean(favoriteUrls.mascot && favoriteUrls.wordmark && favoriteUrls.background);
  const activeFavorite = favoriteUrls[activeType];

  const onDrop = useCallback(
    async (files: File[]) => {
      setUploading(true);
      try {
        for (const file of files) {
          await uploadBrandReference(project.id, activeType, file.name, file);
        }
        toast.success(`Uploaded ${files.length} reference${files.length > 1 ? "s" : ""}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [project.id, activeType, router],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"], "image/webp": [".webp"] },
    multiple: true,
  });

  function handleDeleteReference(id: string) {
    startTransition(async () => {
      try {
        await deleteBrandReferenceAction(id, project.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove reference.");
      }
    });
  }

  function handleGenerate() {
    setGenerating(true);
    generateBrandOptionsAction(project.id, activeType, prompts[activeType])
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Generated 3 options.");
        router.refresh();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Generation failed."))
      .finally(() => setGenerating(false));
  }

  function handleGenerateSimilar() {
    if (!activeFavorite) return;
    setGeneratingSimilar(true);
    generateSimilarBrandOptionsAction(project.id, activeType, activeFavorite, prompts[activeType])
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Generated 2 more like your favorite.");
        router.refresh();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Generation failed."))
      .finally(() => setGeneratingSimilar(false));
  }

  function handleSelectFavorite(url: string) {
    startTransition(async () => {
      try {
        await selectBrandFavoriteAction(project.id, activeType, url);
        toast.success(`${BRAND_ELEMENT_TYPES.find((t) => t.value === activeType)?.label} favorite set.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save favorite.");
      }
    });
  }

  function handleGenerateFinal() {
    setFinalizing(true);
    generateFinalBrandAction(project.id, finalPrompt)
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Final brand composed.");
        router.refresh();
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not compose the final brand."))
      .finally(() => setFinalizing(false));
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Company name</Label>
          <Input defaultValue={project.name} onBlur={(e) => void updateBrandProjectAction(project.id, { name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Company info</Label>
          <Input
            defaultValue={project.company_info ?? ""}
            onBlur={(e) => void updateBrandProjectAction(project.id, { company_info: e.target.value })}
          />
        </div>
      </div>

      <Tabs value={activeType} onValueChange={(v) => v && setActiveType(v as BrandElementType)}>
        <TabsList className="w-full">
          {BRAND_ELEMENT_TYPES.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              {favoriteUrls[t.value] ? <Check className="size-3 text-success" /> : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          {BRAND_ELEMENT_TYPES.find((t) => t.value === activeType)?.label} Reference Photos
        </Label>
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border/70 hover:border-border"
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" />
          )}
          <p className="text-xs text-muted-foreground">
            Drag & drop references for this {BRAND_ELEMENT_TYPES.find((t) => t.value === activeType)?.label.toLowerCase()} only
            (KickCharge/Fortitude portfolio shots, competitor logos, mood boards).
          </p>
        </div>
        {activeReferences.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {activeReferences.map((ref) => (
              <div key={ref.id} className="group relative aspect-square overflow-hidden rounded-md border border-border/60 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ref.image_url} alt={ref.label ?? "Reference"} className="size-full object-contain" />
                <ImageLightboxButton url={ref.image_url} label={ref.label ?? "Reference"} />
                <button
                  type="button"
                  onClick={() => handleDeleteReference(ref.id)}
                  className="absolute right-0.5 top-0.5 hidden size-4 items-center justify-center rounded-full bg-black/70 text-white group-hover:flex"
                >
                  <Trash2 className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No references yet for this element — it&apos;ll generate from the rules and prompt alone.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          {BRAND_ELEMENT_TYPES.find((t) => t.value === activeType)?.label} Generation Rules
        </Label>
        <Textarea
          value={rules[activeType]}
          onChange={(e) => setRules((prev) => ({ ...prev, [activeType]: e.target.value }))}
          onBlur={(e) => void updateBrandRulesAction(project.id, activeType, e.target.value)}
          placeholder="Standing style direction for this element only — applied automatically to every generation, on top of the reference photos above."
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Describe this generation</Label>
        <Textarea
          value={prompts[activeType]}
          onChange={(e) => setPrompts((prev) => ({ ...prev, [activeType]: e.target.value }))}
          placeholder={
            activeType === "mascot"
              ? "e.g. A friendly cartoon rocket character with arms and legs, giving a thumbs up, wearing a tool belt"
              : activeType === "wordmark"
                ? "e.g. Bold italic lettering that leans forward for speed, in navy and orange"
                : "e.g. Sky-blue background with subtle cloud shapes and a speed-line motif"
          }
          rows={3}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate 3 {BRAND_ELEMENT_TYPES.find((t) => t.value === activeType)?.label} Options (~$0.45)
          </Button>
          {activeFavorite ? (
            <Button variant="outline" onClick={handleGenerateSimilar} disabled={generatingSimilar}>
              {generatingSimilar ? <Loader2 className="size-4 animate-spin" /> : <Repeat className="size-4" />}
              Generate 2 More Like Favorite (~$0.30)
            </Button>
          ) : null}
        </div>
      </div>

      <div>
        <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
          {latestBatch ? "Pick your favorite" : "Nothing generated yet for this element"}
        </Label>
        {latestBatch ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {latestBatch.image_urls.map((url) => {
              const isFavorite = favoriteUrls[activeType] === url;
              return (
                <div
                  key={url}
                  className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-white transition-colors ${
                    isFavorite ? "border-primary" : "border-border/60"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Generated option" className="size-full object-contain" />
                  <ImageLightboxButton url={url} label="Generated option" size="large" />
                  <Button
                    size="sm"
                    variant={isFavorite ? "default" : "outline"}
                    disabled={isPending}
                    onClick={() => handleSelectFavorite(url)}
                    className="absolute inset-x-2 bottom-2"
                  >
                    {isFavorite ? <Check className="size-3.5" /> : null}
                    {isFavorite ? "Favorite" : "Pick this one"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Describe what you want above and click Generate.</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Selected Brand Elements</Label>
        <div className="grid grid-cols-3 gap-3">
          {BRAND_ELEMENT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setActiveType(t.value)}
              className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                activeType === t.value ? "border-primary" : "border-border/60 hover:border-border"
              }`}
            >
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-muted/40">
                {favoriteUrls[t.value] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={favoriteUrls[t.value] ?? undefined} alt={t.label} className="size-full bg-white object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">Not picked yet</span>
                )}
              </div>
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <VectorizePanel
        key={activeType}
        projectId={project.id}
        elementType={activeType}
        label={BRAND_ELEMENT_TYPES.find((t) => t.value === activeType)?.label ?? activeType}
        sourceImageUrl={activeFavorite}
        vector={getBrandVector(project, activeType)}
      />

      {allFavoritesSet ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">Combine into the final brand</p>
            <Textarea
              value={finalPrompt}
              onChange={(e) => setFinalPrompt(e.target.value)}
              placeholder="Optional: any extra direction for how the three pieces should be arranged together."
              rows={2}
            />
            <Button onClick={handleGenerateFinal} disabled={finalizing}>
              {finalizing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Generate Brand Together (~$0.15)
            </Button>
            {project.final_brand_url ? (
              <div className="group relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-lg border border-border/60 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={project.final_brand_url} alt="Final brand" className="size-full object-contain" />
                <ImageLightboxButton url={project.final_brand_url} label="Final brand" size="large" />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground">Pick a favorite for all three elements to unlock the final combine step.</p>
      )}
    </div>
  );
}
