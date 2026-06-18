import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
function Signup(){
  const [form,setForm]=useState({name:'',email:'',password:'',confirm:''}); const [err,setErr]=useState(''); const navigate=useNavigate();
  const submit=async(e)=>{ e.preventDefault(); if(form.password!==form.confirm){ setErr('Passwords do not match'); return; } try{ await authService.register({name:form.name,email:form.email,password:form.password}); alert('Registered. Please login'); navigate('/login'); }catch(e){ setErr('Register failed'); } };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-500 to-blue-600">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Sign Up</h2>
        {err && <p className="text-red-500">{err}</p>}
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full p-2 border rounded"/>
          <input required placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full p-2 border rounded"/>
          <input required placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="w-full p-2 border rounded"/>
          <input required placeholder="Confirm Password" type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} className="w-full p-2 border rounded"/>
          <button className="w-full bg-purple-600 text-white p-2 rounded">Register</button>
        </form>
      </div>
    </div>
  );
}
export default Signup;
