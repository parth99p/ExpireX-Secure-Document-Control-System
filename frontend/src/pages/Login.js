import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
function Login(){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [err,setErr]=useState('');
  const navigate=useNavigate();
  const handle = async(e)=>{ e.preventDefault(); try{ const res = await authService.login(email,password); localStorage.setItem('token', res.token); localStorage.setItem('role', res.role); localStorage.setItem('userEmail', res.email); navigate('/dashboard'); }catch(err){ setErr('Login failed'); } };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-400 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
        {err && <p className="text-red-500">{err}</p>}
        <form onSubmit={handle} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-2 border rounded" required/>
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-2 border rounded" required/>
          <button className="w-full bg-blue-600 text-white p-2 rounded">Login</button>
        </form>
      </div>
    </div>
  );
}
export default Login;
