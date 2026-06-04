"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase, CafeProfile } from "@/lib/supabase";
import { useMenuData, Dish, Category } from "@/hooks/useMenuData";
import { useOrderCart } from "@/hooks/useOrderCart";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantState {
  cafe:    (CafeProfile & { id: string }) | null;
  loading: boolean;
  error:   string | null;
  slug:    string;
  table:   number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (paise: number) => `₹${(paise / 100).toFixed(0)}`;

// ─── Video Dish Card ──────────────────────────────────────────────────────────

function DishCard({
  dish,
  onAdd,
  quantity,
  accentColor,
}: {
  dish:        Dish;
  onAdd:       () => void;
  quantity:    number;
  accentColor: string;
}) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const cardRef   = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [viewed,  setViewed]  = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          videoRef.current?.play().catch(() => {});
          setPlaying(true);
          // Fire view event after 2s
          if (!viewed) {
            setTimeout(() => {
              setViewed(true);
              fetch("/api/track-event", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ dish_id: dish.id, event_type: "view" }),
              }).catch(() => {});
            }, 2000);
          }
        } else {
          videoRef.current?.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [dish.id, viewed]);

  const handleAdd = () => {
    onAdd();
    fetch("/api/track-event", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ dish_id: dish.id, event_type: "order_intent" }),
    }).catch(() => {});
  };

  return (
    <div
      ref={cardRef}
      style={{
        display:       "grid",
        gridTemplateColumns: "1fr 140px",
        gap:           0,
        borderBottom:  "1.5px solid #1a1a1a",
        padding:       "28px 0",
        alignItems:    "start",
        position:      "relative",
      }}
    >
      {/* Left: text info */}
      <div style={{ paddingRight: 20 }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {dish.is_todays_special && (
            <span style={{
              background: "#1a1a1a", color: "#F5F0E8",
              fontSize: 9, fontWeight: 800, letterSpacing: 1.5,
              padding: "3px 8px", textTransform: "uppercase",
            }}>
              TODAY'S SPECIAL
            </span>
          )}
          <span style={{
            border:     `1.5px solid ${dish.is_veg ? "#2D6A4F" : "#8B0000"}`,
            color:      dish.is_veg ? "#2D6A4F" : "#8B0000",
            fontSize:   9, fontWeight: 700, letterSpacing: 1,
            padding:    "2px 6px", textTransform: "uppercase",
          }}>
            {dish.is_veg ? "● VEG" : "● NON-VEG"}
          </span>
        </div>

        {/* Name */}
        <h3 style={{
          margin:       "0 0 6px",
          fontSize:     18,
          fontWeight:   900,
          fontFamily:   "'Bebas Neue', 'Impact', sans-serif",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color:        "#1a1a1a",
          lineHeight:   1.1,
        }}>
          {dish.name}
        </h3>

        {/* Description */}
        {dish.description && (
          <p style={{
            margin:     "0 0 12px",
            fontSize:   12,
            color:      "#555",
            lineHeight: 1.6,
            fontFamily: "'Georgia', serif",
          }}>
            {dish.description}
          </p>
        )}

        {/* Price + Add button */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize:   20,
            fontWeight: 900,
            fontFamily: "'Bebas Neue', 'Impact', sans-serif",
            letterSpacing: 1,
            color:      "#1a1a1a",
          }}>
            {fmt(dish.price)}
          </span>

          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              style={{
                background:  "#1a1a1a",
                color:       "#F5F0E8",
                border:      "none",
                padding:     "7px 16px",
                fontSize:    11,
                fontWeight:  800,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                cursor:      "pointer",
                fontFamily:  "inherit",
                transition:  "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = accentColor; e.currentTarget.style.color = "#1a1a1a"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#F5F0E8"; }}
            >
              + ADD
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: "2px solid #1a1a1a" }}>
              <button
                onClick={() => {}}
                style={{
                  background: "transparent", border: "none",
                  width: 30, height: 30, cursor: "pointer",
                  fontSize: 16, fontWeight: 900, color: "#1a1a1a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                −
              </button>
              <span style={{
                width: 28, textAlign: "center",
                fontSize: 13, fontWeight: 800, color: "#1a1a1a",
              }}>
                {quantity}
              </span>
              <button
                onClick={handleAdd}
                style={{
                  background: "#1a1a1a", border: "none",
                  width: 30, height: 30, cursor: "pointer",
                  fontSize: 16, fontWeight: 900, color: "#F5F0E8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: video thumbnail */}
      <div style={{ position: "relative", width: 140, height: 100, flexShrink: 0 }}>
        <video
          ref={videoRef}
          src={dish.video_url}
          poster={dish.thumbnail_url ?? undefined}
          loop
          muted
          playsInline
          style={{
            width:      "100%",
            height:     "100%",
            objectFit:  "cover",
            display:    "block",
          }}
        />
        {/* Play indicator */}
        {!playing && (
          <div style={{
            position:        "absolute", inset: 0,
            background:      "rgba(0,0,0,0.35)",
            display:         "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 10, marginLeft: 2, color: "#1a1a1a" }}>▶</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  dishes,
  cart,
  onAdd,
  accentColor,
}: {
  category:    Category | null;
  dishes:      Dish[];
  cart:        Record<string, number>;
  onAdd:       (dish: Dish) => void;
  accentColor: string;
}) {
  if (dishes.length === 0) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      {category && (
        <div style={{
          display:         "flex",
          alignItems:      "center",
          gap:             16,
          padding:         "20px 0 8px",
          borderBottom:    "3px solid #1a1a1a",
          marginBottom:    0,
        }}>
          <h2 style={{
            margin:        0,
            fontSize:      11,
            fontWeight:    800,
            letterSpacing: 3,
            textTransform: "uppercase",
            color:         "#1a1a1a",
            fontFamily:    "inherit",
          }}>
            {category.name}
          </h2>
          <div style={{ flex: 1, height: 1, background: "transparent" }} />
          <span style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: 1 }}>
            {dishes.length} items
          </span>
        </div>
      )}
      {dishes.map(dish => (
        <DishCard
          key={dish.id}
          dish={dish}
          onAdd={() => onAdd(dish)}
          quantity={cart[dish.id] ?? 0}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MenuSkeleton() {
  return (
    <div style={{ background: "#F5F0E8", minHeight: "100vh", padding: "0 24px" }}>
      <style>{`
        @keyframes sk { 0%,100%{opacity:.4} 50%{opacity:.9} }
        .sk { animation: sk 1.4s ease-in-out infinite; background: #ddd8cc; border-radius: 2px; }
      `}</style>
      <div style={{ height: 80, paddingTop: 32, marginBottom: 24 }}>
        <div className="sk" style={{ height: 32, width: 160, marginBottom: 8 }} />
        <div className="sk" style={{ height: 14, width: 100 }} />
      </div>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 20, padding: "28px 0", borderBottom: "1.5px solid #ddd8cc" }}>
          <div>
            <div className="sk" style={{ height: 22, width: "70%", marginBottom: 10 }} />
            <div className="sk" style={{ height: 12, width: "90%", marginBottom: 6 }} />
            <div className="sk" style={{ height: 12, width: "60%", marginBottom: 16 }} />
            <div className="sk" style={{ height: 32, width: 100 }} />
          </div>
          <div className="sk" style={{ height: 100 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Order Drawer ─────────────────────────────────────────────────────────────

function OrderDrawer({
  items,
  totalPaise,
  tableNum,
  ownerPhone,
  onClear,
}: {
  items:       ReturnType<typeof useOrderCart>["items"];
  totalPaise:  number;
  tableNum:    number;
  ownerPhone:  string;
  onClear:     () => void;
}) {
  const [open, setOpen] = useState(false);

  const sendOrder = () => {
    const lines = items.map(i => `• ${i.dish.name} x${i.quantity} — ${fmt(i.dish.price * i.quantity)}`);
    const msg   = [
      `🍽️ New Order${tableNum > 0 ? ` — Table ${tableNum}` : ""}`,
      `━━━━━━━━━━━━━━━`,
      ...lines,
      `━━━━━━━━━━━━━━━`,
      `Total: ${fmt(totalPaise)}`,
      `via Craveping VideoMenu`,
    ].join("\n");

    const phone = ownerPhone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    setOpen(false);
  };

  if (items.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position:   "fixed",
        bottom:     0,
        left:       "50%",
        transform:  "translateX(-50%)",
        width:      "100%",
        maxWidth:   480,
        zIndex:     50,
        transition: "transform 0.3s",
      }}>
        {open && (
          <div style={{
            background: "#F5F0E8",
            borderTop:  "3px solid #1a1a1a",
            padding:    "20px 24px",
            maxHeight:  "60vh",
            overflowY:  "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>
                Your Order
              </span>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#1a1a1a" }}>✕</button>
            </div>
            {items.map(({ dish, quantity }) => (
              <div key={dish.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #ddd8cc" }}>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {dish.name} × {quantity}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{fmt(dish.price * quantity)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0", marginTop: 4 }}>
              <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>Total</span>
              <span style={{ fontWeight: 900, fontSize: 18 }}>{fmt(totalPaise)}</span>
            </div>
            <button
              onClick={sendOrder}
              style={{
                width:         "100%",
                marginTop:     16,
                padding:       "16px",
                background:    "#25D366",
                color:         "white",
                border:        "none",
                cursor:        "pointer",
                fontSize:      13,
                fontWeight:    900,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontFamily:    "inherit",
              }}
            >
              📲 Send Order on WhatsApp
            </button>
            <button
              onClick={onClear}
              style={{
                width: "100%", marginTop: 8, padding: "10px",
                background: "transparent", border: "1.5px solid #1a1a1a",
                cursor: "pointer", fontSize: 11, fontWeight: 700,
                letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "inherit",
                color: "#1a1a1a",
              }}
            >
              Clear Cart
            </button>
          </div>
        )}

        {/* Sticky bar */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width:         "100%",
            padding:       "16px 24px",
            background:    "#1a1a1a",
            color:         "#F5F0E8",
            border:        "none",
            cursor:        "pointer",
            display:       "flex",
            alignItems:    "center",
            justifyContent:"space-between",
            fontFamily:    "inherit",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
            🛒 {items.reduce((s, i) => s + i.quantity, 0)} items
          </span>
          <span style={{ fontSize: 14, fontWeight: 900 }}>{fmt(totalPaise)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
            View Order ↑
          </span>
        </button>
      </div>
    </>
  );
}

// ─── Main Menu UI ─────────────────────────────────────────────────────────────

function MenuUI({
  cafe,
  tableNum,
  slug,
}: {
  cafe:     CafeProfile & { id: string; owner_whatsapp_number: string };
  tableNum: number;
  slug:     string;
}) {
  const { categories, dishes, loading } = useMenuData(cafe.id);
  const cart = useOrderCart();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const cartMap = Object.fromEntries(cart.items.map(i => [i.dish.id, i.quantity]));

  const specials   = dishes.filter(d => d.is_todays_special);
  const filtered   = activeCategory === "all"
    ? dishes
    : dishes.filter(d => d.category_id === activeCategory);

  const accentColor = cafe.premium_color_hex;

  // Group by category
  const grouped = categories.map(cat => ({
    category: cat,
    dishes:   filtered.filter(d => d.category_id === cat.id),
  }));
  const uncategorized = filtered.filter(d => !d.category_id);

  if (loading) return <MenuSkeleton />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #F5F0E8; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #F5F0E8; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; }
      `}</style>

      <div style={{
        background:  "#F5F0E8",
        minHeight:   "100vh",
        maxWidth:    480,
        margin:      "0 auto",
        fontFamily:  "'Playfair Display', Georgia, serif",
        color:       "#1a1a1a",
        paddingBottom: cart.totalItems > 0 ? 80 : 24,
      }}>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <div style={{
          borderBottom: "3px solid #1a1a1a",
          padding:      "32px 24px 20px",
          position:     "relative",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              {/* Cafe emoji + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 28 }}>{cafe.logo_emoji}</span>
                <div>
                  <h1 style={{
                    margin:        0,
                    fontSize:      28,
                    fontWeight:    900,
                    fontFamily:    "'Bebas Neue', Impact, sans-serif",
                    letterSpacing: 3,
                    lineHeight:    1,
                    textTransform: "uppercase",
                    color:         "#1a1a1a",
                  }}>
                    {cafe.business_name}
                  </h1>
                  <p style={{
                    margin:        0,
                    fontSize:      9,
                    fontWeight:    700,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    color:         "#888",
                    fontFamily:    "'Playfair Display', serif",
                  }}>
                    {tableNum > 0 ? `TABLE ${tableNum} · ` : ""}MENU
                  </p>
                </div>
              </div>
            </div>

            {/* Rate Us button */}
            <a
              href={`/review?cafe=${slug}${tableNum > 0 ? `&table=${tableNum}` : ""}`}
              style={{
                display:       "flex",
                flexDirection: "column",
                alignItems:    "center",
                gap:           2,
                padding:       "8px 12px",
                border:        "2px solid #1a1a1a",
                textDecoration: "none",
                color:         "#1a1a1a",
                flexShrink:    0,
              }}
            >
              <span style={{ fontSize: 16 }}>⭐</span>
              <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "inherit" }}>
                Rate Us
              </span>
            </a>
          </div>

          {/* Accent line */}
          <div style={{ height: 4, background: accentColor, marginTop: 16, width: 60 }} />
        </div>

        {/* ── TODAY'S SPECIALS ──────────────────────────────────────── */}
        {specials.length > 0 && (
          <div style={{
            background:  "#1a1a1a",
            padding:     "16px 24px",
            marginBottom: 0,
          }}>
            <p style={{
              margin:        "0 0 12px",
              fontSize:      9,
              fontWeight:    800,
              letterSpacing: 3,
              textTransform: "uppercase",
              color:         accentColor,
              fontFamily:    "inherit",
            }}>
              ★ Today's Specials
            </p>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
              {specials.map(d => (
                <div
                  key={d.id}
                  style={{
                    flexShrink: 0, width: 120,
                    background: "rgba(255,255,255,0.07)",
                    padding:    "10px",
                    border:     `1px solid ${accentColor}33`,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#F5F0E8", textTransform: "uppercase", marginBottom: 4, fontFamily: "inherit" }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: accentColor, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
                    {fmt(d.price)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CATEGORY TABS ─────────────────────────────────────────── */}
        {categories.length > 0 && (
          <div style={{
            display:        "flex",
            gap:            0,
            overflowX:      "auto",
            borderBottom:   "1.5px solid #1a1a1a",
            scrollbarWidth: "none",
            padding:        "0 24px",
          }}>
            {[{ id: "all", name: "All" }, ...categories].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  flexShrink:    0,
                  padding:       "14px 16px",
                  background:    activeCategory === cat.id ? "#1a1a1a" : "transparent",
                  color:         activeCategory === cat.id ? "#F5F0E8" : "#1a1a1a",
                  border:        "none",
                  borderRight:   "1.5px solid #1a1a1a",
                  cursor:        "pointer",
                  fontSize:      9,
                  fontWeight:    800,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  fontFamily:    "inherit",
                  transition:    "all 0.15s",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* ── DISH LIST ──────────────────────────────────────────────── */}
        <div style={{ padding: "0 24px" }}>
          {grouped.map(({ category, dishes: catDishes }) => (
            <CategorySection
              key={category.id}
              category={category}
              dishes={catDishes}
              cart={cartMap}
              onAdd={cart.addItem}
              accentColor={accentColor}
            />
          ))}
          {uncategorized.length > 0 && (
            <CategorySection
              category={null}
              dishes={uncategorized}
              cart={cartMap}
              onAdd={cart.addItem}
              accentColor={accentColor}
            />
          )}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
              <p style={{ fontSize: 13, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
                No dishes in this category
              </p>
            </div>
          )}
        </div>

        {/* ── FOOTER ────────────────────────────────────────────────── */}
        <div style={{
          borderTop:  "3px solid #1a1a1a",
          padding:    "20px 24px",
          marginTop:  16,
          display:    "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#888" }}>
            Powered by Craveping
          </span>
          <a
            href={`/review?cafe=${slug}${tableNum > 0 ? `&table=${tableNum}` : ""}`}
            style={{
              fontSize:      9,
              fontWeight:    800,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color:         "#1a1a1a",
              textDecoration:"none",
              borderBottom:  "1.5px solid #1a1a1a",
              paddingBottom: 1,
            }}
          >
            ⭐ Rate Your Visit
          </a>
        </div>
      </div>

      {/* ── ORDER DRAWER ──────────────────────────────────────────── */}
      <OrderDrawer
        items={cart.items}
        totalPaise={cart.totalPaise}
        tableNum={tableNum}
        ownerPhone={(cafe as any).owner_whatsapp_number ?? ""}
        onClear={cart.clearCart}
      />
    </>
  );
}

// ─── Shell (tenant resolution) ────────────────────────────────────────────────

function MenuShell() {
  const params   = useSearchParams();
  const slug     = params.get("cafe") ?? "";
  const tableNum = parseInt(params.get("table") ?? "0", 10);

  const [state, setState] = useState<TenantState>({
    cafe: null, loading: true, error: null, slug, table: tableNum,
  });

  useEffect(() => {
    if (!slug) { setState(s => ({ ...s, loading: false, error: "missing_slug" })); return; }

    supabase
      .from("cafes")
      .select("id, business_name, google_place_id, premium_color_hex, logo_emoji")
      .eq("slug", slug)
      .single()
      .then(({ data, error }) => {
        console.log("[menu] cafe fetch result →", JSON.stringify({ data, error }));
        if (error || !data) setState(s => ({ ...s, loading: false, error: "not_found" }));
        else setState(s => ({ ...s, loading: false, cafe: { ...data, owner_whatsapp_number: "" } as any }));
      });
  }, [slug]);

  if (state.loading) return <MenuSkeleton />;

  if (state.error || !state.cafe) return (
    <div style={{
      minHeight: "100vh", background: "#F5F0E8",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Georgia, serif", padding: 24,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact", fontSize: 32, letterSpacing: 3, margin: "0 0 8px" }}>
          MENU NOT FOUND
        </h2>
        <p style={{ color: "#666", fontSize: 13 }}>
          This café menu doesn't exist or has been deactivated.
        </p>
      </div>
    </div>
  );

  return <MenuUI cafe={state.cafe as any} tableNum={tableNum} slug={slug} />;
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuShell />
    </Suspense>
  );
}