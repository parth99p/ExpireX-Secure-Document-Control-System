import React, { useEffect, useState } from 'react';
import logService from '../services/logService';
function UserLogs(){
  const [logs,setLogs]=useState([]);
  useEffect(()=>{ (async()=>{ try{ const res=await logService.getUserLogs(); setLogs(res); }catch(e){ console.error(e); } })(); },[]);
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Activity Logs</h2>
      <table className="w-full bg-white"><thead><tr><th>ID</th><th>Action</th><th>File</th><th>Status</th><th>Time</th></tr></thead>
      <tbody>{logs.map(l=>(
        <tr key={l.id} className="border-t"><td className="p-2">{l.id}</td><td className="p-2">{l.action}</td><td className="p-2">{l.file_id}</td><td className="p-2">{l.status}</td><td className="p-2">{new Date(l.timestamp).toLocaleString()}</td></tr>
      ))}</tbody></table>
    </div>
  );
}
export default UserLogs;
