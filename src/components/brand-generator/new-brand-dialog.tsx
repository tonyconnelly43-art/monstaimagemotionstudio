"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBrandProjectAction } from "@/lib/actions/brand";

export function NewBrandDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [companyInfo, setCompanyInfo] = useState("");
  const [pending, setPending] = useState(false);

  function handleCreate() {
    setPending(true);
    createBrandProjectAction(name, companyInfo)
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setOpen(false);
        setName("");
        setCompanyInfo("");
        if (result.id) router.push(`/brand-generator/${result.id}`);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not create the brand project."))
      .finally(() => setPending(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus className="size-4" /> New Brand</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New brand project</DialogTitle>
          <DialogDescription>
            Name the company and give a quick description — you&apos;ll add references and generate the brand next.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Company name</Label>
            <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rocket Air HVAC" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-info">Company info</Label>
            <Textarea
              id="brand-info"
              value={companyInfo}
              onChange={(e) => setCompanyInfo(e.target.value)}
              placeholder="What the company does, tone/personality, any name ideas you already have for the mascot, etc."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
