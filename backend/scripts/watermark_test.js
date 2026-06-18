const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Basic watermark robustness test using tiny image manipulations.
// Usage: node watermark_test.js <watermarkedImage> <originalImage>
// NOTE: This script requires 'sharp' package (npm install sharp)

(async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node watermark_test.js <watermarkedImage> <originalImage>');
    process.exit(1);
  }
  const [wm, orig] = args;
  if (!fs.existsSync(wm) || !fs.existsSync(orig)) { console.error('Files not found'); process.exit(2); }

  // Load images
  const a = await sharp(wm).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const b = await sharp(orig).raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  // Simple PSNR calculation
  function psnr(buf1, buf2) {
    if (buf1.data.length !== buf2.data.length) return 0;
    let mse = 0;
    for (let i = 0; i < buf1.data.length; i++) {
      const d = buf1.data[i] - buf2.data[i];
      mse += d * d;
    }
    mse /= buf1.data.length;
    if (mse === 0) return Infinity;
    const MAX = 255;
    return 10 * Math.log10((MAX * MAX) / mse);
  }

  const score = psnr(a, b);
  console.log('PSNR between watermarked and original:', score.toFixed(2));

  // Generate a few attacks (resize, recompress)
  const tmp = path.join(__dirname, '..', 'uploads', 'wm-attack-' + Date.now() + '.jpg');
  await sharp(wm).resize({ width: Math.max(1, Math.floor(a.info.width * 0.9)) }).jpeg({ quality: 60 }).toFile(tmp);
  const attacked = await sharp(tmp).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const score2 = psnr(attacked, b);
  console.log('PSNR after resize+recompress attack:', score2.toFixed(2));

  console.log('Attack file created at', tmp);
})();
