import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/data/settings";
import { isFalConfigured, isSupabaseConfigured, isAnthropicConfigured, isWebsiteLeadsConfigured } from "@/lib/env";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const settings = user ? await getAppSettings(supabase, user.id) : null;

  if (!settings) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Settings" description="Settings could not be loaded." />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Settings" description="Models, defaults, cost controls, and diagnostics." />
      <SettingsForm
        settings={settings}
        falConfigured={isFalConfigured()}
        supabaseConfigured={isSupabaseConfigured()}
        anthropicConfigured={isAnthropicConfigured()}
        websiteLeadsConfigured={isWebsiteLeadsConfigured()}
      />
    </div>
  );
}
