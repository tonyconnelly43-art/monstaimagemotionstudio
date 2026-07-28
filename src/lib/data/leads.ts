import "server-only";
import { neon } from "@neondatabase/serverless";
import { getWebsiteLeadsDatabaseUrl } from "@/lib/env";

export interface WebsiteLead {
  id: number;
  name: string;
  company: string;
  phone: string;
  email: string | null;
  message: string | null;
  package: string | null;
  promo: string | null;
  source: string;
  created_at: string;
}

export interface WebsiteLeadsResult {
  leads: WebsiteLead[];
  /** True when no leads database URL is available at all — distinct from "zero leads yet". */
  notConfigured: boolean;
  error: string | null;
}

/**
 * Reads directly from the monsta-media-site marketing website's own Neon
 * database. That site's `app/api/quote/route.ts` is what actually writes to
 * the `leads` table; this is read-only.
 */
export async function listWebsiteLeads(): Promise<WebsiteLeadsResult> {
  const dbUrl = getWebsiteLeadsDatabaseUrl();
  if (!dbUrl) {
    return { leads: [], notConfigured: true, error: null };
  }

  try {
    const sql = neon(dbUrl);
    const rows = (await sql`
      SELECT id, name, company, phone, email, message, package, promo, source, created_at
      FROM leads
      ORDER BY created_at DESC
    `) as WebsiteLead[];
    return { leads: rows, notConfigured: false, error: null };
  } catch (error) {
    // Most likely cause: no one has submitted the website's lead form yet,
    // so the `leads` table hasn't been created (that route creates it on
    // first insert, not up front).
    console.error("Failed to load website leads:", error);
    return { leads: [], notConfigured: false, error: "No leads yet, or the website's leads table hasn't been created." };
  }
}
