"use client";

import { useState, useRef, Suspense } from "react";
import { useTenantProfile }  from "@/hooks/useTenantProfile";
import { TenantSkeleton }    from "@/components/TenantSkeleton";
import { ErrorCard }         from "@/components/ErrorCard";
import { CafeProfile }       from "@/lib/supabase";

// ─── Primitive UI components (preserved from MVP, now colour-dynamic) ─────────

const WaveTop = ({ color1 = "#FFC93C", color2 = "#FFB020" }) => (
  <svg viewBox="0 0 400 110" xmlns="http://www.w3.org/2000/svg"
       style={{ display: "block", width: "100%", marginBottom: -2 }}>
    <rect width="400" height="110" fill={color1} />
    <path d="M0,60 C60,100 120,20 200,55 C280,90 340,20 400,50 L400,110 L0,110 Z" fill="white" />
    <path d="M0,75 C80,40 160,95 240,65 C310,40 360,80 400,65 L400,110 L0,110 Z" fill="white" opacity="0.4" />
  </svg>
);

const StarRating = ({ count = 4 }: { count?: number }) => (
  <div style={{ display: "flex", gap: 4, justifyContent: "center", margin: "8px 0 16px" }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{ fontSize: 28 }}>{i <= count ? "⭐" : "☆"}</span>
    ))}
  </div>
);

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background:   "white",
    borderRadius: 28,
    width:        "100%",
    maxWidth:     360,
    margin:       "0 auto",
    overflow:     "hidden",
    boxShadow:    "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
    fontFamily:   "'Nunito', 'Poppins', sans-serif",
    ...style,
  }}>
    {children}
  </div>
);

const EmojiAvatar = ({ emoji, bg = "#FFC93C" }: { emoji: string; bg?: string }) => (
  <div style={{ display: "flex", justifyContent: "center", marginTop: -36, marginBottom: 8 }}>
    <div style={{
      width:        72, height: 72, borderRadius: "50%",
      background:   `linear-gradient(135deg, ${bg}, #FFE082)`,
      border:       "4px solid white",
      display:      "flex", alignItems: "center", justifyContent: "center",
      fontSize:     36,
      boxShadow:    "0 4px 16px rgba(255,185,0,0.35)",
    }}>
      {emoji}
    </div>
  </div>
);

