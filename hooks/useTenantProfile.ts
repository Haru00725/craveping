"use client";

import { useState, useEffect } from "react";
import { useSearchParams }     from "next/navigation";
import { supabase, CafeProfile, TenantError } from "@/lib/supabase";

export interface TenantState {
  cafe:        CafeProfile | null;
  tableNumber: number;
  slug:        string;
  loading:     boolean;
  error:       TenantError | null;
}

/**
 * Reads `?cafe=<slug>&table=<n>` from the URL,
 * fetches the matching cafe row from Supabase,
 * and returns a stable state object for the review UI.
 *
 * Only public-safe columns are requested:
 *   business_name, google_place_id, premium_color_hex, logo_emoji
 *
 * The cafe UUID and owner_whatsapp_number never reach the client.
 */
export function useTenantProfile(): TenantState {
  const params = useSearchParams();

  const slug     = params.get("cafe")  ?? "";
  const rawTable = params.get("table") ?? "";
  const tableNumber = parseInt(rawTable, 10);

  const [cafe,    setCafe]    = useState<CafeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<TenantError | null>(null);

  useEffect(() => {
    // ── Guard: slug required ──────────────────────────────────────────────────
    if (!slug) {
      setError("missing_slug");
      setLoading(false);
      return;
    }

    // ── Guard: table must be a positive integer ───────────────────────────────
    if (!rawTable || isNaN(tableNumber) || tableNumber < 1) {
      setError("invalid_table");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchCafe() {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from("cafes")
        .select("business_name, google_place_id, premium_color_hex, logo_emoji")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (cancelled) return;

      if (dbError || !data) {
        setError(dbError?.code === "PGRST116" ? "cafe_not_found" : "fetch_error");
        setCafe(null);
      } else {
        setCafe(data as CafeProfile);
      }

      setLoading(false);
    }

    fetchCafe();

    // Cleanup: ignore stale response if slug changes mid-flight
    return () => { cancelled = true; };
  }, [slug, rawTable]); // eslint-disable-line react-hooks/exhaustive-deps

  return { cafe, tableNumber, slug, loading, error };
}