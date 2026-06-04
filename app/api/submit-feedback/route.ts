import { createClient } from "@supabase/supabase-js";
import { NextRequest }   from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { dish_id, event_type, session_id } = await req.json();

    if (!dish_id || !["view", "order_intent"].includes(event_type)) {
      return Response.json({ error: "invalid" }, { status: 400 });
    }

    // Get cafe_id from dish
    const { data: dish } = await supabase
      .from("dishes")
      .select("cafe_id")
      .eq("id", dish_id)
      .single();

    if (!dish) return Response.json({ ok: false });

    await supabase.from("dish_events").insert({
      cafe_id:    dish.cafe_id,
      dish_id,
      event_type,
      session_id: session_id ?? null,
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}