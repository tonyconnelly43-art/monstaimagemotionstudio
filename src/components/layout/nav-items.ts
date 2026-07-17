import type { LucideIcon } from "lucide-react";
import {
  Clapperboard,
  FolderKanban,
  Users,
  Mic2,
  Music4,
  Wand2,
  History,
  Settings,
  MapPinned,
  Camera,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/studio", label: "Studio", icon: Clapperboard, description: "Build and generate scenes" },
  { href: "/projects", label: "Projects", icon: FolderKanban, description: "All your Hoop Squad projects" },
  { href: "/hoop-squad", label: "Hoop Squad", icon: MapPinned, description: "Scene & environment library" },
  { href: "/characters", label: "Characters", icon: Users, description: "Character library & consistency" },
  { href: "/voices", label: "Voices", icon: Mic2, description: "Character voice profiles" },
  { href: "/audio", label: "Audio", icon: Music4, description: "Dialogue, music & sound effects" },
  { href: "/scene-builder", label: "Scene Builder", icon: Camera, description: "Compose the exact shot with AI before animating it" },
  { href: "/prompt-builder", label: "Prompt Builder", icon: Wand2, description: "Guided video-motion prompt construction" },
  { href: "/history", label: "Generation History", icon: History, description: "Every take, searchable" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Models, defaults & diagnostics" },
];
