import React, { useEffect, useState } from 'react';
import authService from '../services/authService';
function Profile(){
  const [profile,setProfile]=useState({name:'',email:''}); const [password,setPassword]=useState('');
  useEffect(()=>{ (async()=>{ try{ const res = await authService.getProfile(); setProfile(res); }catch(e){ console.error(e); } })(); },[]);
  const submit=async(e)=>{ e.preventDefault(); try{ await authService.updateProfile({name:profile.name,password}); alert('Updated'); setPassword(''); }catch(e){ alert('Failed'); } };
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Profile</h2>
      <form onSubmit={submit} className="space-y-3">
        <input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} className="w-full p-2 border rounded"/>
        <input value={profile.email} disabled className="w-full p-2 border bg-gray-100"/>
        <input placeholder="New password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-2 border rounded"/>
        <button className="bg-purple-600 text-white px-4 py-2 rounded">Save</button>
      </form>
    </div>
  );
}
export default Profile;
