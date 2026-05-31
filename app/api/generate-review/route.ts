import Groq          from "groq-sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest }  from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Rate limiter ───────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now  = Date.now();
  const hits = (rateLimitMap.get(ip) ?? []).filter(t => now - t < 60_000);
  hits.push(now);
  rateLimitMap.set(ip, hits);
  return hits.length > 10;
}

// ── Static fallback if Groq fails ─────────────────────────────────────────────
const FALLBACK: Record<string, string[]> = {
  amazing: [
    "Ekdum mast place, totally loved it!",
    "Best café vibes in the city!",
    "Will come back for sure, zabardast!",
  ],
  good: [
    "Solid spot, chai was on point.",
    "Good vibes, will visit again yaar.",
    "Nice place for a chill adda.",
  ],
};

const SYSTEM_PROMPT = `You are a review-copy specialist for Craveping, a café feedback SaaS used across India.
Generate exactly 3 short, authentic-sounding Google review snippets written by Indian café customers.

Rules:
- Each snippet must be 5–7 words only. No exceptions.
- Write in natural Indian English — the kind a real Indian customer would type.
  Use phrases like: "totally worth it", "must visit yaar", "vibes were too good",
  "chai was on point", "such a chill spot", "loved the ambiance", "will come back for sure".
- You may occasionally use a single Hinglish word naturally:
  e.g. "ekdum", "mast", "zabardast", "yaar", "bilkul", "sahi".
- Do not use the café name.
- Vary sentence structure: one statement, one exclamation, one recommendation.
- Output ONLY a raw JSON array of 3 strings. No markdown, no backticks, no explanation.

India Time/Day Context (IST):
  Weekday 06:00–09:30 → morning chai run, breakfast before work
  Weekday 09:30–12:00 → work-from-café crowd, second coffee
  Weekday 12:00–15:00 → office lunch crowd, quick bite
  Weekday 15:00–17:30 → evening chai break, adda with colleagues
  Weekday 17:30–20:00 → after-office hangout, college crowd
  Weekday 20:00–22:30 → dinner outing, couples evening
  Weekend 08:00–11:00 → lazy weekend morning, slow breakfast
  Weekend 11:00–15:00 → weekend brunch, friends outing
  Weekend 15:00–18:00 → weekend adda, evening snacks
  Weekend 18:00–22:00 → date night, friends dinner
  Any 22:30–05:59    → late-night craving, night owl snack

Sentiment:
  amazing → enthusiastic, high-energy Indian English
  good    → warm, genuine, satisfied but chill`;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const { cafe_slug, sentiment, timestamp } = await req.json();

  if (!["amazing", "good"].includes(sentiment)) {
    return Response.json({ error: "invalid_sentiment" }, { status: 400 });
  }

  // Verify cafe exists
  const { data: cafe, error: dbErr } = await supabase
    .from("cafes")
    .select("id")
    .eq("slug", cafe_slug)
    .eq("is_active", true)
    .single();

  if (dbErr || !cafe) {
    console.error("[generate-review] cafe_not_found:", cafe_slug);
    return Response.json({ variations: FALLBACK[sentiment] });
  }

  // Format time in IST
  const dt         = new Date(timestamp);
  const timeString = dt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday:  "long",
    hour:     "numeric",
    minute:   "2-digit",
    hour12:   true,
  });

  console.log("[generate-review] calling Groq →", sentiment, timeString);

  try {
    const completion = await groq.chat.completions.create({
      model:       "llama-3.1-8b-instant",   // free, fast, reliable
      max_tokens:  256,
      temperature: 0.9,                // higher = more varied reviews each time
      messages: [
        { role: "system",  content: SYSTEM_PROMPT },
        { role: "user",    content: `Sentiment: ${sentiment}\nCurrent time: ${timeString}` },
      ],
    });

    const raw     = completion.choices[0]?.message?.content?.trim() ?? "";
    console.log("[generate-review] Groq raw:", raw);

    const cleaned    = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const variations = JSON.parse(cleaned) as string[];

    console.log("[generate-review] success →", variations);
    return Response.json({ variations });

  } catch (err) {
    console.error("[generate-review] Groq failed:", err);
    return Response.json({ variations: FALLBACK[sentiment] });
  }
}