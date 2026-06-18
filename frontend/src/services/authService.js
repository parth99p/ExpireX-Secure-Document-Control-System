import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:5000' });

export default {
  register: (data)=> api.post('/auth/register', data).then(r=>r.data),
  login: (email,password)=> api.post('/auth/login', { email, password }).then(r=>r.data),
  getProfile: ()=> api.get('/auth/profile', { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } }).then(r=>r.data),
  updateProfile: (data)=> api.put('/auth/profile', data, { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } }).then(r=>r.data)
};
