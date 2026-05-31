import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient }       from "@supabase/supabase-js";
import { NextRequest }        from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Simple in-memory rate limiter (swap for Upstash Redis in prod) ─────────────
const rateLimitMap = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now  = Date.now();
  const hits = (rateLimitMap.get(ip) ?? []).filter(t => now - t < 60_000);
  hits.push(now);
  rateLimitMap.set(ip, hits);
  return hits.length > 10;
}

// ── Static fallback if Gemini times out or fails ────────────────────────────────
const FALLBACK: Record<string, string[]> = {
  amazing: [
    "Absolutely loved every single moment here!",
    "Best café experience in the city, truly!",
    "Outstanding food and warm vibes always.",
  ],
  good: [
    "Really solid spot with great food!",
    "Enjoyed our time here, will return.",
    "Good vibes and even better coffee!",
  ],
};

const SYSTEM_PROMPT = `You are a review-copy specialist for Craveping, a café feedback SaaS used across India.
Your job is to generate exactly 3 short, authentic-sounding Google review snippets written by Indian café customers.

Rules:
- Each snippet must be 5–7 words only. No exceptions.
- Write in natural Indian English — the kind a real Indian customer would type.
  Use phrases like: "totally worth it", "must visit yaar", "vibes were too good",
  "chai was on point", "such a chill spot", "loved the ambiance", "will come back for sure".
- You may occasionally (1 out of 3) use a single Hindi/Hinglish word naturally:
  e.g. "ekdum", "mast", "zabardast", "yaar", "bilkul", "sahi", "jaldi aana chahiye".
  Never force it — only if it sounds natural.
- Do not use the café name. Keep it general so any Indian café can use it.
- Vary sentence structure: one statement, one exclamation, one short recommendation.
- Never repeat "amazing", "perfect", "great" more than once across all 3 snippets.
- Output ONLY a raw JSON array of 3 strings. No markdown, no backticks, no preamble.

India Time/Day Context Mapping (IST — apply these cues naturally):
  Weekday 06:00–09:30 → morning chai run, early office crowd, breakfast before work
  Weekday 09:30–12:00 → mid-morning catch-up, work-from-café crowd, second coffee
  Weekday 12:00–15:00 → lunch break, quick biryani or sandwich, office lunch crowd
  Weekday 15:00–17:30 → evening chai break, post-lunch slump, adda time with colleagues
  Weekday 17:30–20:00 → after-office hangout, unwinding after work, college crowd
  Weekday 20:00–22:30 → dinner outing, family dinner, couples evening
  Weekend 08:00–11:00 → lazy weekend morning, slow breakfast, no-rush chai
  Weekend 11:00–15:00 → weekend brunch, friends outing, family lunch
  Weekend 15:00–18:00 → weekend adda, evening snacks, cousins hangout
  Weekend 18:00–22:00 → Saturday/Sunday night out, date night, friends dinner
  Any     22:30–05:59 → late-night craving, post-movie stop, night owl snack

Café context:
  The café is located in India. Reviews should feel local — mention chai, filter coffee,
  cutting chai, vada pav, sandwich, biryani, or snacks only if it fits naturally.
  Focus on vibes, ambiance, service, and food quality in Indian casual English.

Sentiment modifier:
  amazing → enthusiastic, high-energy Indian English, slightly dramatic praise
  good    → warm, genuine, everyday Indian customer tone — satisfied but chill`;


export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const { cafe_slug, sentiment, timestamp } = await req.json();

  // Validate sentiment
  if (!["amazing", "good"].includes(sentiment)) {
    return Response.json({ error: "invalid_sentiment" }, { status: 400 });
  }

  // Verify cafe exists server-side (slug → id never exposed to frontend)
  const { data: cafe, error: dbErr } = await supabase
    .from("cafes")
    .select("id")
    .eq("slug", cafe_slug)
    .eq("is_active", true)
    .single();

  if (dbErr || !cafe) {
    return Response.json({ error: "cafe_not_found" }, { status: 404 });
  }

  // Format timestamp in IST — always use Indian timezone regardless of server location
  const dt         = new Date(timestamp);
  const timeString = dt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday:  "long",
    hour:     "numeric",
    minute:   "2-digit",
    hour12:   true,
  });

  // Call Gemini with a 6-second timeout
  try {
    const model = genAI.getGenerativeModel({
      model:          "gemini-1.5-flash",       // fast + cheap, ideal for this use case
      systemInstruction: SYSTEM_PROMPT,
    });

    const userPrompt = `Sentiment: ${sentiment}\nCurrent time: ${timeString}`;

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 6000);

    const result = await model.generateContent(userPrompt);

    clearTimeout(timeout);

    const raw        = result.response.text().trim();

    // Strip accidental markdown fences if Gemini adds them
    const cleaned    = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const variations = JSON.parse(cleaned) as string[];

    return Response.json({ variations });

  } catch {
    // On timeout or parse error → silent fallback, user never sees an error state
    return Response.json({ variations: FALLBACK[sentiment] });
  }
}