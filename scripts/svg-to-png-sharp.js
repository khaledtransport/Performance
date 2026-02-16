const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svgDir = path.join(__dirname, '..', 'public', 'icons', 'car_views_svg');
const outDir = path.join(__dirname, '..', 'public', 'icons', 'bus');

fs.mkdirSync(outDir, { recursive: true });

// Map SVG filenames to GPS heading degrees
const mapping = {
  'car_top_left.svg': 0,       // front
  'car_top_mid_left.svg': 315, // front-left
  'car_top_mid_right.svg': 45, // front-right
  'car_top_right.svg': 90,     // right
  'car_bottom_left.svg': 270,  // left
  'car_bottom_mid_left.svg': 225, // back-left
  'car_bottom_mid_right.svg': 135, // back-right
  'car_bottom_right.svg': 180, // back
};

async function convert() {
  for (const [svgName, deg] of Object.entries(mapping)) {
    const svgPath = path.join(svgDir, svgName);
    const pngPath = path.join(outDir, `bus-${deg}.png`);
    
    const svgBuffer = fs.readFileSync(svgPath);
    
    await sharp(svgBuffer, { density: 300 })
      .resize(120, null, { fit: 'inside' })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(pngPath);
    
    const stats = fs.statSync(pngPath);
    console.log(`  ${svgName} -> bus-${deg}.png (${stats.size.toLocaleString()} bytes)`);
  }
  console.log('\nDone! 8 high-quality PNG icons from SVG.');
}

convert().catch(console.error);
