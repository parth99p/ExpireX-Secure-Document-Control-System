import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:5000' });
export default {
  grant: (data)=> api.post('/access/grant', data, { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } }).then(r=>r.data),
  requestAccess: (data)=> api.post('/access/request', data, { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } }).then(r=>r.data),
  getPendingRequests: () => api.get('/access/requests/pending', { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } }).then(r=>r.data),
  respondToRequest: (requestId, decision) => api.post('/access/requests/respond', { requestId, decision }, { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } }).then(r=>r.data)
};
