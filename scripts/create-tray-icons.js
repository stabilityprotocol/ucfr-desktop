const sharp = require('sharp');
const path = require('path');

// Create a simple circular tray icon template
// Pure black circle on transparent background

const size = 16;
const retinaSize = 32;

// Create SVG for the "M" icon
const createMSvg = (size) => {
  const padding = Math.round(size * 0.2);
  const strokeWidth = Math.max(2, Math.round(size * 0.18));
  
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <path d="M ${padding} ${size - padding} L ${padding} ${padding} L ${size / 2} ${size * 0.55} L ${size - padding} ${padding} L ${size - padding} ${size - padding}" 
            stroke="black" 
            stroke-width="${strokeWidth}" 
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"/>
    </svg>
  `;
};

// Create the icons
async function createTrayIcons() {
  const iconsDir = path.join(__dirname, '../src/assets/icons');
  
  // 16x16 for standard resolution
  const svg16 = createMSvg(16);
  await sharp(Buffer.from(svg16))
    .png()
    .toFile(path.join(iconsDir, 'trayTemplate.png'));
  console.log('Created trayTemplate.png (16x16)');

  // 32x32 for Retina displays (@2x)
  const svg32 = createMSvg(32);
  await sharp(Buffer.from(svg32))
    .png()
    .toFile(path.join(iconsDir, 'trayTemplate@2x.png'));
  console.log('Created trayTemplate@2x.png (32x32)');
}

createTrayIcons().catch(console.error);
