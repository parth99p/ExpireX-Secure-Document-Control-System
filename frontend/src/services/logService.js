import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:5000' });
export default {
  getUserLogs: ()=> api.get('/logs/me', { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } }).then(r=>r.data)
};
