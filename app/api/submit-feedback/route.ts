import { createClient } from "@supabase/supabase-js";
import { NextRequest }   from "next/server";
import { createHash }    from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashIp(ip: string, ua: string): string {
  return createHash("sha256").update(`${ip}:${ua}`).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const ua = req.headers.get("user-agent")      ?? "unknown";

  const { cafe_slug, table_number, feedback_text, sentiment = "average", review_picked } =
    await req.json();

  // ── 1. Resolve slug → full cafe record ────────────────────────────────────────
  const { data: cafe, error: dbErr } = await supabase
    .from("cafes")
    .select("id, business_name, owner_whatsapp_number")
    .eq("slug", cafe_slug)
    .eq("is_active", true)
    .single();

  if (dbErr || !cafe) {
    return Response.json({ error: "cafe_not_found" }, { status: 404 });
  }

  // ── 2. Spam guard: max 3 average submissions per table per hour ───────────────
  if (sentiment === "average") {
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await supabase
      .from("feedback_logs")
      .select("*", { count: "exact", head: true })
      .eq("cafe_id", cafe.id)
      .eq("table_number", table_number)
      .eq("score_sentiment", "average")
      .gte("created_at", hourAgo);

    if ((count ?? 0) >= 3) {
      return Response.json({ error: "rate_limited" }, { status: 429 });
    }
  }

  // ── 3. Log to feedback_logs ───────────────────────────────────────────────────
  await supabase.from("feedback_logs").insert({
    cafe_id:        cafe.id,
    table_number:   Number(table_number),
    score_sentiment:sentiment,
    feedback_text:  feedback_text ?? null,
    review_picked:  review_picked ?? null,
    ip_fingerprint: hashIp(ip, ua),
  });

  // ── 4. WhatsApp Cloud API (negative feedback only) ───────────────────────────
  if (
    sentiment === "average" &&
    feedback_text?.trim() &&
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  ) {
    const timeStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    try {
      const waRes = await fetch(
        `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to:                cafe.owner_whatsapp_number,
            type:              "template",
            template: {
              name:     "feedback_received",
              language: { code: "en" },
              components: [{
                type:       "body",
                parameters: [
                  { type: "text", text: String(table_number) },
                  { type: "text", text: cafe.business_name  },
                  { type: "text", text: feedback_text        },
                  { type: "text", text: timeStr              },
                ],
              }],
            },
          }),
        }
      );

      if (!waRes.ok) {
        // Log but don't fail — feedback is already saved in DB
        console.error("WhatsApp API error:", await waRes.text());
      }
    } catch (err) {
      console.error("WhatsApp fetch failed:", err);
    }
  }

  return Response.json({ success: true });
}