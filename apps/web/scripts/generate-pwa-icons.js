/**
 * Generate PWA Icons - Simple Placeholder Generator
 * Creates colored square icons with "FROK" text
 */

const fs = require('fs');
const path = require('path');

// Icon sizes required
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Simple SVG template
function generateSVG(size) {
  const fontSize = Math.floor(size / 4);
  const textY = size / 2 + fontSize / 3;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#3b82f6"/>

  <!-- Rounded corners for modern look -->
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#3b82f6"/>

  <!-- Gradient overlay for depth -->
  <defs>
    <linearGradient id="gradient-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:0.3" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#gradient-${size})"/>

  <!-- Text -->
  <text
    x="50%"
    y="${textY}"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
  >FROK</text>

  <!-- Subtle border for definition -->
  <rect
    width="${size - 2}"
    height="${size - 2}"
    x="1"
    y="1"
    rx="${size * 0.15}"
    fill="none"
    stroke="rgba(255,255,255,0.2)"
    stroke-width="2"
  />
</svg>`;
}

// Output directory
const publicDir = path.join(__dirname, '..', 'public');

console.log('🎨 Generating PWA icons...\n');

sizes.forEach(size => {
  const svg = generateSVG(size);
  const filename = `icon-${size}.svg`;
  const filepath = path.join(publicDir, filename);

  fs.writeFileSync(filepath, svg, 'utf8');
  console.log(`✅ Created ${filename} (${size}x${size})`);
});

console.log('\n✨ PWA icons generated successfully!');
console.log('\n📝 Note: These are SVG placeholders. For production, consider:');
console.log('   - Using PNG format with proper transparency');
console.log('   - Creating a custom logo/brand icon');
console.log('   - Using tools like https://www.pwabuilder.com/imageGenerator');
