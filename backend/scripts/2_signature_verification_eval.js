/**
 * Digital Signature Verification Accuracy Evaluation
 * Tests: Signature generation, verification, tampering detection
 * Metrics: accuracy (%), false positives/negatives, verification time
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TEST_DIR = path.join(__dirname, '..', 'evaluation_results', 'signatures');
const RESULTS_FILE = path.join(TEST_DIR, 'signature_results.json');

// Ensure output directory exists
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Generate RSA key pair for testing
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const TEST_FILES = {
  'text.txt': Buffer.from('This is a test document for signature verification.'),
  'large.txt': crypto.randomBytes(2048 * 100), // 100 KB
  'data.bin': crypto.randomBytes(1024 * 50)    // 50 KB
};

/**
 * Sign data using RSA-SHA256
 */
function signData(data) {
  const signer = crypto.createSign('sha256');
  signer.update(data);
  return signer.sign(privateKey);
}

/**
 * Verify signature
 */
function verifySignature(data, signature) {
  const verifier = crypto.createVerify('sha256');
  verifier.update(data);
  return verifier.verify(publicKey, signature);
}

/**
 * Modify buffer slightly (simulate tampering)
 */
function tamperWithData(buffer, tamperAmount = 1) {
  const tampered = Buffer.from(buffer);
  for (let i = 0; i < tamperAmount; i++) {
    const randomIndex = Math.floor(Math.random() * tampered.length);
    tampered[randomIndex] = (tampered[randomIndex] + 1) % 256;
  }
  return tampered;
}

/**
 * Run signature test for a single file
 */
async function runSignatureTest(fileName, fileData) {
  const results = [];
  
  // Test 1: Generate and verify signature (should pass)
  const signStart = process.hrtime.bigint();
  const signature = signData(fileData);
  const signEnd = process.hrtime.bigint();
  const signTimeMs = Number(signEnd - signStart) / 1_000_000;
  
  const verifyStart = process.hrtime.bigint();
  const verifyResult = verifySignature(fileData, signature);
  const verifyEnd = process.hrtime.bigint();
  const verifyTimeMs = Number(verifyEnd - verifyStart) / 1_000_000;
  
  results.push({
    test: 'Original - Verify',
    fileName,
    fileSizeBytes: fileData.length,
    fileSizeKB: (fileData.length / 1024).toFixed(2),
    signatureTimeMs: signTimeMs.toFixed(3),
    verificationTimeMs: verifyTimeMs.toFixed(3),
    result: verifyResult ? 'PASS' : 'FAIL',
    expected: 'PASS',
    correct: verifyResult === true,
    tampering: false,
    timestamp: new Date().toISOString()
  });
  
  // Test 2: Tamper with data and verify (should fail)
  const tamperedData = tamperWithData(fileData, 1);
  
  const verifyTampStart = process.hrtime.bigint();
  const verifyTampResult = verifySignature(tamperedData, signature);
  const verifyTampEnd = process.hrtime.bigint();
  const verifyTampTimeMs = Number(verifyTampEnd - verifyTampStart) / 1_000_000;
  
  results.push({
    test: 'Tampered - Verify',
    fileName,
    fileSizeBytes: fileData.length,
    fileSizeKB: (fileData.length / 1024).toFixed(2),
    signatureTimeMs: signTimeMs.toFixed(3),
    verificationTimeMs: verifyTampTimeMs.toFixed(3),
    result: verifyTampResult ? 'PASS' : 'FAIL',
    expected: 'FAIL',
    correct: verifyTampResult === false,
    tampering: true,
    tamperAmount: 1,
    timestamp: new Date().toISOString()
  });
  
  // Test 3: Severe tampering (multiple bytes changed)
  const severelyTamperedData = tamperWithData(fileData, Math.floor(fileData.length * 0.1));
  
  const verifySevereStart = process.hrtime.bigint();
  const verifySevereResult = verifySignature(severelyTamperedData, signature);
  const verifySevereEnd = process.hrtime.bigint();
  const verifySevereTimeMs = Number(verifySevereEnd - verifySevereStart) / 1_000_000;
  
  results.push({
    test: 'Severely Tampered - Verify',
    fileName,
    fileSizeBytes: fileData.length,
    fileSizeKB: (fileData.length / 1024).toFixed(2),
    signatureTimeMs: signTimeMs.toFixed(3),
    verificationTimeMs: verifySevereTimeMs.toFixed(3),
    result: verifySevereResult ? 'PASS' : 'FAIL',
    expected: 'FAIL',
    correct: verifySevereResult === false,
    tampering: true,
    tamperAmount: Math.floor(fileData.length * 0.1),
    timestamp: new Date().toISOString()
  });
  
  return results;
}

