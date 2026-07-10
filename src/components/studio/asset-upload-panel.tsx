"use client";

import { useCallback, useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2, Video } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { uploadAsset } from "@/lib/supabase/upload";
import { deleteAssetAction } from "@/lib/actions/scenes";
import { ASSET_ROLES, type UploadedAsset } from "@/lib/data/scenes";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";

type AssetRole = Database["public"]["Tables"]["uploaded_assets"]["Row"]["role"];

export function AssetUploadPanel({
  projectId,
  sceneId,
  assets,
}: {
  projectId: string;
  sceneId: string;
  assets: UploadedAsset[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<AssetRole>("main_starting_frame");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onDrop = useCallback(
    async (files: File[]) => {
      setUploading(true);
      try {
        for (const file of files) {
          await uploadAsset({ file, role, projectId, sceneId });
        }
        toast.success(`Uploaded ${files.length} file${files.length > 1 ? "s" : ""}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [role, projectId, sceneId, router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "video/webm": [".webm"],
    },
    multiple: true,
  });

  function handleDelete(assetId: string) {
    startTransition(async () => {
      try {
        await deleteAssetAction(assetId, projectId);
        toast.success("Removed.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove asset.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={role} onValueChange={(v) => setRole(v as AssetRole)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSET_ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
          Drag & drop PNG, JPG, WEBP, or a reference video — tagged as &ldquo;{ASSET_ROLES.find((r) => r.value === role)?.label}&rdquo;
        </p>
      </div>

      {assets.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {assets.map((asset) => (
            <div key={asset.id} className="group relative overflow-hidden rounded-md border border-border/60 bg-muted/40">
              {asset.mime_type.startsWith("video") ? (
                <div className="flex aspect-square items-center justify-center">
                  <Video className="size-6 text-muted-foreground" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.public_url ?? undefined} alt="" className="aspect-square w-full object-cover" />
              )}
              <Badge variant="secondary" className="absolute bottom-1 left-1 max-w-[90%] truncate text-[10px] font-normal">
                {ASSET_ROLES.find((r) => r.value === asset.role)?.label}
              </Badge>
              <Button
                size="icon"
                variant="destructive"
                className="absolute right-1 top-1 size-6 opacity-0 transition-opacity group-hover:opacity-100"
                disabled={isPending}
                onClick={() => handleDelete(asset.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
