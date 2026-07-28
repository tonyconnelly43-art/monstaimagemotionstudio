export type LeadStatus = "hot" | "slow" | "cold";

const HOT_HOURS = 24;
const SLOW_HOURS = 72;

/**
 * Purely age-based for now — there's no "contacted"/CRM-stage tracking on
 * the leads table yet, so "no movement" just means time since the form
 * submission. Thresholds picked to match a fast-follow-up sales cycle.
 */
export function getLeadStatus(createdAt: string, now: Date = new Date()): LeadStatus {
  const ageHours = (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (ageHours < HOT_HOURS) return "hot";
  if (ageHours < SLOW_HOURS) return "slow";
  return "cold";
}

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  hot: "New",
  slow: "Slow",
  cold: "Cold",
};

export const LEAD_STATUS_DOT_CLASS: Record<LeadStatus, string> = {
  hot: "bg-emerald-500",
  slow: "bg-amber-500",
  cold: "bg-sky-500",
};

export const LEAD_STATUS_DESCRIPTION: Record<LeadStatus, string> = {
  hot: "Submitted less than 24 hours ago.",
  slow: "Submitted 1–3 days ago with no update yet.",
  cold: "Submitted more than 3 days ago with no update yet.",
};

export interface LeadScoreInput {
  package: string | null;
  promo: string | null;
  email: string | null;
  message: string | null;
}

/**
 * Heuristic "how likely to close" score (0–100) from what the lead actually
 * filled in on the form — more detail volunteered generally means more
 * genuine intent. Every lead already cleared name/company/phone (required
 * fields), so those aren't differentiating signals.
 */
export function getLeadScore(lead: LeadScoreInput): number {
  let score = 15;
  if (lead.package?.trim()) score += 25;
  if (lead.promo?.trim()) score += 15;
  if (lead.email?.trim()) score += 20;

  const messageLength = lead.message?.trim().length ?? 0;
  if (messageLength > 0) score += 10;
  if (messageLength > 40) score += 10;
  if (messageLength > 150) score += 5;

  return Math.min(100, score);
}

export type ScoreTier = "high" | "medium" | "low";

export function getScoreTier(score: number): ScoreTier {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export const SCORE_TIER_LABEL: Record<ScoreTier, string> = {
  high: "Likely to close",
  medium: "Worth a follow-up",
  low: "Long shot",
};

export const SCORE_TIER_BAR_CLASS: Record<ScoreTier, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/40",
};
