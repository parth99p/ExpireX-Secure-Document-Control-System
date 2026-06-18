const fs = require('fs');
const path = require('path');
const { createHmacSignature } = require('../utils/sign');

// Usage: node signature_test.js <originalFile> <passkey> <tamperedFile1> [tamperedFile2 ...]
(async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node signature_test.js <originalFile> <passkey> <tamperedFile1> [tamperedFile2 ...]');
    process.exit(1);
  }
  const [originalFile, passkey, ...tampered] = args;
  if (!fs.existsSync(originalFile)) { console.error('Original file not found:', originalFile); process.exit(2); }
  const origBuf = fs.readFileSync(originalFile);
  const origSig = createHmacSignature(origBuf, passkey);
  console.log('Original signature:', origSig);

  const results = [];
  // True Positive: original matches
  results.push({ file: path.basename(originalFile), tampered: false, match: createHmacSignature(origBuf, passkey) === origSig });

  for (const t of tampered) {
    if (!fs.existsSync(t)) { console.warn('Tampered file not found:', t); continue; }
    const buf = fs.readFileSync(t);
    const sig = createHmacSignature(buf, passkey);
    const match = sig === origSig;
    results.push({ file: path.basename(t), tampered: true, match });
  }

  // Print summary and confusion-like metrics
  const tp = results.filter(r => !r.tampered && r.match).length;
  const tn = results.filter(r => r.tampered && !r.match).length;
  const fp = results.filter(r => r.tampered && r.match).length;
  const fn = results.filter(r => !r.tampered && !r.match).length;

  console.log('\nResults:');
  results.forEach(r => console.log(`${r.file} - tampered:${r.tampered} - match:${r.match}`));
  console.log('\nSummary:');
  console.log('TP (orig match):', tp);
  console.log('TN (tampered detected):', tn);
  console.log('FP (tampered but matched):', fp);
  console.log('FN (orig did not match):', fn);
})();
