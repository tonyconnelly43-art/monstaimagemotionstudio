import { Badge } from "@/components/ui/badge";

export function PhaseBadge({ phase }: { phase: "Phase 3" | "Phase 4" }) {
  return (
    <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
      {phase} — Coming Soon
    </Badge>
  );
}
