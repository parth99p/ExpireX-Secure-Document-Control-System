import React, { useEffect, useState } from 'react';
import fileService from '../services/fileService';
function DownloadManager(){
  const [files,setFiles]=useState([]);
  const [passkeyById, setPasskeyById] = useState({});

  useEffect(()=>{ (async()=>{ try{ const res = await fileService.getSharedFiles(); setFiles(res); }catch(e){ console.error(e); } })(); },[]);
  const download=async(id)=>{
    try{
      let passkey = passkeyById[id] || '';
      if(!passkey){
        const entered = window.prompt('Enter passkey to decrypt and download:');
        if(!entered) return; // user cancelled or empty
        passkey = entered;
        setPasskeyById(prev => ({ ...prev, [id]: entered }));
      }
      const coords = await new Promise(resolve => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
      await fileService.downloadWithPasskey(id, passkey, coords);
    }catch(e){
      try{
        // Axios may give a Blob for error responses with responseType:'blob'
        if(e?.response?.data instanceof Blob){
          const text = await e.response.data.text();
          try{
            const json = JSON.parse(text);
            alert(json.error || 'Failed');
          }catch{
            alert(text || 'Failed');
          }
        } else {
          alert(e?.response?.data?.error || e?.message || 'Failed');
        }
      }catch{
        alert('Failed');
      }
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex flex-col items-center p-8">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl p-8">
        <div className="mb-2">
          <h2 className="text-3xl font-extrabold text-blue-700 tracking-tight">Files Shared With Me</h2>
          <p className="text-gray-600 text-sm mt-1">Preview documents in-app or download if your access allows it.</p>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full bg-white">
            <thead className="bg-blue-50">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-gray-700 whitespace-nowrap w-24">File ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Name</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Owner</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700 whitespace-nowrap w-28">Access</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700 w-[360px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {files.map(f => (
                <tr key={f.file_id} className="hover:bg-blue-50/50 transition">
                  <td className="py-3 px-4 align-top">{f.file_id}</td>
                  <td className="py-3 px-4 align-top break-all">{f.originalname}</td>
                  <td className="py-3 px-4 align-top break-all">{f.owner_email}</td>
                  <td className="py-3 px-4 align-top"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{f.role}</span></td>
                  <td className="py-3 px-4 align-top">
                    {(f.role === 'download' || f.role === 'share') ? (
                      <div className="flex flex-wrap gap-2 items-center">
                        <input type="password" placeholder="Passkey" value={passkeyById[f.file_id]||''} onChange={e=>setPasskeyById({...passkeyById,[f.file_id]:e.target.value})} className="border border-gray-300 p-2 rounded-lg text-sm" />
                        <button onClick={() => window.open(`/view/${f.file_id}`, '_blank')} className="bg-indigo-500 text-white px-3 py-1.5 rounded-lg shadow hover:bg-indigo-600 transition text-sm">View</button>
                        <button onClick={() => download(f.file_id)} className="bg-green-500 text-white px-3 py-1.5 rounded-lg shadow hover:bg-green-600 transition text-sm">Download</button>
                        {f.role === 'share' && (
                          <button onClick={() => navigator.clipboard.writeText(window.location.origin+`/view/${f.file_id}`)} className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg shadow hover:bg-yellow-600 transition text-sm">Share Link</button>
                        )}
                      </div>
                    ) : f.role === 'read' ? (
                      <div className="flex flex-wrap gap-2 items-center">
                        <input type="password" placeholder="Passkey" value={passkeyById[f.file_id]||''} onChange={e=>setPasskeyById({...passkeyById,[f.file_id]:e.target.value})} className="border border-gray-300 p-2 rounded-lg text-sm" />
                        <button onClick={() => window.open(`/view/${f.file_id}`,'_blank')} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg shadow hover:bg-blue-600 transition text-sm">View</button>
                      </div>
                    ) : (
                      <span className="text-gray-400">Not allowed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default DownloadManager;
