import React, { useEffect, useState } from 'react';
import axios from 'axios';
import adminService from '../services/adminService';
import Charts, { BarChart, LineChart, PieChart } from '../components/Charts';
import authService from '../services/authService';

export default function AdminDashboard() {
  const [mode, setMode] = useState('local');
  const [loadingMode, setLoadingMode] = useState(true);
  const [changing, setChanging] = useState(false);

  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [evalSummary, setEvalSummary] = useState(null);
  const [evalTimeseries, setEvalTimeseries] = useState([]);
  const [anomalyStats, setAnomalyStats] = useState([]);

  // Feature-specific metrics
  const [encryptionMetrics, setEncryptionMetrics] = useState(null);
  const [geofencingMetrics, setGeofencingMetrics] = useState(null);
  const [watermarkingMetrics, setWatermarkingMetrics] = useState(null);
  const [signatureMetrics, setSignatureMetrics] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [drilldownData, setDrilldownData] = useState(null);
  const [drilldownVisible, setDrilldownVisible] = useState(false);
  
  // Evaluation performance data
  const [performanceData, setPerformanceData] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  // UI tab for evaluation views: 'all' | 'crypto' | 'access' | 'anomaly'
  const [selectedTab, setSelectedTab] = useState('all');

  const getToken = () => {
    try {
      if (authService && typeof authService.getToken === 'function') return authService.getToken();
      if (authService && authService.default && typeof authService.default.getToken === 'function') return authService.default.getToken();
    } catch (e) {}
    return localStorage.getItem('token');
  };
  const token = getToken();
  const API = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // Map legacy test labels (small/medium/large/xlarge) to explicit MB labels
  const formatSizeLabel = (label, fileSizeMB) => {
    // explicit mapping requested: 1,5,10,15,20 MB
    const map = { small: '1 MB', medium: '5 MB', large: '10 MB', xlarge: '15 MB', xxlarge: '20 MB' };
    if (fileSizeMB) {
      const n = Number(fileSizeMB);
      if (!Number.isNaN(n)) {
        // show integer MB when >=1, otherwise keep two decimals
        if (n >= 1) return `${Number.isFinite(n) ? (Number.isInteger(n) ? n : Number(n.toFixed(2))) : n} MB`;
        return `${n.toFixed(2)} MB`;
      }
    }
    if (!label) return '';
    const base = String(label).split('-')[0];
    return map[base] || String(label);
  };

  // storage-mode helpers
  const fetchStorageMode = async () => {
    try {
      return await adminService.getStorageMode(token);
    } catch (e) {
      console.warn('Failed to fetch storage mode:', e);
      return { mode: 'local' };
    }
  };
  
  const updateStorageMode = async (m) => {
    try {
      return await adminService.setStorageMode(m, token);
    } catch (e) { 
      throw e; 
    }
  };

  // Chart download function
  // Chart download function (supports SVG charts produced by our lightweight components)
  const downloadChart = (chartId, chartName) => {
    const container = document.getElementById(chartId);
    if (!container) {
      alert('Chart container not found');
      return;
    }
    const svg = container.querySelector('svg');
    if (!svg) {
      // fallback: try to find a canvas
      const canvas = container.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${chartName}-${new Date().toISOString().slice(0,10)}.png`;
        link.click();
        return;
      }
      alert('Chart not rendered yet');
      return;
    }

    try {
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svg);

      // Add name spaces if missing
      if (!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!svgString.match(/^<svg[^>]+xmlns:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
      }

      // Create image and draw to canvas
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Use svg viewBox if available for proper scaling
        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.split(' ').map(Number);
          canvas.width = parts[2] || svg.clientWidth || 800;
          canvas.height = parts[3] || svg.clientHeight || 400;
        } else {
          canvas.width = svg.clientWidth || 800;
          canvas.height = svg.clientHeight || 400;
        }
        const ctx = canvas.getContext('2d');
        // white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${chartName}-${new Date().toISOString().slice(0,10)}.png`;
        link.click();
      };
      img.onerror = (err) => {
        console.error('SVG to image conversion failed', err);
        alert('Failed to convert chart for download');
      };
      img.src = url;
    } catch (e) {
      console.error('downloadChart error', e);
      alert('Failed to download chart');
    }
  };

  // data fetchers
  const fetchUsers = async () => {
    try {
      const res = await adminService.getUsers(token);
      setUsers(res.users || res || []);
    } catch (e) {
      console.error('fetchUsers', e);
      setUsers([]);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await adminService.getLogs(token);
      setLogs(res.logs || res || []);
    } catch (e) {
      console.error('fetchLogs', e);
      setLogs([]);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await adminService.getFeedbacks(token);
      setFeedbacks(res.feedback || res || []);
    } catch (e) {
      console.warn('fetchFeedbacks: missing or failed', e.message || e);
      setFeedbacks([]);
    }
  };

  // Fetch feature metrics
  const fetchFeatureMetrics = async () => {
    try {
      const [enc, geo, water, sig, health] = await Promise.all([
        adminService.getEncryptionMetrics(token).catch(() => null),
        adminService.getGeofencingMetrics(token).catch(() => null),
        adminService.getWatermarkingMetrics(token).catch(() => null),
        adminService.getSignatureMetrics(token).catch(() => null),
        adminService.getHealthScore(token).catch(() => null)
      ]);
      setEncryptionMetrics(enc);
      setGeofencingMetrics(geo);
      setWatermarkingMetrics(water);
      setSignatureMetrics(sig);
      setHealthScore(health);
    } catch (error) {
      console.error('fetchFeatureMetrics', error);
    }
  };

  // Fetch evaluation performance data
  const fetchPerformanceData = async () => {
    try {
      setPerformanceLoading(true);
      const response = await axios.get(`${API}/admin/evaluations/performance`, authHeader);
      setPerformanceData(response.data);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      setPerformanceData({ hasResults: false });
    } finally {
      setPerformanceLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchStorageMode();
        if (mounted) setMode(r.mode || 'local');
        await Promise.all([fetchUsers(), fetchLogs(), fetchFeedbacks()]);
        await fetchEvaluations();
        await fetchEvalStats();
        await fetchFeatureMetrics();
        await fetchPerformanceData();
        if (mounted) runAnomalyDetection();
      } finally {
        if (mounted) { setLoading(false); setLoadingMode(false); }
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line
  }, [token]);

  // storage toggle
  const toggleStorage = async () => {
    const newMode = mode === 'local' ? 'azure' : 'local';
    setChanging(true);
    try {
      await updateStorageMode(newMode);
      setMode(newMode);
      setNotifications(prev => [{ 
        id: Date.now(), 
        type: 'success', 
        text: `Storage switched to ${newMode.toUpperCase()}` 
      }, ...prev]);
    } catch (e) {
      const errorMsg = e.response?.data?.error || e.message;
      const userMessage = errorMsg.includes('Azure') || errorMsg.includes('available')
        ? 'Azure storage is not configured. Please check your Azure credentials in the backend configuration.'
        : `Failed to switch storage: ${errorMsg}`;
      setNotifications(prev => [{ 
        id: Date.now(), 
        type: 'error', 
        text: userMessage
      }, ...prev]);
    } finally {
      setChanging(false);
    }
  };

  // migrate storage with confirmation
  const migrateStorage = async () => {
    const targetMode = mode === 'local' ? 'azure' : 'local';
    const confirmMessage = `This will migrate all existing files from ${mode} to ${targetMode} storage. This may take some time. Continue?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    setChanging(true);
    try {
      const result = await adminService.migrateStorage(targetMode, token);
      setMode(targetMode);
      setNotifications(prev => [{ 
        id: Date.now(), 
        type: 'success', 
        text: `Migration completed: ${result.results.migrated} files migrated, ${result.results.failed} failed` 
      }, ...prev]);
    } catch (e) {
      setNotifications(prev => [{ 
        id: Date.now(), 
        type: 'error', 
        text: `Migration failed: ${e.response?.data?.error || e.message}` 
      }, ...prev]);
    } finally { 
      setChanging(false); 
    }
  };

  // User management
  const addUser = async (u) => {
    try {
      await adminService.createUser(u, token);
      await fetchUsers();
      setNotifications(prev => [{ id: Date.now(), type: 'success', text: 'User created' }, ...prev]);
    } catch (e) {
      setNotifications(prev => [{ 
        id: Date.now(), 
        type: 'error', 
        text: `Create user failed: ${e.response?.data?.error || e.message}` 
      }, ...prev]);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete user?')) return;
    try {
      await adminService.deleteUser(id, token);
      setUsers(prev => prev.filter(x => (x.id || x.user_id) !== id));
      setNotifications(prev => [{ id: Date.now(), type: 'warn', text: 'User deleted' }, ...prev]);
    } catch (e) {
      setNotifications(prev => [{ 
        id: Date.now(), 
        type: 'error', 
        text: `Delete failed: ${e.response?.data?.error || e.message}` 
      }, ...prev]);
    }
  };

  // Feedback management
  const replyFeedback = async (id, message) => {
    try {
      await adminService.replyFeedback(id, message, token);
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, replied: true } : f));
      setNotifications(prev => [{ id: Date.now(), type: 'success', text: 'Replied to feedback' }, ...prev]);
    } catch (e) {
      setNotifications(prev => [{ 
        id: Date.now(), 
        type: 'error', 
        text: `Reply failed: ${e.response?.data?.error || e.message}` 
      }, ...prev]);
    }
  };

  // Simple client-side anomaly detection
  const runAnomalyDetection = () => {
    const notes = [];
    try {
      logs.forEach(l => {
        const action = String(l.action || l.type || '').toLowerCase();
        if (action.includes('failed') || action.includes('unauthorized') || action.includes('invalid')) {
          notes.push({ id: `anom-${l.id || l.timestamp || Math.random()}`, text: `Suspicious: ${l.user_email || l.user_id || 'user'} - ${l.action || action}`, severity: 'high', log: l });
        }
      });
      const downloads = {};
      logs.forEach(l => {
        const action = String(l.action || l.type || '').toLowerCase();
        if (action.includes('download')) {
          const u = l.user_email || l.user_id || 'unknown';
          downloads[u] = (downloads[u] || 0) + 1;
        }
      });
      Object.entries(downloads).forEach(([u,c]) => { if (c >= 10) notes.push({ id: `anom-dl-${u}`, text: `High downloads by ${u} (${c})`, severity: 'medium' }); });
    } catch (e) {
      console.error('anomaly detection error', e);
    }
    if (notes.length) setNotifications(prev => [...notes, ...prev]);
    return notes;
  };

  const clearNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));
  const markAllResolved = () => setNotifications([]);

  // Drilldown handler
  const openDrilldown = async (metric_key, feature_name) => {
    setDrilldownVisible(true);
    setDrilldownData({ metric_key, feature_name, rows: [], loading: true, error: null });
    try {
      const res = await axios.get(`${API}/admin/metrics/${metric_key}/drilldown`, authHeader);
      setDrilldownData(prev => prev ? { 
        ...prev, 
        loading: false, 
        rows: res.data.rows || [],
        count: res.data.count || 0 
      } : null);
    } catch (e) {
      console.error('Drilldown fetch error:', e);
      setDrilldownData(prev => prev ? { 
        ...prev, 
        loading: false, 
        error: `Failed to fetch: ${e.response?.data?.error || e.message}` 
      } : null);
    }
  };

  // Derived signature-by-file grouping for table (fallback if backend summary not present)
  const signatureByFileType = (() => {
    try {
      const src = performanceData?.signature?.data;
      if (!src) return [];
      if (src.summary && Array.isArray(src.summary.byFileType) && src.summary.byFileType.length) return src.summary.byFileType;
      const results = src.results || src.testGroups?.originalFiles || [];
      const map = {};
      results.forEach(r => {
        // use fileName or extension as grouping
        const fname = r.fileName || r.file || 'unknown';
        const type = fname.includes('.') ? fname.split('.').pop() : fname;
        if (!map[type]) map[type] = { type, verificationsPassed: 0, totalTests: 0, avgVerificationTimeMs: 0 };
        map[type].totalTests += 1;
        const passed = (r.result === 'PASS' || r.correct === true || String(r.verified).toLowerCase() === 'true');
        if (passed) map[type].verificationsPassed += 1;
        const prevAvg = map[type].avgVerificationTimeMs || 0;
        const v = Number(r.verificationTimeMs || r.avgVerificationTimeMs || r.verificationTime || 0) || 0;
        map[type].avgVerificationTimeMs = ((prevAvg * (map[type].totalTests - 1)) + v) / map[type].totalTests;
      });
      return Object.values(map);
    } catch (e) {
      return [];
    }
  })();

  // Evaluations
  const fetchEvaluations = async () => {
    try {
      const res = await adminService.getEvaluations(token);
      setEvaluations(res.results || []);
    } catch (e) {
      console.error('fetchEvaluations', e);
      setEvaluations([]);
      setNotifications(prev => [{ id: Date.now(), type: 'error', text: `Failed to load evaluations: ${e.response?.data?.error || e.message}` }, ...prev]);
    }
  };

  const runEvalScript = async (scriptKey) => {
    try {
      setPerformanceLoading(true);
      const res = await adminService.runEvaluation(scriptKey, token);
      setNotifications(prev => [{ id: Date.now(), type: 'success', text: `Started evaluation: ${scriptKey}` }, ...prev]);
      // Give the backend a moment to write results, then refresh
      setTimeout(async () => {
        await fetchPerformanceData();
        await fetchEvaluations();
        setNotifications(prev => [{ id: Date.now(), type: 'success', text: `Refreshed evaluation results for ${scriptKey}` }, ...prev]);
      }, 2500);
      return res;
    } catch (e) {
      console.error('runEvalScript error', e);
      setNotifications(prev => [{ id: Date.now(), type: 'error', text: `Failed to start evaluation: ${e.response?.data?.error || e.message}` }, ...prev]);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const fetchEvalStats = async () => {
    try {
      const sum = await adminService.getEvaluationSummary(token).catch(()=>null);
      const anomalies = await adminService.getAnomalyStats(token).catch(()=>null);
      setEvalSummary(sum || null);
      setAnomalyStats(anomalies?.stats || anomalies || []);

      // pick a metric for timeseries
      let metricKey = null;
      if (sum && Array.isArray(sum.metrics) && sum.metrics.length) metricKey = sum.metrics[0].key || sum.metrics[0].metric_key;
      else if (sum && typeof sum === 'object') {
        const keys = Object.keys(sum).filter(k => k !== 'meta' && k !== 'stats');
        if (keys.length) metricKey = keys[0];
      }
      if (metricKey) {
        const ts = await adminService.getEvaluationTimeseries(metricKey, 14, token).catch(()=>null);
        const arr = ts?.timeseries || ts?.data || ts || [];
        setEvalTimeseries(Array.isArray(arr) ? arr : []);
      }
    } catch (e) {
      console.error('fetchEvalStats', e);
      setEvalSummary(null);
      setEvalTimeseries([]);
      setAnomalyStats([]);
    }
  };

  // form state for new user
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Manage users, monitor logs, respond to feedback, and control storage.</p>
        </div>

        <div className="space-y-3 text-right">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Storage: <span className="font-semibold ml-1">{loadingMode ? '...' : mode.toUpperCase()}</span></div>
            <button onClick={toggleStorage} disabled={changing || loadingMode} className={`px-3 py-1 rounded ${mode==='azure' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              {changing ? 'Applying...' : (mode === 'azure' ? 'Azure' : 'Local')}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={migrateStorage} 
              disabled={changing || loadingMode} 
              className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {changing ? 'Migrating...' : 'Migrate Files'}
            </button>
            <div className="text-xs text-gray-500">Migrate existing files</div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { fetchUsers(); fetchLogs(); fetchFeedbacks(); }} className="px-3 py-1 bg-white rounded border text-sm">Refresh</button>
            <button onClick={() => { const a = runAnomalyDetection(); if (a.length===0) alert('No anomalies found'); }} className="px-3 py-1 bg-yellow-100 rounded border text-sm">Analyze Logs</button>
            <button onClick={markAllResolved} className="px-3 py-1 bg-green-100 rounded border text-sm">Clear Notifications</button>
          </div>
        </div>
      </header>

      {/* Evaluation tabs */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          {['all','crypto','access','anomaly'].map(t => (
            <button
              key={t}
              onClick={() => setSelectedTab(t)}
              className={`px-3 py-1 rounded text-sm ${selectedTab===t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Security Health Score */}
          {(selectedTab === 'all' || selectedTab === 'crypto') && healthScore && (
            <section className="bg-gradient-to-r from-blue-600 to-blue-400 p-6 rounded shadow text-white">
              <h2 className="text-lg font-semibold mb-2">Security Health Score</h2>
              <div className="text-5xl font-bold mb-4">{healthScore.healthScore || 0}%</div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div>
                  <div className="text-xs opacity-80">Encryption</div>
                  <div className="text-lg font-semibold">{Number(healthScore.breakdown?.encryption || 0).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs opacity-80">Geofencing</div>
                  <div className="text-lg font-semibold">{Number(healthScore.breakdown?.geofencing || 0).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs opacity-80">Watermarking</div>
                  <div className="text-lg font-semibold">{Number(healthScore.breakdown?.watermarking || 0).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs opacity-80">Signature</div>
                  <div className="text-lg font-semibold">{Number(healthScore.breakdown?.signature || 0).toFixed(1)}%</div>
                </div>
              </div>
            </section>
          )}

          {/* Feature Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Encryption Metrics */}
            {(selectedTab === 'all' || selectedTab === 'crypto') && encryptionMetrics && (
              <section className="bg-white p-5 rounded shadow border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">🔐 Encryption Performance</h3>
                  <button 
                    onClick={() => downloadChart('chart-encryption', 'encryption')}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium px-2 py-1 rounded hover:bg-blue-50"
                  >
                    ↓ Download
                  </button>
                </div>
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-semibold text-green-600">{encryptionMetrics.stats?.success || 0} ops</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed</span>
                    <span className="font-semibold text-red-600">{encryptionMetrics.stats?.failed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Time</span>
                    <span className="font-semibold">{Number(encryptionMetrics.performance?.avg_time_ms || 0).toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Range</span>
                    <span className="text-xs text-gray-500">{Number(encryptionMetrics.performance?.min_time_ms || 0).toFixed(2)} - {Number(encryptionMetrics.performance?.max_time_ms || 0).toFixed(2)} ms</span>
                  </div>
                  {encryptionMetrics.performance?.operations && (
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Sample Size</span>
                      <span>n={encryptionMetrics.performance.operations}</span>
                    </div>
                  )}
                </div>
                <div id="chart-encryption" className="mt-2">
                  <BarChart 
                    data={[
                      { label: 'Success', value: encryptionMetrics.stats?.success || 0, color: '#10b981' },
                      { label: 'Failed', value: encryptionMetrics.stats?.failed || 0, color: '#ef4444' }
                    ]} 
                    maxHeight={180}
                    yLabel="Count"
                  />
                </div>
                <button 
                  onClick={() => openDrilldown('encryption', 'Encryption')} 
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  View details →
                </button>
              </section>
            )}

            {/* Geofencing Metrics */}
            {(selectedTab === 'all' || selectedTab === 'access') && geofencingMetrics && (
              <section className="bg-white p-5 rounded shadow border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">🌍 Geofencing Access Control</h3>
                  <button 
                    onClick={() => downloadChart('chart-geofencing', 'geofencing')}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium px-2 py-1 rounded hover:bg-blue-50"
                  >
                    ↓ Download
                  </button>
                </div>
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span>Allowed</span>
                    <span className="font-semibold text-green-600">{geofencingMetrics.stats?.success || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Denied</span>
                    <span className="font-semibold text-red-600">{geofencingMetrics.stats?.failed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-semibold">{Number(geofencingMetrics.performance?.success_rate || 0).toFixed(1)}%</span>
                  </div>
                </div>
                <div id="chart-geofencing" className="mt-2">
                  <PieChart 
                    data={[
                      { label: 'Allowed', value: geofencingMetrics.stats?.success || 0, color: '#10b981' },
                      { label: 'Denied', value: geofencingMetrics.stats?.failed || 0, color: '#ef4444' }
                    ]}
                    maxHeight={200}
                  />
                </div>
                <button 
                  onClick={() => openDrilldown('geofencing', 'Geofencing')} 
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  View details →
                </button>
              </section>
            )}

            {/* Watermarking Metrics */}
            {(selectedTab === 'all' || selectedTab === 'crypto') && watermarkingMetrics && (
              <section className="bg-white p-5 rounded shadow border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">💧 Watermarking Robustness</h3>
                  <button 
                    onClick={() => downloadChart('chart-watermarking', 'watermarking')}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium px-2 py-1 rounded hover:bg-blue-50"
                  >
                    ↓ Download
                  </button>
                </div>
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span>Applied</span>
                    <span className="font-semibold text-green-600">{watermarkingMetrics.stats?.success || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed</span>
                    <span className="font-semibold text-red-600">{watermarkingMetrics.stats?.failed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Processing</span>
                    <span className="font-semibold">{Number(watermarkingMetrics.performance?.avg_time_ms || 0).toFixed(2)} ms</span>
                  </div>
                </div>
                <div id="chart-watermarking" className="mt-2">
                  <BarChart 
                    data={[
                      { label: 'Applied', value: watermarkingMetrics.stats?.success || 0, color: '#8b5cf6' },
                      { label: 'Failed', value: watermarkingMetrics.stats?.failed || 0, color: '#ef4444' }
                    ]} 
                    maxHeight={180}
                    yLabel="Count"
                  />
                </div>
                <button 
                  onClick={() => openDrilldown('watermarking', 'Watermarking')} 
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  View details →
                </button>
              </section>
            )}

            {/* Digital Signature Metrics */}
            {(selectedTab === 'all' || selectedTab === 'crypto') && signatureMetrics && (
              <section className="bg-white p-5 rounded shadow border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">✓ Digital Signature Verification</h3>
                  <button 
                    onClick={() => downloadChart('chart-signature', 'signature')}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium px-2 py-1 rounded hover:bg-blue-50"
                  >
                    ↓ Download
                  </button>
                </div>
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span>Verified</span>
                    <span className="font-semibold text-green-600">{signatureMetrics.stats?.success || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed</span>
                    <span className="font-semibold text-red-600">{signatureMetrics.stats?.failed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-semibold">{Number(signatureMetrics.performance?.success_rate || 0).toFixed(1)}%</span>
                  </div>
                </div>
                <div id="chart-signature" className="mt-2">
                  <BarChart 
                    data={[
                      { label: 'Verified', value: signatureMetrics.stats?.success || 0, color: '#8b5cf6' },
                      { label: 'Failed', value: signatureMetrics.stats?.failed || 0, color: '#ef4444' }
                    ]} 
                    maxHeight={180}
                    yLabel="Count"
                  />
                </div>
                <button 
                  onClick={() => openDrilldown('signature', 'Signature')} 
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  View details →
                </button>
              </section>
            )}
          </div>

          {/* Performance Visualizations Section */}
          {performanceData?.hasResults && (
            <>
              <h2 className="text-2xl font-bold mt-8 mb-6 text-gray-800">📊 Performance Evaluation Results</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="col-span-full flex gap-2 items-center">
                  <div className="text-sm text-gray-600 mr-2">Run evaluations:</div>
                  <button onClick={() => runEvalScript('encryption')} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Run Encryption</button>
                  <button onClick={() => runEvalScript('signature')} className="px-3 py-1 bg-purple-600 text-white rounded text-sm">Run Signature</button>
                  <button onClick={() => runEvalScript('watermark')} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Run Watermark</button>
                  <button onClick={() => runEvalScript('access_control')} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Run Access Control</button>
                  <button onClick={() => runEvalScript('anomaly')} className="px-3 py-1 bg-orange-600 text-white rounded text-sm">Run Anomaly</button>
                  <button onClick={() => runEvalScript('report')} className="px-3 py-1 bg-gray-700 text-white rounded text-sm">Generate Report</button>
                </div>
                {/* Encryption Performance Graph */}
                {(selectedTab === 'all' || selectedTab === 'crypto') && performanceData?.encryption?.graphData && (
                  <section className="bg-white p-5 rounded shadow border border-gray-200 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-lg text-gray-800">🔐 Encryption Time vs File Size</h3>
                      <button 
                        onClick={() => downloadChart('chart-encryption-perf', 'encryption-performance')}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium px-2 py-1 rounded hover:bg-blue-50"
                      >
                        ↓ Download
                      </button>
                    </div>
                    <div id="chart-encryption-perf" className="bg-white p-4 rounded border border-gray-200">
                      <svg width="100%" height="300" viewBox="0 0 500 300" style={{minHeight: '300px'}} preserveAspectRatio="xMidYMid meet">
                        {/* Background grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                          const y = 250 - (ratio * 200);
                          return (
                            <line key={`grid-${ratio}`} x1="60" y1={y} x2="450" y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3"/>
                          );
                        })}
                        {/* Y-axis */}
                        <line x1="60" y1="30" x2="60" y2="250" stroke="#374151" strokeWidth="2"/>
                        {/* X-axis */}
                        <line x1="60" y1="250" x2="450" y2="250" stroke="#374151" strokeWidth="2"/>
                        
                        {/* Y-axis label */}
                        <text x="20" y="140" fontSize="13" fill="#6b7280" textAnchor="middle" transform="rotate(-90, 20, 140)">Time (ms)</text>
                        
                        {/* Y-axis scale labels */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                          const y = 250 - (ratio * 200);
                          const maxValue = Math.max(...performanceData.encryption.graphData.datasets[0].data, ...performanceData.encryption.graphData.datasets[1].data, 1);
                          const value = (maxValue * ratio).toFixed(0);
                          return (
                            <text key={`y-label-${ratio}`} x="55" y={y + 4} fontSize="10" fill="#6b7280" textAnchor="end">{value}</text>
                          );
                        })}
                        
                        {/* Data lines and points */}
                        {performanceData.encryption.graphData.labels.map((label, idx) => {
                          // Ensure numeric arrays (some files may contain strings)
                          const encArray = (performanceData.encryption.graphData.datasets[0].data || []).map(v => Number(v) || 0);
                          const decArray = (performanceData.encryption.graphData.datasets[1].data || []).map(v => Number(v) || 0);
                          const maxValue = Math.max(...encArray, ...decArray, 1);
                          const x = 80 + (idx * ((450 - 80) / Math.max(1, performanceData.encryption.graphData.labels.length - 1)));
                          const encValue = encArray[idx] || 0;
                          const decValue = decArray[idx] || 0;
                          const encY = 250 - ((encValue / maxValue) * 200);
                          const decY = 250 - ((decValue / maxValue) * 200);
                          
                          // Draw connecting lines
                          if (idx > 0) {
                            const prevX = 80 + ((idx - 1) * ((450 - 80) / Math.max(1, performanceData.encryption.graphData.labels.length - 1)));
                            const prevEncValue = performanceData.encryption.graphData.datasets[0].data[idx - 1] || 0;
                            const prevDecValue = performanceData.encryption.graphData.datasets[1].data[idx - 1] || 0;
                            const prevEncY = 250 - ((prevEncValue / maxValue) * 200);
                            const prevDecY = 250 - ((prevDecValue / maxValue) * 200);
                            
                            return (
                              <g key={`lines-${idx}`}>
                                <line x1={prevX} y1={prevEncY} x2={x} y2={encY} stroke="#3b82f6" strokeWidth="3" opacity="0.7"/>
                                <line x1={prevX} y1={prevDecY} x2={x} y2={decY} stroke="#ef4444" strokeWidth="3" opacity="0.7"/>
                              </g>
                            );
                          }
                          return null;
                        })}
                        
                        {/* Data points */}
                        {performanceData.encryption.graphData.labels.map((label, idx) => {
                          const encArray = (performanceData.encryption.graphData.datasets[0].data || []).map(v => Number(v) || 0);
                          const decArray = (performanceData.encryption.graphData.datasets[1].data || []).map(v => Number(v) || 0);
                          const maxValue = Math.max(...encArray, ...decArray, 1);
                          const x = 80 + (idx * ((450 - 80) / Math.max(1, performanceData.encryption.graphData.labels.length - 1)));
                          const encValue = encArray[idx] || 0;
                          const decValue = decArray[idx] || 0;
                          const encY = 250 - ((encValue / maxValue) * 200);
                          const decY = 250 - ((decValue / maxValue) * 200);
                          
                          return (
                            <g key={`data-${idx}`}>
                              {/* Encryption point */}
                              <circle cx={x} cy={encY} r="6" fill="#3b82f6" stroke="#fff" strokeWidth="2"/>
                              <text x={x} y={encY - 12} fontSize="9" textAnchor="middle" fill="#3b82f6" fontWeight="600">{encValue.toFixed(0)}</text>
                              {/* Decryption point */}
                              <circle cx={x} cy={decY} r="6" fill="#ef4444" stroke="#fff" strokeWidth="2"/>
                              <text x={x} y={decY - 12} fontSize="9" textAnchor="middle" fill="#ef4444" fontWeight="600">{decValue.toFixed(0)}</text>
                              {/* X-axis label */}
                              <text x={x} y="270" fontSize="11" textAnchor="middle" fill="#374151" fontWeight="500">{formatSizeLabel(label)}</text>
                            </g>
                          );
                        })}
                        
                        {/* Legend */}
                        <g>
                          <rect x="70" y="20" width="120" height="50" fill="white" stroke="#e5e7eb" strokeWidth="1" rx="4" opacity="0.9"/>
                          <circle cx="85" cy="35" r="5" fill="#3b82f6" stroke="#fff" strokeWidth="1"/>
                          <text x="95" y="39" fontSize="12" fill="#374151" fontWeight="500">Encryption</text>
                          <circle cx="85" cy="50" r="5" fill="#ef4444" stroke="#fff" strokeWidth="1"/>
                          <text x="95" y="54" fontSize="12" fill="#374151" fontWeight="500">Decryption</text>
                        </g>
                      </svg>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Integrity Verified:</span>
                        <span className="font-semibold text-green-600">{performanceData.encryption.summary?.allIntegrityPassed ? 'YES ✓' : 'NO ✗'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Highest Throughput:</span>
                        <span className="font-semibold">{performanceData.encryption.summary?.highestThroughput?.avgThroughputMBps || 'N/A'} MB/s</span>
                      </div>
                    </div>
                  </section>
                )}

                {/* Watermark Robustness Graph */}
                {(selectedTab === 'all' || selectedTab === 'crypto') && performanceData?.watermark?.graphData && (
                  <section className="bg-white p-5 rounded shadow border border-gray-200 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-lg text-gray-800">💧 Watermark Attack Resilience</h3>
                      <button 
                        onClick={() => downloadChart('chart-watermark-perf', 'watermark-performance')}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium px-2 py-1 rounded hover:bg-blue-50"
                      >
                        ↓ Download
                      </button>
                    </div>
                    <div id="chart-watermark-perf" className="bg-white p-4 rounded border border-gray-200">
                      <svg width="100%" height="300" viewBox="0 0 500 300" style={{minHeight: '300px'}} preserveAspectRatio="xMidYMid meet">
                        {/* Background grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                          const y = 250 - (ratio * 200);
                          return (
                            <line key={`grid-${ratio}`} x1="60" y1={y} x2="450" y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3"/>
                          );
                        })}
                        {/* Y-axis */}
                        <line x1="60" y1="30" x2="60" y2="250" stroke="#374151" strokeWidth="2"/>
                        {/* X-axis */}
                        <line x1="60" y1="250" x2="450" y2="250" stroke="#374151" strokeWidth="2"/>
                        {/* Y-axis label */}
                        <text x="20" y="140" fontSize="13" fill="#6b7280" textAnchor="middle" transform="rotate(-90, 20, 140)">Percentage (%)</text>
                        
                        {/* Y-axis scale labels */}
                        {[0, 25, 50, 75, 100].map((value) => {
                          const y = 250 - (value * 2);
                          return (
                            <text key={`y-label-${value}`} x="55" y={y + 4} fontSize="10" fill="#6b7280" textAnchor="end">{value}%</text>
                          );
                        })}
                        
                        {/* Bars for each attack */}
                        {performanceData.watermark.graphData.labels.map((label, idx) => {
                          const totalBars = performanceData.watermark.graphData.labels.length;
                          const barSpacing = (450 - 80) / totalBars;
                          const x = 80 + (idx * barSpacing);
                          const similarity = Number(performanceData.watermark.graphData.datasets[0].data[idx] || 0);
                          const success = Number(performanceData.watermark.graphData.datasets[1].data[idx] || 0);
                          const barWidth = Math.min(barSpacing * 0.3, 25);
                          const similarityHeight = similarity * 2;
                          const successHeight = success * 2;
                          
                          return (
                            <g key={`attack-${idx}`}>
                              {/* Similarity bar */}
                              <rect 
                                x={x - barWidth - 2} 
                                y={250 - similarityHeight} 
                                width={barWidth} 
                                height={similarityHeight} 
                                fill="#10b981" 
                                stroke="#fff" 
                                strokeWidth="1"
                                rx="2"
                              />
                              <text 
                                x={x - barWidth/2 - 2} 
                                y={250 - similarityHeight - 5} 
                                fontSize="9" 
                                textAnchor="middle" 
                                fill="#10b981" 
                                fontWeight="600"
                              >
                                {similarity.toFixed(0)}%
                              </text>
                              
                              {/* Success bar */}
                              <rect 
                                x={x + 2} 
                                y={250 - successHeight} 
                                width={barWidth} 
                                height={successHeight} 
                                fill="#f59e0b" 
                                stroke="#fff" 
                                strokeWidth="1"
                                rx="2"
                              />
                              <text 
                                x={x + barWidth/2 + 2} 
                                y={250 - successHeight - 5} 
                                fontSize="9" 
                                textAnchor="middle" 
                                fill="#f59e0b" 
                                fontWeight="600"
                              >
                                {success.toFixed(0)}%
                              </text>
                              
                              {/* Label */}
                              <text 
                                x={x} 
                                y="270" 
                                fontSize="10" 
                                textAnchor="middle" 
                                fill="#374151" 
                                fontWeight="500"
                              >
                                {label.length > 8 ? label.substring(0, 8) + '...' : label}
                              </text>
                            </g>
                          );
                        })}
                        
                        {/* Legend */}
                        <g>
                          <rect x="70" y="20" width="140" height="50" fill="white" stroke="#e5e7eb" strokeWidth="1" rx="4" opacity="0.9"/>
                          <rect x="80" y="30" width="12" height="12" fill="#10b981" stroke="#fff" strokeWidth="1" rx="2"/>
                          <text x="97" y="39" fontSize="12" fill="#374151" fontWeight="500">Similarity %</text>
                          <rect x="80" y="45" width="12" height="12" fill="#f59e0b" stroke="#fff" strokeWidth="1" rx="2"/>
                          <text x="97" y="54" fontSize="12" fill="#374151" fontWeight="500">Success %</text>
                        </g>
                      </svg>
                    </div>
                  </section>
                )}
              </div>

              {/* Performance Metrics Table */}
              <section className="bg-white p-6 rounded shadow mt-6 border border-gray-200">
                <h3 className="font-semibold text-xl mb-6 text-gray-800">📈 Detailed Performance Metrics</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Encryption Metrics Table */}
                  {performanceData?.encryption?.data && (
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <h4 className="font-semibold mb-3 text-base text-gray-800">Encryption Performance</h4>
                      <div className="overflow-x-auto bg-white rounded border border-gray-200">
                        <table className="w-full text-sm border-collapse">
                          <thead className="bg-blue-100">
                            <tr>
                              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Test</th>
                              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Encrypt (ms)</th>
                              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Decrypt (ms)</th>
                              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Throughput</th>
                            </tr>
                          </thead>
                          <tbody>
                            {performanceData.encryption.data.results?.slice(0, 5).map((result, idx) => (
                              <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                <td className="border border-gray-200 px-3 py-2 text-gray-800">{result.testName || formatSizeLabel(result.label, result.fileSizeMB) || result.test || (result.fileSizeMB ? `${result.fileSizeMB} MB` : (result.fileName || '-'))}</td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-medium text-blue-600">{Number(result.avgEncryptionTimeMs || result.encryptionTimeMs || 0).toFixed(2)}</td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-medium text-red-600">{Number(result.avgDecryptionTimeMs || result.decryptionTimeMs || 0).toFixed(2)}</td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-medium text-green-600">{Number(result.avgThroughputMBps || result.throughputMBps || 0).toFixed(2)} MB/s</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Signature Metrics Table */}
                  {performanceData?.signature?.data && (
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <h4 className="font-semibold mb-3 text-base text-gray-800">Signature Verification</h4>
                      <div className="overflow-x-auto bg-white rounded border border-gray-200">
                        <table className="w-full text-sm border-collapse">
                          <thead className="bg-purple-100">
                            <tr>
                              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">File Type</th>
                              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Verified</th>
                              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Time (ms)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(signatureByFileType || []).map((ft, idx) => (
                              <tr key={idx} className="hover:bg-purple-50 transition-colors">
                                <td className="border border-gray-200 px-3 py-2 text-gray-800">{ft.type || ft.label || ft.fileType || 'Unknown'}</td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-semibold text-green-600">{ft.verificationsPassed || ft.passedTests || 0}/{ft.totalTests || 0}</td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-medium text-purple-600">{Number(ft.avgVerificationTimeMs || ft.avgVerificationTimeMs || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Anomaly Detection Metrics */}
                  {performanceData?.anomaly?.data && (
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <h4 className="font-semibold mb-3 text-base text-gray-800">Anomaly Detection</h4>
                      <div className="overflow-x-auto bg-white rounded border border-gray-200">
                        <table className="w-full text-sm border-collapse">
                          <thead className="bg-orange-100">
                            <tr>
                              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Anomaly Type</th>
                              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Accuracy</th>
                              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Time (ms)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {performanceData.anomaly.data.byAnomalyType?.map((at, idx) => (
                              <tr key={idx} className="hover:bg-orange-50 transition-colors">
                                <td className="border border-gray-200 px-3 py-2 text-gray-800">{at.type}</td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-semibold text-orange-600">{at.accuracy}</td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-medium text-orange-600">{Number(at.avgDetectionTimeMs).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Access Control Metrics */}
                  {performanceData?.accessControl?.data && (
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                      <h4 className="font-semibold mb-3 text-base text-gray-800">Access Control Policies</h4>
                      <div className="overflow-x-auto bg-white rounded border border-gray-200">
                        <table className="w-full text-sm border-collapse">
                          <thead className="bg-green-100">
                            <tr>
                              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Policy Type</th>
                              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Accuracy</th>
                              <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Time (ms)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {performanceData.accessControl.data.byTestType?.map((pt, idx) => (
                              <tr key={idx} className="hover:bg-green-50 transition-colors">
                                <td className="border border-gray-200 px-3 py-2 text-gray-800">{pt.type}</td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-semibold text-green-600">{pt.accuracy}</td>
                                <td className="border border-gray-200 px-3 py-2 text-right font-medium text-green-600">{Number(pt.avgResponseTimeMs).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Overall Score Card */}
              {performanceData?.comprehensive && (
                <section className="bg-gradient-to-r from-indigo-600 to-indigo-400 p-6 rounded shadow text-white mt-6">
                  <h3 className="font-semibold mb-4">🏆 Overall Evaluation Score</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-5xl font-bold">{performanceData.comprehensive.overallEvaluationScore}%</div>
                      <div className="text-sm opacity-80">Overall Score</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{performanceData.comprehensive.completedEvaluations}/{performanceData.comprehensive.totalEvaluations}</div>
                      <div className="text-sm opacity-80">Components</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{performanceData.encryption?.summary?.highestThroughput?.avgThroughputMBps || 'N/A'}</div>
                      <div className="text-sm opacity-80">Throughput MB/s</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{performanceData.signature?.summary?.accuracy || 'N/A'}</div>
                      <div className="text-sm opacity-80">Signature Accuracy</div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}

          {/* Users panel */}
          <section className="bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Users</h2>
              <div className="text-sm text-gray-500">{users.length} users</div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
              <input className="border rounded px-2 py-1" placeholder="Name" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})}/>
              <input className="border rounded px-2 py-1" placeholder="Email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})}/>
              <input type="password" className="border rounded px-2 py-1" placeholder="Password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})}/>
              <select className="border rounded px-2 py-1" value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <div className="md:col-span-2 flex gap-2">
                <button onClick={() => { if(!newUser.email || !newUser.password) return alert('email & password required'); addUser(newUser); setNewUser({name:'',email:'',password:'',role:'user'}); }} className="px-3 py-1 bg-blue-600 text-white rounded">Add User</button>
                <button onClick={()=>setNewUser({name:'',email:'',password:'',role:'user'})} className="px-3 py-1 bg-gray-100 rounded">Reset</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id || u.user_id} className="border-t">
                      <td className="py-2">{u.name || '-'}</td>
                      <td>{u.email || '-'}</td>
                      <td>{u.role || 'user'}</td>
                      <td>
                        <button className="text-sm text-red-600" onClick={()=>deleteUser(u.id || u.user_id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Logs panel */}
          <section className="bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Activity Logs</h2>
              <div className="text-sm text-gray-500">{logs.length} entries</div>
            </div>

            <div className="space-y-2 max-h-72 overflow-auto">
              {logs.slice(0,200).map((l, i) => (
                <div key={i} className="flex items-start justify-between bg-gray-50 p-2 rounded">
                  <div>
                    <div className="text-sm font-medium">{l.user_email || l.user || 'Unknown'}</div>
                    <div className="text-xs text-gray-600">{l.action || l.type || l.message || ''}</div>
                    <div className="text-xs text-gray-400">{new Date(l.timestamp || l.created_at || Date.now()).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-gray-500">{l.file_id ? `File:${l.file_id}` : ''}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Feedback panel */}
          <section className="bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">User Feedback</h2>
              <div className="text-sm text-gray-500">{feedbacks.length}</div>
            </div>

            <div className="space-y-3">
              {feedbacks.map(f => (
                <div key={f.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{f.user_email || f.email || 'User'}</div>
                      <div className="text-xs text-gray-600">{new Date(f.created_at || Date.now()).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-gray-500">{f.replied ? 'Replied' : 'New'}</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">{f.message || f.text}</div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={()=>{ const reply = prompt('Reply message'); if(reply) replyFeedback(f.id, reply); }} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Reply</button>
                  </div>
                </div>
              ))}
              {feedbacks.length === 0 && <div className="text-sm text-gray-400">No feedback yet.</div>}
            </div>
          </section>
        </div>

        {/* Right col: Notifications & summary */}
        <aside className="space-y-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Notifications</h3>
            <div className="space-y-2 max-h-96 overflow-auto">
              {notifications.length === 0 && <div className="text-sm text-gray-400">No notifications</div>}
              {notifications.map(n => (
                <div key={n.id} className="border rounded p-2 flex justify-between items-start">
                  <div>
                    <div className="text-sm">{n.text}</div>
                    <div className="text-xs text-gray-400">{n.severity || n.type}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button className="text-xs text-green-600" onClick={() => { clearNotification(n.id); }}>Resolve</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Summary</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Total users: <span className="font-medium">{users.length}</span></div>
              <div>Recent logs: <span className="font-medium">{logs.length}</span></div>
              <div>Feedback items: <span className="font-medium">{feedbacks.length}</span></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg text-gray-800">Evaluations</h3>
              <div className="flex gap-2">
                <button onClick={() => { fetchEvaluations(); fetchEvalStats(); }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">Refresh</button>
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-4 bg-blue-50 p-2 rounded">Showing recent evaluation metrics (timings in ms)</div>
            <div className="space-y-4">
              {/* Summary chart */}
              {evalSummary && (
                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <BarChart
                    title="Evaluation Summary"
                    yLabel="Value (ms)"
                    data={(Array.isArray(evalSummary.metrics) ? evalSummary.metrics : Object.entries(evalSummary || {}).map(([k,v])=>({ label:k, value: (typeof v === 'number' ? v : (v && (v.avg || v.value || v.count) ) ) || 0 }))).map(it=>({ label: it.label || it.key || it.metric_key, value: Number(it.value || it.avg || it.count || 0), color: '#3b82f6' }))}
                    maxHeight={200}
                  />
                </div>
              )}

              {/* Timeseries */}
              {evalTimeseries && evalTimeseries.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <LineChart
                    title="Metric Timeseries"
                    xLabel="Time"
                    yLabel="Value (ms)"
                    data={evalTimeseries.map(d => ({ label: d.date || d.ts || d.label || '', value: Number(d.value || d.v || d.metric_value || 0), color: '#10b981' }))}
                    maxHeight={200}
                  />
                </div>
              )}

              {/* Anomaly breakdown */}
              {anomalyStats && (Object.keys(anomalyStats).length > 0 || Array.isArray(anomalyStats) && anomalyStats.length > 0) && (
                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <PieChart
                    title="Anomaly Breakdown"
                    data={(Array.isArray(anomalyStats) ? anomalyStats : Object.entries(anomalyStats).map(([k,v])=>({ label:k, value: Number(v || 0) }))).map(it=>({ label: it.label, value: Number(it.value || 0) }))}
                    maxHeight={200}
                  />
                </div>
              )}

              <div className="max-h-64 overflow-auto text-sm border border-gray-200 rounded p-2 bg-gray-50">
                <div className="font-semibold mb-2 text-gray-700 sticky top-0 bg-gray-50 pb-2 border-b">Recent Evaluations</div>
                {evaluations.length === 0 && <div className="text-gray-400 text-center py-4">No evaluation data yet.</div>}
                {evaluations.slice(0,50).map(ev => (
                  <div key={ev.id} className="border-b border-gray-200 py-2 px-2 hover:bg-white transition-colors flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{ev.metric_key || 'N/A'}</div>
                      <div className="text-xs text-gray-500 mt-1">File: {ev.file_id || 'N/A'} • {new Date(ev.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-semibold text-blue-600">{ev.metric_value == null ? '-' : Number(ev.metric_value).toFixed(2)} ms</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Drilldown Modal */}
      {drilldownVisible && drilldownData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-lg max-w-3xl w-full max-h-96 overflow-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-400 text-white p-4 flex justify-between items-center">
              <h3 className="font-semibold">{drilldownData.feature_name} - Detailed Metrics</h3>
              <button 
                onClick={() => setDrilldownVisible(false)}
                className="text-white hover:bg-blue-500 px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4">
              {drilldownData.loading ? (
                <div className="text-center text-gray-500 py-8">Loading...</div>
              ) : drilldownData.error ? (
                <div className="text-center text-red-500 py-8">{drilldownData.error}</div>
              ) : drilldownData.rows && drilldownData.rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-3 py-2 text-left">Metric Key</th>
                        <th className="border px-3 py-2 text-left">Value</th>
                        <th className="border px-3 py-2 text-left">Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drilldownData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border px-3 py-2">{row.metric_key}</td>
                          <td className="border px-3 py-2 font-semibold">{typeof row.metric_value === 'number' ? Number(row.metric_value).toFixed(2) : row.metric_value}</td>
                          <td className="border px-3 py-2 text-xs text-gray-500">{new Date(row.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">No detailed metrics available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
