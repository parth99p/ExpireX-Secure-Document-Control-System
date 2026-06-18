const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const storageService = require('../services/storageService');
const { initializeAzure } = require('../config/azure');
const { execFile } = require('child_process');
const path = require('path');

// Apply authentication middleware to all admin routes
router.use(authenticateToken);

// Check if user is admin
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get current storage mode
router.get('/storage-mode', adminMiddleware, async (req, res) => {
  try {
    const mode = await storageService.getStorageMode();
    res.json({ mode });
  } catch (error) {
    console.error('Get storage mode error:', error);
    res.status(500).json({ error: 'Failed to get storage mode' });
  }
});

// Set storage mode
router.post('/storage-mode', adminMiddleware, async (req, res) => {
  try {
    const { mode } = req.body;
    
    if (!mode || (mode !== 'local' && mode !== 'azure')) {
      return res.status(400).json({ error: 'Invalid storage mode. Must be "local" or "azure"' });
    }

    // If switching to Azure, check if it's available
    if (mode === 'azure') {
      const azureAvailable = await initializeAzure();
      if (!azureAvailable) {
        return res.status(400).json({ 
          error: 'Azure storage is not available. Please check your Azure configuration.' 
        });
      }
    }

    await storageService.setStorageMode(mode);
    res.json({ 
      message: `Storage mode changed to ${mode}`,
      mode 
    });
  } catch (error) {
    console.error('Set storage mode error:', error);
    res.status(500).json({ error: error.message || 'Failed to set storage mode' });
  }
});

// Get storage statistics
router.get('/storage-stats', adminMiddleware, async (req, res) => {
  try {
    const mode = await storageService.getStorageMode();
    
    // Get file count from database
    const db = require('../config/db');
    const [rows] = await db.query('SELECT COUNT(*) as count FROM files');
    const fileCount = rows[0].count;

    // Get storage info based on mode
    let storageInfo = {
      mode,
      fileCount,
      available: true
    };

    if (mode === 'azure') {
      const { isAzureAvailable } = require('../config/azure');
      storageInfo.available = isAzureAvailable();
    }

    res.json(storageInfo);
  } catch (error) {
    console.error('Get storage stats error:', error);
    res.status(500).json({ error: 'Failed to get storage statistics' });
  }
});

// Get evaluation metrics (performance/test results)
router.get('/evaluations', adminMiddleware, async (req, res) => {
  try {
    const db = require('../config/db');
    const [rows] = await db.query('SELECT * FROM evaluation_results ORDER BY created_at DESC LIMIT 1000');
    res.json({ results: rows });
  } catch (error) {
    console.error('Get evaluations error:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation results' });
  }
});

