import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar email={user?.email ?? null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader email={user?.email ?? null} />
        <main className="min-w-0 flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}
