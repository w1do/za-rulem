import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const images = [
  'hero-bg-image-gold.jpg',
  'page-header-bg.jpg',
  'cta-bg-image.jpg',
  'hero-bg-image-silver.jpg',
  'cta-box-bg-image-silver.jpg'
];

const srcDir = 'src/assets/images';

async function convert() {
  for (const img of images) {
    const srcPath = path.join(srcDir, img);
    const destPath = srcPath.replace(/\.jpg$/, '.webp');
    
    if (fs.existsSync(srcPath)) {
      console.log(`Converting ${img} to webp...`);
      await sharp(srcPath)
        .webp({ quality: 80 })
        .toFile(destPath);
      console.log(`Saved to ${destPath}`);
    } else {
      console.warn(`File not found: ${srcPath}`);
    }
  }
}

convert().catch(console.error);
