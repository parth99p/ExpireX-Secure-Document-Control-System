import React, { useEffect, useState } from 'react';
import accessService from '../services/accessService';
function PendingRequests(){
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = async ()=>{
    setLoading(true);
    try{ const res = await accessService.getPendingRequests(); setRequests(res); }catch(e){ setRequests([]); }
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);
  const respond = async (id, decision) => {
    await accessService.respondToRequest(id, decision);
    setRequests(reqs => reqs.filter(r => r.id !== id));
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex flex-col items-center p-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-3xl font-bold mb-6 text-blue-700">Pending Access Requests</h2>
        {loading ? <div>Loading...</div> : requests.length === 0 ? <div>No pending requests</div> : (
        <table className="min-w-full bg-white border rounded-lg mb-8">
          <thead className="bg-blue-100">
            <tr>
              <th className="py-2 px-2">FileID</th>
              <th className="py-2 px-2">Requester</th>
              <th className="py-2 px-2">Role</th>
              <th className="py-2 px-2">Msg</th>
              <th className="py-2 px-2">Expiry</th>
              <th className="py-2 px-2">Loc/Radius</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-2 py-1">{r.file_id}</td>
                <td className="px-2 py-1">{r.requester_email}</td>
                <td className="px-2 py-1">{r.role}</td>
                <td className="px-2 py-1 text-xs">{r.message}</td>
                <td className="px-2 py-1 text-xs">{r.expiry_time ? new Date(r.expiry_time).toLocaleString() : '-'}</td>
                <td className="px-2 py-1 text-xs">{r.geo_lat?`${r.geo_lat},${r.geo_lon}`:'-'}<br/>Radius: {r.geo_radius_m||'-'}m</td>
                <td className="px-2 py-1 flex gap-1">
                  <button onClick={()=>respond(r.id,'approved')} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">Approve</button>
                  <button onClick={()=>respond(r.id,'denied')} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Deny</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
export default PendingRequests;










