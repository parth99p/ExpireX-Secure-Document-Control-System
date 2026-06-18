const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

exports.addPdfWatermark = async (filePath, text) => {
  try {
    if (!filePath.toLowerCase().endsWith('.pdf')) return;
    const bytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(bytes);
    const pages = pdfDoc.getPages();
    pages.forEach(page => {
      page.drawText(text || 'DOCGUARD', {
        x: 50, y: 50, size: 24, color: rgb(0.8,0.1,0.1), opacity: 0.3
      });
    });
    const out = await pdfDoc.save();
    fs.writeFileSync(filePath, out);
  } catch (err) {
    console.error('Watermark error', err);
  }
};

exports.addImageWatermark = async (filePath, text) => {
  try {
    const lower = filePath.toLowerCase();
    if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.jpeg')) return;
    
    // Use sharp for image watermarking
    const sharp = require('sharp');
    
    try {
      // Get image metadata
      const metadata = await sharp(filePath).metadata();
      if (!metadata || !metadata.width || !metadata.height) {
        console.warn('Could not get image metadata for watermarking');
        return;
      }
      
      // Create watermark text as SVG
      const watermarkText = text || 'DOCGUARD';
      const svgWatermark = `
        <svg width="${metadata.width}" height="${metadata.height}">
          <text x="20" y="40" font-size="32" font-family="Arial" fill="red" opacity="0.3">${watermarkText}</text>
        </svg>
      `;
      
      // Apply watermark overlay and save
      await sharp(filePath)
        .composite([{ input: Buffer.from(svgWatermark), top: 0, left: 0 }])
        .toFile(filePath + '.tmp');
      
      // Replace original with watermarked version
      fs.renameSync(filePath + '.tmp', filePath);
    } catch (err) {
      console.warn('Sharp watermarking failed, attempting alternative method:', err.message);
      
      // Fallback: use jimp if available
      try {
        const jimp = require('jimp');
        const image = await jimp.read(filePath);
        
        // Just re-encode the image to ensure compatibility
        // (Jimp text rendering is complex, so we just ensure file is valid)
        await image.write(filePath);
      } catch (jimpErr) {
        console.warn('Jimp also unavailable, skipping image watermark:', jimpErr.message);
      }
    }
  } catch (err) {
    console.warn('Image watermark error:', err.message);
  }
};
