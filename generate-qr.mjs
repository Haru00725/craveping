/**
 * Craveping — QR Code Generator
 *
 * Generates ONE clean, colorful QR per café — no text, transparent background.
 * Import into Canva and add your own text/design around it.
 *
 * Usage:
 *   node generate-qr.mjs --cafe=the-brew-house
 *   node generate-qr.mjs --cafe=the-brew-house --domain=https://craveping.com
 *   node generate-qr.mjs --cafe=the-brew-house --color=#FF6B35
 *
 * Output: ./qr-output/the-brew-house.png
 * Resolution: 1200×1200px, transparent background — paste directly into Canva
 */

import QRCode from "qrcode";
import sharp  from "sharp";
import fs     from "fs/promises";
import path   from "path";

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => a.replace(/^--/, "").split("="))
);

const cafeSlug = args.cafe;
const domain   = (args.domain ?? "http://localhost:3000").replace(/\/$/, "");
const color    = args.color ?? "#FF6B35";   // default: warm orange — change freely
const outputDir = path.join(".", "qr-output");

if (!cafeSlug) {
  console.error("❌  Missing --cafe argument.\n   Usage: node generate-qr.mjs --cafe=my-cafe");
  process.exit(1);
}

// ── Colour presets you can use with --color= ──────────────────────────────────
// #FF6B35  Warm Orange      (energetic, food & beverage)
// #FFC93C  Golden Yellow    (matches Craveping default)
// #E91E8C  Deep Pink        (trendy, café-chic)
// #00B4D8  Sky Blue         (clean, modern)
// #2D6A4F  Forest Green     (natural, earthy café)
// #6A0572  Deep Purple      (premium, luxury feel)
// Or pass any hex: --color=#YourBrandColor

// ── Main ──────────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

async function generateQR() {
  await fs.mkdir(outputDir, { recursive: true });

  // URL encodes just the cafe — no table number needed for a single shared QR
  const url      = `${domain}/review?cafe=${cafeSlug}`;
  const filename = path.join(outputDir, `${cafeSlug}.png`);
  const size     = 1200;

  console.log(`\n🎨  Generating QR for "${cafeSlug}"`);
  console.log(`    URL:   ${url}`);
  console.log(`    Color: ${color}`);
  console.log(`    Size:  ${size}×${size}px\n`);

  // 1. Generate QR as SVG string so we can recolour it precisely
  const svgString = await QRCode.toString(url, {
    type:                 "svg",
    errorCorrectionLevel: "H",     // Highest — survives Canva overlays/logos
    margin:               1,
    color: {
      dark:  color,       // QR modules = your brand colour
      light: "#00000000", // Background = fully transparent
    },
  });

  // 2. Convert SVG → PNG via sharp (preserves transparency)
  const pngBuffer = await sharp(Buffer.from(svgString))
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 6 })
    .toBuffer();

  // 3. Save
  await fs.writeFile(filename, pngBuffer);

  console.log(`✅  Saved: ${path.resolve(filename)}`);
  console.log(`\n💡  Canva tip:`);
  console.log(`    1. Upload this PNG to Canva`);
  console.log(`    2. Place it on any background colour`);
  console.log(`    3. Add your café name, table number, and "Scan to review us" text`);
  console.log(`    4. The QR background is transparent so it blends with anything\n`);
}

generateQR().catch(err => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});