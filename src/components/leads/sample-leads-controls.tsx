"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { seedSampleLeadsAction, deleteSampleLeadsAction } from "@/lib/actions/leads";

export function SampleLeadsControls({ hasLeads }: { hasLeads: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      const result = await seedSampleLeadsAction();
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await deleteSampleLeadsAction();
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handleSeed} disabled={isPending}>
        Add 3 sample leads
      </Button>
      {hasLeads ? (
        <Button variant="ghost" size="sm" onClick={handleRemove} disabled={isPending}>
          Remove sample leads
        </Button>
      ) : null}
    </div>
  );
}
