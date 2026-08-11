"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VIDEO_MODELS, VOICE_MODELS } from "@/lib/fal/models";
import {
  updateSettingsAction,
  testFalConnectionAction,
  testSupabaseConnectionAction,
  testAnthropicConnectionAction,
  testWebsiteLeadsConnectionAction,
  type ConnectionTestResult,
} from "@/lib/actions/settings";
import type { AppSettings } from "@/lib/data/settings";

const ASPECT_RATIOS = ["9:16", "1:1", "16:9", "4:5"];
const OUTPUT_QUALITIES = ["480p", "720p", "1080p", "4k"];

export function SettingsForm({
  settings,
  falConfigured,
  supabaseConfigured,
  anthropicConfigured,
  websiteLeadsConfigured,
}: {
  settings: AppSettings;
  falConfigured: boolean;
  supabaseConfigured: boolean;
  anthropicConfigured: boolean;
  websiteLeadsConfigured: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function patch(update: Partial<AppSettings>) {
    startTransition(async () => {
      try {
        await updateSettingsAction(update as never);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save setting.");
      }
    });
  }

  return (
    <div className="space-y-6 p-6">
      <ConnectionsCard
        falConfigured={falConfigured}
        supabaseConfigured={supabaseConfigured}
        anthropicConfigured={anthropicConfigured}
        websiteLeadsConfigured={websiteLeadsConfigured}
      />

      <Card>
        <CardHeader>
          <CardTitle>Model Defaults</CardTitle>
          <CardDescription>Used whenever a new scene doesn&apos;t specify its own model.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Default video model</Label>
            <Select
              value={settings.default_video_model_id ?? VIDEO_MODELS[0].id}
              onValueChange={(v) => v && patch({ default_video_model_id: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Default voice model</Label>
            <Select
              value={settings.default_voice_model_id ?? VOICE_MODELS[0].id}
              onValueChange={(v) => v && patch({ default_voice_model_id: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_MODELS.filter((m) => m.isWired).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Default aspect ratio</Label>
            <Select value={settings.default_aspect_ratio} onValueChange={(v) => v && patch({ default_aspect_ratio: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Default output quality</Label>
            <Select value={settings.default_output_quality} onValueChange={(v) => v && patch({ default_output_quality: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_QUALITIES.map((q) => (
                  <SelectItem key={q} value={q}>
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Global Negative Prompt</CardTitle>
          <CardDescription>
            Automatically added to every generated prompt across every project. Each project keeps its own art-style
            profile now — open a project in Studio and click &ldquo;Style Profile&rdquo; to edit that project&apos;s
            style instead.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Global negative prompt</Label>
            <Textarea
              defaultValue={settings.global_negative_prompt}
              onBlur={(e) => patch({ global_negative_prompt: e.target.value })}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Controls</CardTitle>
          <CardDescription>Estimates only — fal.ai does not publish a pricing API. See Studio for per-generation estimates.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Spending warning threshold (USD)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              defaultValue={settings.spending_warning_threshold ?? ""}
              onBlur={(e) => patch({ spending_warning_threshold: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Daily spending limit (USD)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              defaultValue={settings.daily_spending_limit ?? ""}
              onBlur={(e) => patch({ daily_spending_limit: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Auto-save"
            description="Keep scene edits saved automatically as you work."
            checked={settings.auto_save}
            onCheckedChange={(v) => patch({ auto_save: v })}
          />
          <ToggleRow
            label="Auto-download completed videos"
            description="Automatically download a copy when a take finishes."
            checked={settings.auto_download}
            onCheckedChange={(v) => patch({ auto_download: v })}
          />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Default export location (informational)</Label>
            <Input
              defaultValue={settings.default_export_location ?? ""}
              placeholder="e.g. Downloads/Hoop Squad"
              onBlur={(e) => patch({ default_export_location: e.target.value })}
            />
          </div>
          <ToggleRow
            label="Advanced mode"
            description="Show raw model-specific controls throughout the app."
            checked={settings.advanced_mode}
            onCheckedChange={(v) => patch({ advanced_mode: v })}
          />
          <ToggleRow
            label="Developer diagnostics"
            description="Show request IDs and raw job payloads in Generation History."
            checked={settings.developer_diagnostics}
            onCheckedChange={(v) => patch({ developer_diagnostics: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Direct ElevenLabs Integration
            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-xs text-warning">
              Placeholder — Coming Later
            </Badge>
          </CardTitle>
          <CardDescription>
            Voice generation currently runs through ElevenLabs models hosted on fal.ai. A direct ElevenLabs API key can be
            wired in here once that integration ships, without changing any Voice Studio screens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input disabled placeholder="Direct ElevenLabs API key (not yet available)" />
        </CardContent>
      </Card>

      {isPending ? <p className="text-xs text-muted-foreground">Saving…</p> : null}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ConnectionsCard({
  falConfigured,
  supabaseConfigured,
  anthropicConfigured,
  websiteLeadsConfigured,
}: {
  falConfigured: boolean;
  supabaseConfigured: boolean;
  anthropicConfigured: boolean;
  websiteLeadsConfigured: boolean;
}) {
  const [falResult, setFalResult] = useState<ConnectionTestResult | null>(null);
  const [supabaseResult, setSupabaseResult] = useState<ConnectionTestResult | null>(null);
  const [anthropicResult, setAnthropicResult] = useState<ConnectionTestResult | null>(null);
  const [websiteLeadsResult, setWebsiteLeadsResult] = useState<ConnectionTestResult | null>(null);
  const [testingFal, setTestingFal] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [testingAnthropic, setTestingAnthropic] = useState(false);
  const [testingWebsiteLeads, setTestingWebsiteLeads] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connections</CardTitle>
        <CardDescription>Verify your server environment variables are wired up correctly.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">fal.ai API</p>
            <p className="text-xs text-muted-foreground">
              {falConfigured ? "FAL_KEY is set." : "FAL_KEY is missing."}
              {falResult ? ` ${falResult.message}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {falResult ? (
              falResult.ok ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={testingFal}
              onClick={async () => {
                setTestingFal(true);
                try {
                  setFalResult(await testFalConnectionAction());
                } catch (err) {
                  setFalResult({ ok: false, message: err instanceof Error ? err.message : "Request failed unexpectedly." });
                } finally {
                  setTestingFal(false);
                }
              }}
            >
              {testingFal ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Test connection
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Supabase</p>
            <p className="text-xs text-muted-foreground">
              {supabaseConfigured ? "Environment variables are set." : "Supabase environment variables are missing."}
              {supabaseResult ? ` ${supabaseResult.message}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {supabaseResult ? (
              supabaseResult.ok ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={testingSupabase}
              onClick={async () => {
                setTestingSupabase(true);
                try {
                  setSupabaseResult(await testSupabaseConnectionAction());
                } catch (err) {
                  setSupabaseResult({ ok: false, message: err instanceof Error ? err.message : "Request failed unexpectedly." });
                } finally {
                  setTestingSupabase(false);
                }
              }}
            >
              {testingSupabase ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Test connection
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Claude API (AI Cinematic Prompt)</p>
            <p className="text-xs text-muted-foreground">
              {anthropicConfigured ? "ANTHROPIC_API_KEY is set." : "ANTHROPIC_API_KEY is missing — optional, only needed in Prompt Builder."}
              {anthropicResult ? ` ${anthropicResult.message}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {anthropicResult ? (
              anthropicResult.ok ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={testingAnthropic}
              onClick={async () => {
                setTestingAnthropic(true);
                try {
                  setAnthropicResult(await testAnthropicConnectionAction());
                } catch (err) {
                  setAnthropicResult({ ok: false, message: err instanceof Error ? err.message : "Request failed unexpectedly." });
                } finally {
                  setTestingAnthropic(false);
                }
              }}
            >
              {testingAnthropic ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Test connection
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Website Leads (Leads page)</p>
            <p className="text-xs text-muted-foreground">
              {websiteLeadsConfigured
                ? "WEBSITE_LEADS_DATABASE_URL is set."
                : "WEBSITE_LEADS_DATABASE_URL is missing — optional, only needed for the Leads page."}
              {websiteLeadsResult ? ` ${websiteLeadsResult.message}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {websiteLeadsResult ? (
              websiteLeadsResult.ok ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={testingWebsiteLeads}
              onClick={async () => {
                setTestingWebsiteLeads(true);
                try {
                  setWebsiteLeadsResult(await testWebsiteLeadsConnectionAction());
                } catch (err) {
                  setWebsiteLeadsResult({ ok: false, message: err instanceof Error ? err.message : "Request failed unexpectedly." });
                } finally {
                  setTestingWebsiteLeads(false);
                }
              }}
            >
              {testingWebsiteLeads ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Test connection
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
