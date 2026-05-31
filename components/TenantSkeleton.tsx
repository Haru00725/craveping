"use client";

import React from "react";

/**
 * Full-card shimmer skeleton displayed while useTenantProfile resolves.
 * Matches the Card dimensions and wave header shape from the MVP.
 */
export function TenantSkeleton() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .shimmer {
          background: linear-gradient(
            90deg,
            #f0f0f0 25%,
            #e4e4e4 50%,
            #f0f0f0 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 10px;
        }
      `}</style>

      <div style={{
        background:    "white",
        borderRadius:  28,
        width:         "100%",
        maxWidth:      360,
        margin:        "0 auto",
        overflow:      "hidden",
        boxShadow:     "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
        fontFamily:    "'Nunito', sans-serif",
      }}>
        {/* Header placeholder */}
        <div style={{
          height:     120,
          background: "linear-gradient(160deg, #f5f5f5, #ebebeb)",
        }} />

        {/* Avatar circle placeholder */}
        <div style={{
          display:       "flex",
          justifyContent:"center",
          marginTop:     -36,
          marginBottom:  8,
        }}>
          <div className="shimmer" style={{
            width:        72,
            height:       72,
            borderRadius: "50%",
            border:       "4px solid white",
          }} />
        </div>

        {/* Content placeholders */}
        <div style={{ padding: "4px 28px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="shimmer" style={{ height: 14, width: "55%", margin: "0 auto" }} />
          <div className="shimmer" style={{ height: 22, width: "75%", margin: "0 auto" }} />

          <div style={{ height: 16 }} />

          {[1, 2, 3].map(i => (
            <div key={i} className="shimmer" style={{ height: 62, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    </>
  );
}