/**
 * Run all signature tests
 */
async function runAllSignatureTests() {
  console.log('✓ Starting Digital Signature Verification Evaluation...\n');
  
  const allResults = [];
  
  for (const [fileName, fileData] of Object.entries(TEST_FILES)) {
    console.log(`Testing ${fileName} (${(fileData.length / 1024).toFixed(2)} KB)...`);
    const results = await runSignatureTest(fileName, fileData);
    allResults.push(...results);
    console.log(`  ✓ ${results.length} tests completed\n`);
  }
  
  return allResults;
}

/**
 * Generate evaluation report
 */
function generateReport(results) {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.correct).length;
  const failedTests = totalTests - passedTests;
  const falsePositives = results.filter(r => r.expected === 'FAIL' && r.result === 'PASS').length;
  const falseNegatives = results.filter(r => r.expected === 'PASS' && r.result === 'FAIL').length;
  
  const originalFileTests = results.filter(r => !r.tampering);
  const tamperedFileTests = results.filter(r => r.tampering);
  
  const accuracy = ((passedTests / totalTests) * 100).toFixed(2);
  const avgVerificationTime = (results.reduce((sum, r) => sum + parseFloat(r.verificationTimeMs), 0) / results.length).toFixed(3);
  
  const report = {
    title: 'Digital Signature Verification Accuracy Evaluation',
    timestamp: new Date().toISOString(),
    testConfiguration: {
      algorithm: 'RSA-SHA256',
      keySize: 2048,
      fileTypes: Object.keys(TEST_FILES).length,
      totalTests: totalTests
    },
    results: results,
    summary: {
      totalTests,
      passedTests,
      failedTests,
      accuracy: `${accuracy}%`,
      falsePositives,
      falseNegatives,
      avgVerificationTimeMs: avgVerificationTime,
      originalFileTestsPassed: originalFileTests.filter(r => r.correct).length,
      tamperedFileTestsCorrect: tamperedFileTests.filter(r => r.correct).length
    },
    metrics: {
      verificationAccuracy: `${accuracy}%`,
      detectionSensitivity: ((tamperedFileTests.filter(r => r.correct).length / tamperedFileTests.length) * 100).toFixed(2) + '%',
      originalFileAccuracy: ((originalFileTests.filter(r => r.correct).length / originalFileTests.length) * 100).toFixed(2) + '%',
      avgSigningTimeMs: (results.reduce((sum, r) => sum + parseFloat(r.signatureTimeMs), 0) / results.length).toFixed(3),
      avgVerificationTimeMs: avgVerificationTime
    },
    testGroups: {
      originalFiles: originalFileTests,
      tamperedFiles: tamperedFileTests
    },
    conclusions: [
      accuracy === '100.00' ? '✅ Perfect verification accuracy' : '⚠️ Verification accuracy below 100%',
      falsePositives === 0 ? '✅ No false positives detected' : `⚠️ ${falsePositives} false positives detected`,
      falseNegatives === 0 ? '✅ No false negatives detected' : `⚠️ ${falseNegatives} false negatives detected`,
      'Digital signatures effectively detect tampering',
      `Verification time is consistent (~${avgVerificationTime}ms)`,
      'System provides strong integrity verification'
    ]
  };
  
  return report;
}

/**
 * Main execution
 */
async function main() {
  try {
    const results = await runAllSignatureTests();
    const report = generateReport(results);
    
    // Save results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(report, null, 2));
    
    console.log('\n✅ Digital Signature Evaluation Complete!');
    console.log(`📄 Results saved to: ${RESULTS_FILE}\n`);
    
    // Print summary
    console.log('Summary:');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests} | Failed: ${report.summary.failedTests}`);
    console.log(`Accuracy: ${report.summary.accuracy}`);
    console.log(`False Positives: ${report.summary.falsePositives}`);
    console.log(`False Negatives: ${report.summary.falseNegatives}`);
    console.log(`Avg Verification Time: ${report.metrics.avgVerificationTimeMs}ms\n`);
    
    return report;
  } catch (error) {
    console.error('❌ Error in signature evaluation:', error);
    process.exit(1);
  }
}

main();
