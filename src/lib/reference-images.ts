import { CHARACTER_REFERENCE_TYPES, type CharacterRow, type CharacterReference } from "@/lib/data/characters";
import { SCENE_VIEW_FIELDS, type HoopSquadScene, type SceneReference } from "@/lib/data/hoop-squad-scenes";

export interface LibraryImage {
  key: string;
  url: string;
  label: string;
}

/** Every saved photo for a character: the four profile slots plus every Reference Images gallery entry. */
export function characterLibraryImages(character: CharacterRow, references: CharacterReference[]): LibraryImage[] {
  const profile: LibraryImage[] = [
    { field: character.main_image_url, label: "Main" },
    { field: character.front_view_url, label: "Front View" },
    { field: character.side_view_url, label: "Side View" },
    { field: character.back_view_url, label: "Back View" },
  ]
    .filter((f): f is { field: string; label: string } => Boolean(f.field))
    .map((f) => ({ key: `${character.id}-${f.label}`, url: f.field, label: f.label }));

  const refs: LibraryImage[] = references
    .filter((r) => r.character_id === character.id)
    .map((r) => ({
      key: r.id,
      url: r.image_url,
      label: r.label || CHARACTER_REFERENCE_TYPES.find((t) => t.value === r.reference_type)?.label || "Reference",
    }));

  return [...profile, ...refs];
}

/** Every saved photo for a location: the Environment View Set fields plus every Additional Camera Angles entry. */
export function locationLibraryImages(location: HoopSquadScene, references: SceneReference[]): LibraryImage[] {
  const namedViews: LibraryImage[] = SCENE_VIEW_FIELDS.filter((f) => Boolean(location[f.field])).map((f) => ({
    key: `${location.id}-${f.field}`,
    url: location[f.field] as string,
    label: f.label,
  }));

  const refs: LibraryImage[] = references
    .filter((r) => r.hoop_squad_scene_id === location.id)
    .map((r) => ({ key: r.id, url: r.image_url, label: r.view_label }));

  return [...namedViews, ...refs];
}
