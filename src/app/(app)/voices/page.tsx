import { PageHeader } from "@/components/shared/page-header";
import { VoiceList } from "@/components/voices/voice-list";
import { VoiceDesignPanel } from "@/components/voices/voice-design-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { Mic2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listVoices } from "@/lib/data/audio";
import { listCharacters } from "@/lib/data/characters";

export default async function VoicesPage() {
  const supabase = await createServerSupabaseClient();
  const [voices, characters] = await Promise.all([listVoices(supabase), listCharacters(supabase)]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Voices"
        description="Saved character voice profiles, generated via ElevenLabs on fal. Preview before saving, and only clone voices you have permission to use."
      />
      <div className="space-y-4 p-6">
        <VoiceDesignPanel characters={characters} />
        {voices.length === 0 ? (
          <EmptyState icon={Mic2} title="No voices yet" description="Add a voice profile below to give a Hoop Squad character a saved, reusable voice." />
        ) : null}
        <VoiceList voices={voices} characters={characters} />
      </div>
    </div>
  );
}
