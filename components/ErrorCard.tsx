"use client";

import React from "react";
import { TenantError } from "@/lib/supabase";

const ERROR_COPY: Record<TenantError, { emoji: string; title: string; body: string }> = {
  missing_slug: {
    emoji: "🔗",
    title: "Invalid Link",
    body:  "This QR code is missing a café identifier. Please ask staff for a fresh code.",
  },
  invalid_table: {
    emoji: "🪑",
    title: "Invalid Table",
    body:  "The table number in this link doesn't look right. Please scan the QR code on your table again.",
  },
  cafe_not_found: {
    emoji: "🚫",
    title: "Café Not Found",
    body:  "We couldn't find this café in our system. It may have moved or the link may be outdated.",
  },
  fetch_error: {
    emoji: "📡",
    title: "Connection Issue",
    body:  "We had trouble reaching our servers. Please check your connection and try again.",
  },
};

interface ErrorCardProps {
  error:   TenantError;
  onRetry?: () => void;
}

export function ErrorCard({ error, onRetry }: ErrorCardProps) {
  const { emoji, title, body } = ERROR_COPY[error];

  return (
    <div style={{
      background:    "white",
      borderRadius:  28,
      width:         "100%",
      maxWidth:      360,
      margin:        "0 auto",
      overflow:      "hidden",
      boxShadow:     "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
      fontFamily:    "'Nunito', sans-serif",
      textAlign:     "center",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(160deg, #ECEFF1, #CFD8DC)",
        padding:    "32px 24px 0",
      }}>
        <div style={{ fontSize: 48, lineHeight: 1 }}>{emoji}</div>
      </div>

      {/* Wave divider */}
      <svg viewBox="0 0 400 60" xmlns="http://www.w3.org/2000/svg"
           style={{ display: "block", width: "100%", marginBottom: -2 }}>
        <rect width="400" height="60" fill="#CFD8DC" />
        <path d="M0,30 C80,60 200,0 400,30 L400,60 L0,60 Z" fill="white" />
      </svg>

      {/* Content */}
      <div style={{ padding: "4px 28px 32px" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 900, color: "#1a1a1a" }}>
          {title}
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888", lineHeight: 1.7 }}>
          {body}
        </p>

        {/* Only show retry for transient errors */}
        {(error === "fetch_error") && onRetry && (
          <button
            onClick={onRetry}
            style={{
              border:        "none",
              borderRadius:  50,
              cursor:        "pointer",
              fontFamily:    "inherit",
              fontWeight:    700,
              fontSize:      15,
              padding:       "13px 28px",
              width:         "100%",
              background:    "linear-gradient(135deg, #2196F3, #1565C0)",
              color:         "white",
              boxShadow:     "0 6px 20px rgba(33,150,243,0.4)",
            }}
          >
            Try Again
          </button>
        )}

        <p style={{ margin: "16px 0 0", fontSize: 11, color: "#ccc", fontWeight: 600, letterSpacing: 0.5 }}>
          powered by Craveping
        </p>
      </div>
    </div>
  );
}