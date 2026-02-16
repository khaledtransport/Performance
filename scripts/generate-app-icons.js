const path = require("path");
const sharp = require("sharp");

const outDir = path.join(process.cwd(), "public", "icons");
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function svgForSize(size) {
  const radius = Math.round(size * 0.16);
  const busW = Math.round(size * 0.56);
  const busH = Math.round(size * 0.24);
  const busX = Math.round((size - busW) / 2);
  const busY = Math.round(size * 0.39);
  const wheelR = Math.max(2, Math.round(size * 0.045));

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>

  <rect x="${busX}" y="${busY}" width="${busW}" height="${busH}" rx="${Math.round(size * 0.06)}" fill="#ffffff"/>
  <rect x="${Math.round(busX + busW * 0.12)}" y="${Math.round(busY + busH * 0.18)}" width="${Math.round(busW * 0.72)}" height="${Math.round(busH * 0.36)}" rx="${Math.round(size * 0.02)}" fill="#bfdbfe"/>

  <circle cx="${Math.round(busX + busW * 0.22)}" cy="${Math.round(busY + busH + wheelR)}" r="${wheelR}" fill="#0f172a"/>
  <circle cx="${Math.round(busX + busW * 0.78)}" cy="${Math.round(busY + busH + wheelR)}" r="${wheelR}" fill="#0f172a"/>

  <text x="50%" y="74%" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(size * 0.10)}" fill="#e2e8f0">Transport</text>
</svg>`;
}

async function main() {
  for (const size of sizes) {
    const target = path.join(outDir, `icon-${size}x${size}.png`);
    await sharp(Buffer.from(svgForSize(size))).png({ quality: 100 }).toFile(target);
    console.log(`generated ${target}`);
  }

  const faviconTarget = path.join(process.cwd(), "public", "favicon.ico");
  await sharp(Buffer.from(svgForSize(64))).png({ quality: 100 }).toFile(faviconTarget);
  console.log(`updated ${faviconTarget}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