const PillBtn = ({
  children, onClick, variant = "primary", style = {},
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "sentiment";
  style?: React.CSSProperties;
}) => {
  const base: React.CSSProperties = {
    border: "none", borderRadius: 50, cursor: "pointer",
    fontFamily: "inherit", fontWeight: 700, fontSize: 15,
    padding: "13px 28px", width: "100%",
    transition: "transform 0.12s, box-shadow 0.12s",
    letterSpacing: 0.3,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary:   { background: "linear-gradient(135deg, #2196F3, #1565C0)", color: "white", boxShadow: "0 6px 20px rgba(33,150,243,0.4)" },
    ghost:     { background: "transparent", color: "#555", fontWeight: 700 },
    sentiment: { background: "white", color: "#333", border: "2px solid #eee", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  };
  return (
    <button
      style={{ ...base, ...variants[variant], ...style }}
      onClick={onClick}
      onMouseDown={e  => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={e    => (e.currentTarget.style.transform = "scale(1)")}
      onTouchStart={e => (e.currentTarget.style.transform = "scale(0.97)")}
      onTouchEnd={e   => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
};

const Toast = ({ msg, visible }: { msg: string; visible: boolean }) => (
  <div style={{
    position: "fixed", bottom: 32, left: "50%",
    transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
    background: "#1a1a1a", color: "white",
    padding: "10px 20px", borderRadius: 50,
    fontSize: 13, fontWeight: 600,
    opacity: visible ? 1 : 0,
    transition: "all 0.3s", pointerEvents: "none", zIndex: 99,
    fontFamily: "inherit", whiteSpace: "nowrap",
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
  }}>
    {msg}
  </div>
);

// ─── Static fallback used when Gemini times out or fails ─────────────────────
const STATIC_FALLBACK: Record<string, string[]> = {
  amazing: [
    "Absolutely loved every single bite! 🔥",
    "Best café experience in the city!",
    "Outstanding food, warm vibes, must visit!",
  ],
  good: [
    "Great spot, solid food and service!",
    "Really enjoyed our time here today.",
    "Good vibes, good food, will return!",
  ],
};

// ─── Main review UI (receives resolved tenant data as props) ─────────────────

type Step = "sentiment" | "variations" | "redirect" | "negative" | "thankyou";
type Sentiment = "amazing" | "good" | "average";

function ReviewUI({ cafe, tableNumber, slug }: { cafe: CafeProfile; tableNumber: number; slug: string }) {
  const [step,     setStep]     = useState<Step>("sentiment");
  const [sentiment,setSentiment]= useState<Sentiment | null>(null);
  const [picked,   setPicked]   = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [toast,    setToast]    = useState({ msg: "", visible: false });
  const [loading,          setLoading]          = useState(false);
  const [animKey,          setAnimKey]          = useState(0);
  const [variations,       setVariations]       = useState<string[]>([]);
  const [variationsLoading,setVariationsLoading]= useState(false);

  // Manual-copy fallback (populated if Clipboard API fails in Phase 3 full build)
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const manualRef = useRef<HTMLSpanElement>(null);
  const textRef   = useRef<HTMLTextAreaElement>(null);

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  };

  const goTo = (s: Step) => {
    setAnimKey(k => k + 1);
    setStep(s);
    setManualCopyText(null);
  };

  const handleSentiment = async (s: Sentiment) => {
    setSentiment(s);
    if (s === "average") {
      goTo("negative");
      return;
    }

    // Show variations step immediately with skeleton
    setVariations([]);
    setVariationsLoading(true);
    goTo("variations");

    try {
      const res = await fetch("/api/generate-review", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          cafe_slug:  slug,
          sentiment:  s,
          timestamp:  new Date().toISOString(),
        }),
      });
      const data = await res.json();
      setVariations(data.variations ?? STATIC_FALLBACK[s]);
    } catch {
      setVariations(STATIC_FALLBACK[s]);
    } finally {
      setVariationsLoading(false);
    }
  };

  // ── Clipboard: 3-attempt chain (full implementation in Phase 3) ─────────────
  const handleVariation = async (v: string) => {
    setPicked(v);
    let copied = false;

    // Attempt 1: Clipboard API
    try {
      await navigator.clipboard.writeText(v);
      copied = true;
    } catch { /* fall through */ }

    // Attempt 2: Legacy execCommand
    if (!copied) {
      try {
        const el = document.createElement("textarea");
        el.value = v;
        Object.assign(el.style, { position: "fixed", opacity: "0", top: "-9999px" });
        document.body.appendChild(el);
        el.focus();
        el.select();
        copied = document.execCommand("copy");
        document.body.removeChild(el);
      } catch { /* fall through */ }
    }

    if (copied) {
      showToast("✅ Copied! Paste it in the review box");
    } else {
      // Attempt 3: Expose manual copy UI (rendered in redirect step)
      setManualCopyText(v);
      showToast("👆 Tap the text below and copy manually");
    }

    setTimeout(() => goTo("redirect"), 900);
  };

  // ── Google deep-link — opens Maps directly to review compose with 5 stars ────
  const openGoogleReview = () => {
    // `ludocid` pre-selects the star rating when appended as a hash.
    // The writereview endpoint is the most stable cross-platform URL.
    const base = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(cafe.google_place_id)}`;
    window.open(base, "_blank", "noopener,noreferrer");
  };

  // ── Negative feedback submit (calls backend in Phase 4) ──────────────────────
  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) return;
    setLoading(true);

    try {
      await fetch("/api/submit-feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ cafe_slug: slug, table_number: tableNumber, feedback_text: feedback }),
      });
    } catch {
      // Swallow: we still show thank-you even if network failed.
      // Phase 4 adds proper logging/retry here.
    }

    setLoading(false);
    goTo("thankyou");
  };

  const accentColor = cafe.premium_color_hex;

  const slideIn: React.CSSProperties = {
    animation: "slideUp 0.38s cubic-bezier(0.22,1,0.36,1) both",
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        textarea:focus { outline: none; border-color: #2196F3 !important; }
      `}</style>

      {/* ── SENTIMENT ─────────────────────────────────────────────────────────── */}
      {step === "sentiment" && (
        <Card key={`s-${animKey}`} style={slideIn}>
          <div style={{
            background: `linear-gradient(160deg, ${accentColor}CC, ${accentColor})`,
            padding:    "28px 24px 0",
            textAlign:  "center",
          }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#7B4F00", letterSpacing: 1, textTransform: "uppercase", opacity: 0.7 }}>
              {tableNumber > 0 ? `Table ${tableNumber} · ` : ""}{cafe.business_name}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 900, color: "#3E2000" }}>
              How was your experience?
            </p>
          </div>
          <WaveTop color1={accentColor} color2={accentColor} />

          <EmojiAvatar emoji={cafe.logo_emoji} bg={accentColor} />

          <div style={{ padding: "4px 20px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
            {([
              { s: "amazing" as Sentiment, emoji: "🔥", label: "Amazing",  sub: "Loved everything!",          bg: "#FFF3E0" },
              { s: "good"    as Sentiment, emoji: "👍", label: "Good",     sub: "Pretty solid overall.",       bg: "#E8F5E9" },
              { s: "average" as Sentiment, emoji: "👎", label: "Average",  sub: "Could have been better.",     bg: "#F3F4F6" },
            ]).map(({ s, emoji, label, sub, bg }) => (
              <button
                key={s}
                onClick={() => handleSentiment(s)}
                style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           14,
                  background:    "white",
                  border:        "2px solid #f0f0f0",
                  borderRadius:  18,
                  padding:       "14px 16px",
                  cursor:        "pointer",
                  fontFamily:    "inherit",
                  textAlign:     "left",
                  transition:    "all 0.15s",
                  boxShadow:     "0 2px 8px rgba(0,0,0,0.04)",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.transform = "scale(1.015)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#f0f0f0";   e.currentTarget.style.transform = "scale(1)"; }}
              >
                <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {emoji}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a" }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#999", fontWeight: 600 }}>{sub}</div>
                </div>
                <div style={{ marginLeft: "auto", color: "#ccc", fontSize: 20 }}>›</div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ── VARIATIONS (Phase 2 will replace static copy with LLM output) ──────── */}
      {step === "variations" && (
        <Card key={`v-${animKey}`} style={slideIn}>
          <div style={{
            background: sentiment === "amazing"
              ? "linear-gradient(160deg, #FF8C42, #FFC93C)"
              : "linear-gradient(160deg, #66BB6A, #A5D6A7)",
            padding: "28px 24px 0", textAlign: "center",
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: sentiment === "amazing" ? "#5D2E00" : "#1B5E20", opacity: 0.75 }}>
              {sentiment === "amazing" ? "🔥 You loved it!" : "👍 Glad you enjoyed it!"}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 900, color: sentiment === "amazing" ? "#3E1000" : "#0D3E10" }}>
              Pick your review
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: sentiment === "amazing" ? "#7B4F00" : "#2E7D32", opacity: 0.8 }}>
              We'll copy it & open Google for you
            </p>
          </div>
          <WaveTop
            color1={sentiment === "amazing" ? "#FFC93C" : "#81C784"}
            color2={sentiment === "amazing" ? "#FFB020" : "#66BB6A"}
          />
          <div style={{ padding: "4px 20px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
            {variationsLoading ? (
              // ── Shimmer skeleton while Gemini generates ──────────────────────
              <>
                <style>{`
                  @keyframes shimmer2 {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                  }
                  .vshimmer {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: shimmer2 1.4s infinite;
                    border-radius: 16px;
                  }
                `}</style>
                {[1, 2, 3].map(i => (
                  <div key={i} className="vshimmer" style={{ height: 56 }} />
                ))}
                <p style={{ textAlign: "center", fontSize: 12, color: "#bbb", fontWeight: 600, margin: "4px 0 0" }}>
                  ✨ Crafting your reviews...
                </p>
              </>
            ) : (
              // ── Live Gemini variations ────────────────────────────────────────
              (variations.length ? variations : STATIC_FALLBACK[sentiment ?? "amazing"]).map((v, i) => (
                <button
                  key={i}
                  onClick={() => handleVariation(v)}
                  style={{
                    background:  "white", border: "2px solid #f0f0f0", borderRadius: 16,
                    padding:     "14px 16px", cursor: "pointer", fontFamily: "inherit",
                    fontWeight:  700, fontSize: 14, color: "#1a1a1a", textAlign: "left",
                    transition:  "all 0.15s", lineHeight: 1.4,
                    boxShadow:   "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#2196F3"; e.currentTarget.style.transform = "scale(1.015)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#f0f0f0"; e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <span style={{ marginRight: 8, opacity: 0.5 }}>{["✦", "✧", "✦"][i]}</span>
                  {v}
                </button>
              ))
            )}
            <button
              onClick={() => goTo("sentiment")}
              style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, marginTop: 4, padding: "6px 0" }}
            >
              ← Go back
            </button>
          </div>
        </Card>
      )}

      {/* ── REDIRECT ──────────────────────────────────────────────────────────── */}
      {step === "redirect" && (
        <Card key={`r-${animKey}`} style={slideIn}>
          <div style={{ background: `linear-gradient(160deg, ${accentColor}, ${accentColor}BB)`, padding: "36px 24px 0", textAlign: "center" }}>
            <div style={{ fontSize: 48, animation: "pulse 1.5s ease-in-out infinite" }}>😍</div>
          </div>
          <WaveTop color1={accentColor} />
          <div style={{ padding: "8px 24px 32px", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 900, color: "#1a1a1a" }}>Thanks!</h2>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#888", lineHeight: 1.6 }}>
              Your review is copied.<br />Just paste it on Google — it takes 10 seconds!
            </p>

            {/* Manual copy fallback (shown when Clipboard API fails) */}
            {manualCopyText && (
              <div
                onClick={() => {
                  const sel   = window.getSelection();
                  const range = document.createRange();
                  if (manualRef.current) {
                    range.selectNodeContents(manualRef.current);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                  }
                }}
                style={{
                  background:    "#FFF8E1",
                  border:        "2px dashed #FFC93C",
                  borderRadius:  12,
                  padding:       "12px 14px",
                  fontSize:      14,
                  fontWeight:    700,
                  color:         "#3E2000",
                  cursor:        "text",
                  userSelect:    "text",
                  marginBottom:  12,
                  textAlign:     "left",
                }}
              >
                <p style={{ margin: "0 0 6px", fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>
                  Tap to select → then copy
                </p>
                <span ref={manualRef}>{manualCopyText}</span>
              </div>
            )}

            {picked && !manualCopyText && (
              <div style={{
                background: "#f9f9f9", border: "1.5px dashed #e0e0e0", borderRadius: 12,
                padding: "10px 14px", fontSize: 13, color: "#555", marginBottom: 16,
                fontStyle: "italic", lineHeight: 1.5,
              }}>
                "{picked}"
              </div>
            )}

            <StarRating count={5} />
            <PillBtn onClick={openGoogleReview}>⭐ Rate on Google</PillBtn>
            <div style={{ marginTop: 12 }}>
              <PillBtn variant="ghost" onClick={() => goTo("sentiment")}>No, Thanks!</PillBtn>
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 11, color: "#ccc", fontWeight: 600, letterSpacing: 0.5 }}>
              powered by Craveping
            </p>
          </div>
        </Card>
      )}

      {/* ── NEGATIVE FEEDBACK ─────────────────────────────────────────────────── */}
      {step === "negative" && (
        <Card key={`n-${animKey}`} style={slideIn}>
          <div style={{ background: "linear-gradient(160deg, #90A4AE, #78909C)", padding: "28px 24px 0", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff", opacity: 0.75 }}>
              We're sorry to hear that
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 900, color: "white" }}>
              Tell us what went wrong
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              Your feedback goes directly to the owner
            </p>
          </div>
          <WaveTop color1="#90A4AE" color2="#78909C" />
          <div style={{ padding: "4px 20px 28px" }}>
            <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>Private — only the owner sees this</span>
            </div>
            <textarea
              ref={textRef}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="What could we have done better? Be as specific as you like..."
              rows={4}
              style={{
                width: "100%", borderRadius: 16, border: "2px solid #eee",
                padding: "12px 14px", fontFamily: "inherit", fontSize: 14,
                color: "#1a1a1a", resize: "none", boxSizing: "border-box",
                lineHeight: 1.6, background: "#fafafa", marginBottom: 12,
                transition: "border-color 0.2s",
              }}
            />
            <PillBtn onClick={handleFeedbackSubmit} style={{ opacity: feedback.trim() ? 1 : 0.5 }}>
              {loading
                ? <span style={{ display: "inline-block", width: 18, height: 18, border: "3px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite", verticalAlign: "middle" }} />
                : "Send Feedback →"
              }
            </PillBtn>
            <div style={{ marginTop: 10 }}>
              <PillBtn variant="ghost" onClick={() => goTo("sentiment")}>← Go back</PillBtn>
            </div>
          </div>
        </Card>
      )}

      {/* ── THANK YOU ─────────────────────────────────────────────────────────── */}
      {step === "thankyou" && (
        <Card key={`t-${animKey}`} style={slideIn}>
          <div style={{ background: `linear-gradient(160deg, ${accentColor}, ${accentColor}BB)`, padding: "36px 24px 0", textAlign: "center" }}>
            <div style={{ fontSize: 48, animation: "pulse 1.8s ease-in-out infinite" }}>🙏</div>
          </div>
          <WaveTop color1={accentColor} />
          <div style={{ padding: "8px 24px 32px", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 900, color: "#1a1a1a" }}>Thank You!</h2>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#888", lineHeight: 1.7, maxWidth: 260, marginLeft: "auto", marginRight: "auto" }}>
              We've notified the owner directly. We will work harder to make your next visit perfect.
            </p>
            <StarRating count={4} />
            <div style={{
              background: "#FFF8E1", borderRadius: 16, padding: "12px 16px",
              fontSize: 13, color: "#8B6914", fontWeight: 600, marginBottom: 16, lineHeight: 1.5,
            }}>
              💛 Want to give us another chance?<br />
              <span style={{ fontWeight: 400, color: "#B8860B" }}>Your next visit, show this to our staff for a complimentary chai.</span>
            </div>
            <PillBtn variant="ghost" onClick={() => { setSentiment(null); setFeedback(""); goTo("sentiment"); }}>
              Back to Home
            </PillBtn>
            <p style={{ margin: "16px 0 0", fontSize: 11, color: "#ccc", fontWeight: 600, letterSpacing: 0.5 }}>
              powered by Craveping
            </p>
          </div>
        </Card>
      )}

      <Toast msg={toast.msg} visible={toast.visible} />
    </>
  );
}

// ─── Shell: handles loading / error states, renders ReviewUI when ready ───────

function ReviewShell() {
  const { cafe, tableNumber, slug, loading, error } = useTenantProfile();

  return (
    <div style={{
      minHeight:       "100vh",
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      background:      "linear-gradient(135deg, #3B9EFF 0%, #1565C0 40%, #4FC3F7 100%)",
      padding:         "24px 16px",
      fontFamily:      "'Nunito', sans-serif",
    }}>
      {loading && <TenantSkeleton />}

      {!loading && error && (
        <ErrorCard
          error={error}
          onRetry={error === "fetch_error" ? () => window.location.reload() : undefined}
        />
      )}

      {!loading && !error && cafe && (
        <ReviewUI cafe={cafe} tableNumber={tableNumber} slug={slug} />
      )}
    </div>
  );
}

// ─── Page export: Suspense boundary required for useSearchParams in App Router ─

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #3B9EFF 0%, #1565C0 40%, #4FC3F7 100%)",
        padding: "24px 16px",
      }}>
        <TenantSkeleton />
      </div>
    }>
      <ReviewShell />
    </Suspense>
  );
}