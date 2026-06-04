"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface Category {
  id:         string;
  name:       string;
  sort_order: number;
}

export interface Dish {
  id:               string;
  name:             string;
  description:      string | null;
  price:            number;      // in paise
  video_url:        string;
  thumbnail_url:    string | null;
  is_available:     boolean;
  is_todays_special:boolean;
  special_date:     string | null;
  is_veg:           boolean;
  sort_order:       number;
  category_id:      string | null;
}

export interface MenuData {
  categories: Category[];
  dishes:     Dish[];
  loading:    boolean;
  error:      string | null;
}

function getTodayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function useMenuData(cafeId: string | null): MenuData {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes,     setDishes]     = useState<Dish[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!cafeId) return;

    let cancelled = false;

    async function fetch() {
      setLoading(true);

      const [catRes, dishRes] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, sort_order")
          .eq("cafe_id", cafeId)
          .order("sort_order"),
        supabase
          .from("dishes")
          .select("id, name, description, price, video_url, thumbnail_url, is_available, is_todays_special, special_date, is_veg, sort_order, category_id")
          .eq("cafe_id", cafeId)
          .eq("is_available", true)
          .order("sort_order"),
      ]);

      if (cancelled) return;

      if (catRes.error || dishRes.error) {
        setError("Failed to load menu");
      } else {
        setCategories(catRes.data ?? []);
        setDishes(dishRes.data ?? []);
      }
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [cafeId]);

  // Mark today's specials correctly using IST date
  const today   = getTodayIST();
  const enriched = dishes.map(d => ({
    ...d,
    is_todays_special: d.is_todays_special && d.special_date === today,
  }));

  return { categories, dishes: enriched, loading, error };
}