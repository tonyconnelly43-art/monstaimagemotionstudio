"use server";

import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWebsiteLeadsDatabaseUrl } from "@/lib/env";

const SAMPLE_LEADS = [
  {
    name: "Sarah Mitchell",
    company: "Mitchell HVAC Services",
    phone: "555-201-3344",
    email: "sarah@mitchellhvac.com",
    message: "Interested in a logo refresh and a new van wrap design.",
    package: "Brand Refresh",
    promo: "FREEBRAND10",
    daysAgo: 2,
  },
  {
    name: "James Carter",
    company: "Carter Duct Cleaning",
    phone: "555-488-2210",
    email: "jcarter@carterduct.com",
    message: "Would love a quote on a full rebrand — logo, website, social templates.",
    package: "Full Rebrand",
    promo: null,
    daysAgo: 1,
  },
  {
    name: "Dana Reyes",
    company: "Reyes Air Solutions",
    phone: "555-772-9081",
    email: null,
    message: "Just checking pricing for a simple logo update.",
    package: "Logo Only",
    promo: "SPRING2026",
    daysAgo: 0,
  },
];

export async function seedSampleLeadsAction(): Promise<{ ok: boolean; message: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const dbUrl = getWebsiteLeadsDatabaseUrl();
  if (!dbUrl) return { ok: false, message: "No leads database is connected yet." };

  try {
    const sql = neon(dbUrl);
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        message TEXT,
        package TEXT,
        promo TEXT,
        source TEXT NOT NULL DEFAULT 'website',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    for (const lead of SAMPLE_LEADS) {
      await sql`
        INSERT INTO leads (name, company, phone, email, message, package, promo, source, created_at)
        VALUES (${lead.name}, ${lead.company}, ${lead.phone}, ${lead.email}, ${lead.message}, ${lead.package}, ${lead.promo}, 'website', now() - (${lead.daysAgo} || ' days')::interval)
      `;
    }
    revalidatePath("/leads");
    return { ok: true, message: "Added 3 sample leads." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not add sample leads." };
  }
}

export async function deleteSampleLeadsAction(): Promise<{ ok: boolean; message: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const dbUrl = getWebsiteLeadsDatabaseUrl();
  if (!dbUrl) return { ok: false, message: "No leads database is connected yet." };

  try {
    const sql = neon(dbUrl);
    const companies = SAMPLE_LEADS.map((lead) => lead.company);
    await sql`DELETE FROM leads WHERE company = ANY(${companies})`;
    revalidatePath("/leads");
    return { ok: true, message: "Removed the sample leads." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not remove sample leads." };
  }
}
