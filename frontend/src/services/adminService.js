import axios from 'axios';
// Prefer an explicit REACT_APP_API_BASE during development. If not set, default to localhost:5000
const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
const api = axios.create({ baseURL: BASE });

const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

export default {
  // User management
  getUsers: (token) => api.get('/auth/users', getAuthHeaders(token)).then(r => r.data),
  deleteUser: (id, token) => api.delete(`/auth/users/${id}`, getAuthHeaders(token)).then(r => r.data),
  createUser: (userData, token) => api.post('/auth/register', userData, getAuthHeaders(token)).then(r => r.data),
  
  // Logs
  getLogs: (token) => api.get('/logs/all', getAuthHeaders(token)).then(r => r.data),
  
  // Storage management
  getStorageMode: (token) => api.get('/admin/storage-mode', getAuthHeaders(token)).then(r => r.data),
  setStorageMode: (mode, token) => api.post('/admin/storage-mode', { mode }, getAuthHeaders(token)).then(r => r.data),
  getStorageStats: (token) => api.get('/admin/storage-stats', getAuthHeaders(token)).then(r => r.data),
  migrateStorage: (targetMode, token) => api.post('/admin/migrate-storage', { targetMode }, getAuthHeaders(token)).then(r => r.data),
  
  // Feedback (if available)
  getFeedbacks: (token) => api.get('/feedback', getAuthHeaders(token)).then(r => r.data).catch(() => []),
  replyFeedback: (id, message, token) => api.post(`/feedback/${id}/reply`, { message }, getAuthHeaders(token)).then(r => r.data)
  ,
  // Evaluations and metrics
  getEvaluations: (token) => api.get('/admin/evaluations', getAuthHeaders(token)).then(r => r.data),
  sendClientMetric: (file_id, client_ms, meta, token) => api.post('/admin/evaluations/client', { file_id, client_ms, meta }, getAuthHeaders(token)).then(r => r.data)
  ,
  // Evaluation stats for visualization
  getEvaluationSummary: (token) => api.get('/admin/evaluations/stats/summary', getAuthHeaders(token)).then(r => r.data),
  getEvaluationTimeseries: (metric, days = 7, token) => api.get(`/admin/evaluations/stats/timeseries/${encodeURIComponent(metric)}`, { params: { days }, ...getAuthHeaders(token) }).then(r => r.data),
  getAnomalyStats: (token) => api.get('/admin/evaluations/stats/anomaly', getAuthHeaders(token)).then(r => r.data)
  ,
  // Feature-specific metrics
  getEncryptionMetrics: (token) => api.get('/admin/metrics/encryption', getAuthHeaders(token)).then(r => r.data).catch(() => null),
  getGeofencingMetrics: (token) => api.get('/admin/metrics/geofencing', getAuthHeaders(token)).then(r => r.data).catch(() => null),
  getWatermarkingMetrics: (token) => api.get('/admin/metrics/watermarking', getAuthHeaders(token)).then(r => r.data).catch(() => null),
  getSignatureMetrics: (token) => api.get('/admin/metrics/signature', getAuthHeaders(token)).then(r => r.data).catch(() => null),
  getHealthScore: (token) => api.get('/admin/metrics/health', getAuthHeaders(token)).then(r => r.data).catch(() => null)
  ,
  // trigger server-side evaluation scripts (encryption, signature, watermark, access_control, anomaly, report)
  runEvaluation: (scriptKey, token) => api.post(`/admin/evaluations/run/${encodeURIComponent(scriptKey)}`, {}, getAuthHeaders(token)).then(r => r.data)
};
