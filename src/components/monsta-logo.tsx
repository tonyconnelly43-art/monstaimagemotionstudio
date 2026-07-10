import { cn } from "@/lib/utils";

export function MonstaLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-bold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-sm text-black shadow-lg shadow-primary/20">
        M
      </span>
      <span className="text-lg leading-none">
        Monsta <span className="text-muted-foreground font-medium">Studio</span>
      </span>
    </div>
  );
}
