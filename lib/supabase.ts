import { createClient } from "@supabase/supabase-js";

// Anon key — safe to expose on the frontend.
// RLS ensures only `is_active = true` cafes are readable.
// No sensitive columns (owner_whatsapp_number, etc.) are in the SELECT set.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CafeProfile {
  business_name:     string;
  google_place_id:   string;
  premium_color_hex: string;
  logo_emoji:        string;
}

export type TenantError =
  | "missing_slug"
  | "invalid_table"
  | "cafe_not_found"
  | "fetch_error";