// Aggregated evaluation summary for visualizations
router.get('/evaluations/stats/summary', adminMiddleware, async (req, res) => {
  try {
    const db = require('../config/db');

    // Aggregated metrics from evaluation_results (last 7 days)
    const [metrics] = await db.query(`
      SELECT metric_key,
             COUNT(*) as count,
             ROUND(AVG(metric_value), 2) as avg_value,
             ROUND(MIN(metric_value), 2) as min_value,
             ROUND(MAX(metric_value), 2) as max_value
      FROM evaluation_results
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY metric_key
      ORDER BY count DESC
      LIMIT 200
    `);

    // Log-based suspicious activity counts (last 7 days)
    const [logStats] = await db.query(`
      SELECT 
        COUNT(*) as total_logs,
        SUM(CASE WHEN LOWER(action) LIKE '%failed%' OR LOWER(action) LIKE '%unauthorized%' OR LOWER(action) LIKE '%denied%' THEN 1 ELSE 0 END) as suspicious_count
      FROM logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // Geofencing failures from user_location_access
    const [geo] = await db.query(`
      SELECT COUNT(*) as geofence_failures
      FROM user_location_access
      WHERE allowed = 0 AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // Watermark robustness metric (if tests exist)
    const [wm] = await db.query(`
      SELECT ROUND(AVG(metric_value),2) as avg_watermark_score
      FROM evaluation_results
      WHERE metric_key LIKE '%watermark%' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // Signature verification metric (if present)
    const [sig] = await db.query(`
      SELECT ROUND(AVG(metric_value),2) as avg_signature_ms
      FROM evaluation_results
      WHERE metric_key LIKE '%signature%' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({
      metrics,
      logStats: logStats[0] || { total_logs: 0, suspicious_count: 0 },
      geofenceFailures: geo[0]?.geofence_failures || 0,
      watermark: wm[0] || { avg_watermark_score: null },
      signature: sig[0] || { avg_signature_ms: null }
    });
  } catch (error) {
    console.error('Get evaluation summary error:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation summary' });
  }
});

// Time-series data for a particular metric (last N days)
router.get('/evaluations/stats/timeseries/:metric', adminMiddleware, async (req, res) => {
  try {
    const { metric } = req.params;
    const days = parseInt(req.query.days || '7');
    const db = require('../config/db');

    const [rows] = await db.query(`
      SELECT DATE(created_at) as date, ROUND(AVG(metric_value),2) as avg_value, COUNT(*) as count
      FROM evaluation_results
      WHERE metric_key = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [metric, days]);

    res.json({ timeseries: rows });
  } catch (error) {
    console.error('Get timeseries error:', error);
    res.status(500).json({ error: 'Failed to fetch timeseries data' });
  }
});

// Anomaly stats and log summary for visualization
router.get('/evaluations/stats/anomaly', adminMiddleware, async (req, res) => {
  try {
    const db = require('../config/db');

    // Get recent anomaly-related evaluation metrics
    const [metrics] = await db.query(`
      SELECT metric_key, metric_value, meta, created_at
      FROM evaluation_results
      WHERE metric_key LIKE '%anomaly%' OR metric_key LIKE '%detection%'
      ORDER BY created_at DESC
      LIMIT 200
    `);

    // Log statistics grouped by date (last 7 days)
    const [logStats] = await db.query(`
      SELECT 
        DATE(timestamp) as log_date,
        COUNT(*) as total_logs,
        SUM(CASE WHEN LOWER(action) LIKE '%failed%' OR LOWER(action) LIKE '%unauthorized%' OR LOWER(action) LIKE '%denied%' THEN 1 ELSE 0 END) as suspicious_count
      FROM logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(timestamp)
      ORDER BY log_date ASC
    `);

    res.json({ metrics, logStats });
  } catch (error) {
    console.error('Get anomaly stats error:', error);
    res.status(500).json({ error: 'Failed to fetch anomaly stats' });
  }
});

// Accept client-side upload metrics and record them
router.post('/evaluations/client', adminMiddleware, async (req, res) => {
  try {
    const { file_id, client_ms, meta } = req.body || {};
    if (!client_ms) return res.status(400).json({ error: 'client_ms required' });
    const db = require('../config/db');
    await db.query('INSERT INTO evaluation_results (file_id, metric_key, metric_value, meta) VALUES (?, ?, ?, ?)', [
      file_id || null, 'client_upload_ms', Number(client_ms), JSON.stringify(meta || {})
    ]);
    res.json({ message: 'client metric recorded' });
  } catch (error) {
    console.error('Record client metric error:', error);
    res.status(500).json({ error: 'Failed to record client metric' });
  }
});

// Run evaluation script on server (allowed list only)
router.post('/evaluations/run/:script', adminMiddleware, async (req, res) => {
  try {
    const allowed = {
      encryption: '1_encryption_performance_eval.js',
      signature: '2_signature_verification_eval.js',
      watermark: '3_watermark_robustness_eval.js',
      access_control: '4_access_control_eval.js',
      anomaly: '5_anomaly_detection_eval.js',
      report: '6_generate_comprehensive_report.js'
    };
    const scriptKey = req.params.script;
    if (!allowed[scriptKey]) return res.status(400).json({ error: 'Invalid script name' });

    const scriptPath = path.join(__dirname, '..', 'scripts', allowed[scriptKey]);

    // Execute node script (non-blocking) and stream output
    const child = execFile(process.execPath, [scriptPath], { cwd: path.join(__dirname, '..') }, (err, stdout, stderr) => {
      if (err) {
        console.error('Evaluation script error:', err, stderr);
        return; // we don't send response here because we'll send initial ack below
      }
      console.log(`Evaluation script ${scriptKey} finished`);
    });

    // Immediate response acknowledging start
    res.json({ message: 'Script started', script: scriptKey });
  } catch (error) {
    console.error('Run evaluation error:', error);
    res.status(500).json({ error: 'Failed to start evaluation' });
  }
});

// Migrate all files to new storage (for switching storage modes)
router.post('/migrate-storage', adminMiddleware, async (req, res) => {
  try {
    const { targetMode } = req.body;
    
    if (!targetMode || (targetMode !== 'local' && targetMode !== 'azure')) {
      return res.status(400).json({ error: 'Invalid target storage mode' });
    }

    const currentMode = await storageService.getStorageMode();
    
    if (currentMode === targetMode) {
      return res.status(400).json({ error: 'Already using the specified storage mode' });
    }

    // Get all files from database
    const db = require('../config/db');
    const [files] = await db.query('SELECT filename FROM files');
    
    const results = {
      total: files.length,
      migrated: 0,
      failed: 0,
      errors: []
    };

    // Migrate each file
    for (const file of files) {
      try {
        if (targetMode === 'azure') {
          await storageService.migrateFileToAzure(file.filename);
        } else {
          await storageService.migrateFileToLocal(file.filename);
        }
        results.migrated++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          filename: file.filename,
          error: error.message
        });
      }
    }

    // Update storage mode after successful migration
    if (results.failed === 0) {
      await storageService.setStorageMode(targetMode);
    }

    res.json({
      message: `Migration completed. ${results.migrated} files migrated, ${results.failed} failed.`,
      results
    });
  } catch (error) {
    console.error('Storage migration error:', error);
    res.status(500).json({ error: 'Storage migration failed' });
  }
});

// Get evaluation performance data for visualizations
router.get('/evaluations/performance', adminMiddleware, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const resultsDir = path.join(__dirname, '..', 'evaluation_results');

    // Check if evaluation results exist
    if (!fs.existsSync(resultsDir)) {
      return res.json({ 
        hasResults: false,
        message: 'No evaluation results available yet'
      });
    }

    // Read encryption results for performance graph
    const encryptionFile = path.join(resultsDir, 'encryption', 'encryption_results.json');
    let encryptionData = null;
    let encryptionGraphData = null;

    if (fs.existsSync(encryptionFile)) {
      const rawData = JSON.parse(fs.readFileSync(encryptionFile, 'utf-8'));
      encryptionData = rawData;
      
      // Transform for chart.js line chart (file size vs encryption time)
      const fileSizeLabels = [];
      const encryptionTimes = [];
      const decryptionTimes = [];
      const throughputData = [];

      if (rawData.results && Array.isArray(rawData.results)) {
        rawData.results.forEach(result => {
          // Support multiple possible field names (label, testName, fileSizeMB)
          const label = result.label || result.testName || (result.fileSizeMB ? `${result.fileSizeMB} MB` : null) || (result.testNameLabel || null);
          const enc = parseFloat(result.avgEncryptionTimeMs || result.encryptionTimeMs || result.avgEncMs || 0) || 0;
          const dec = parseFloat(result.avgDecryptionTimeMs || result.decryptionTimeMs || result.avgDecMs || 0) || 0;
          const tp = parseFloat(result.avgThroughputMBps || result.throughputMBps || result.avgThroughput || 0) || 0;

          // Only include entries that have a usable label
          if (label) {
            fileSizeLabels.push(label);
            encryptionTimes.push(enc);
            decryptionTimes.push(dec);
            throughputData.push(tp);
          }
        });
      }

      encryptionGraphData = {
        labels: fileSizeLabels,
        datasets: [
          {
            label: 'Encryption Time (ms)',
            data: encryptionTimes,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Decryption Time (ms)',
            data: decryptionTimes,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.3,
            fill: true
          }
        ]
      };
    }

    // Read signature results
    const signatureFile = path.join(resultsDir, 'signatures', 'signature_results.json');
    let signatureData = null;

    if (fs.existsSync(signatureFile)) {
      signatureData = JSON.parse(fs.readFileSync(signatureFile, 'utf-8'));
    }

    // Read watermark results
    const watermarkFile = path.join(resultsDir, 'watermarks', 'watermark_results.json');
    let watermarkData = null;
    let watermarkGraphData = null;

    if (fs.existsSync(watermarkFile)) {
      const rawData = JSON.parse(fs.readFileSync(watermarkFile, 'utf-8'));
      watermarkData = rawData;

      // Transform for attack comparison chart
      const attacks = [];
      const similarityScores = [];
      const detectionSuccesses = [];

      if (rawData.results && Array.isArray(rawData.results)) {
        const attackMap = new Map();

        rawData.results.forEach(result => {
          const attack = result.attack || result.attackType || result.test || 'Unknown';
          if (!attackMap.has(attack)) {
            attackMap.set(attack, { similarities: [], successes: [] });
          }
          const data = attackMap.get(attack);
          const sim = parseFloat(result.similarityPercentage || result.similarity || result.similarity_percent || 0) || 0;
          const succ = (result.detectionSuccess === true || result.detected === true || String(result.detectionSuccess).toLowerCase() === 'true') ? 1 : 0;
          data.similarities.push(sim);
          data.successes.push(succ);
        });

        attackMap.forEach((values, attack) => {
          attacks.push(attack);
          const avgSimilarity = values.similarities.length ? (values.similarities.reduce((a, b) => a + b, 0) / values.similarities.length) : 0;
          const successRate = values.successes.length ? ((values.successes.reduce((a, b) => a + b, 0) / values.successes.length) * 100) : 0;
          similarityScores.push(Number(avgSimilarity.toFixed(2)));
          detectionSuccesses.push(Number(successRate.toFixed(2)));
        });
      }

      watermarkGraphData = {
        labels: attacks,
        datasets: [
          {
            label: 'Avg Similarity %',
            data: similarityScores,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Detection Success %',
            data: detectionSuccesses,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.3,
            fill: true
          }
        ]
      };
    }

    // Read access control results
    const accessControlFile = path.join(resultsDir, 'access_control', 'access_control_results.json');
    let accessControlData = null;

    if (fs.existsSync(accessControlFile)) {
      accessControlData = JSON.parse(fs.readFileSync(accessControlFile, 'utf-8'));
    }

    // Read anomaly detection results
    const anomalyFile = path.join(resultsDir, 'anomaly_detection', 'anomaly_detection_results.json');
    let anomalyData = null;

    if (fs.existsSync(anomalyFile)) {
      anomalyData = JSON.parse(fs.readFileSync(anomalyFile, 'utf-8'));
    }

    // Read comprehensive report
    const reportFile = path.join(resultsDir, 'COMPREHENSIVE_EVALUATION_REPORT.json');
    let comprehensiveReport = null;

    if (fs.existsSync(reportFile)) {
      comprehensiveReport = JSON.parse(fs.readFileSync(reportFile, 'utf-8'));
    }

    res.json({
      hasResults: true,
      encryption: {
        data: encryptionData,
        graphData: encryptionGraphData,
        summary: encryptionData?.summary || null
      },
      signature: {
        data: signatureData,
        summary: signatureData?.summary || null
      },
      watermark: {
        data: watermarkData,
        graphData: watermarkGraphData,
        summary: watermarkData?.summary || null
      },
      accessControl: {
        data: accessControlData,
        summary: accessControlData?.summary || null
      },
      anomaly: {
        data: anomalyData,
        summary: anomalyData?.summary || null
      },
      comprehensive: comprehensiveReport
    });
  } catch (error) {
    console.error('Get evaluation performance error:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation performance data' });
  }
});

// Feature-specific metric endpoints for frontend convenience
router.get('/metrics/watermarking', adminMiddleware, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const watermarkFile = path.join(__dirname, '..', 'evaluation_results', 'watermarks', 'watermark_results.json');
    if (!fs.existsSync(watermarkFile)) return res.json({ stats: { success: 0, failed: 0 }, performance: {} });

    const raw = JSON.parse(fs.readFileSync(watermarkFile, 'utf8'));
    const results = Array.isArray(raw.results) ? raw.results : (raw.results || []);
    let success = 0, failed = 0, simSum = 0, count = 0;
    results.forEach(r => {
      if (r.detectionSuccess === true || String(r.detectionSuccess).toLowerCase() === 'true') success++; else failed++;
      simSum += Number(r.similarityPercentage || r.similarity || 0) || 0;
      count++;
    });
    const avgSim = count ? (simSum / count) : 0;

    res.json({
      stats: { success, failed, total: count },
      performance: { avgSimilarityPercent: Number(avgSim.toFixed(2)) },
      raw: raw
    });
  } catch (error) {
    console.error('Get watermarking metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch watermarking metrics' });
  }
});

router.get('/metrics/signature', adminMiddleware, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const signatureFile = path.join(__dirname, '..', 'evaluation_results', 'signatures', 'signature_results.json');
    if (!fs.existsSync(signatureFile)) return res.json({ stats: { success: 0, failed: 0 }, performance: {} });

    const raw = JSON.parse(fs.readFileSync(signatureFile, 'utf8'));
    const results = Array.isArray(raw.results) ? raw.results : (raw.results || []);
    let success = 0, failed = 0, timeSum = 0, count = 0;
    results.forEach(r => {
      const passed = (r.result === 'PASS' || r.correct === true || String(r.verified).toLowerCase() === 'true');
      if (passed) success++; else failed++;
      timeSum += Number(r.verificationTimeMs || r.avgVerificationTimeMs || r.verificationTime || 0) || 0;
      count++;
    });
    const avgTime = count ? (timeSum / count) : 0;

    res.json({
      stats: { success, failed, total: count },
      performance: { avgVerificationTimeMs: Number(avgTime.toFixed(3)) },
      raw: raw
    });
  } catch (error) {
    console.error('Get signature metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch signature metrics' });
  }
});

module.exports = router;


