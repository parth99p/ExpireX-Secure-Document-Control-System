import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import fileService from '../services/fileService';

function Viewer(){
  const { id } = useParams();
  const [passkey, setPasskey] = useState('');
  const [blobUrl, setBlobUrl] = useState('');
  const [contentType, setContentType] = useState('');
  const [error, setError] = useState('');

  const canEmbed = useMemo(() => {
    return contentType.startsWith('application/pdf') || contentType.startsWith('image/');
  }, [contentType]);

  const view = async (e) => {
    e.preventDefault();
    setError('');
    setBlobUrl('');
    try {
      const res = await fileService.viewFile(id, passkey);
      const ct = res.headers['content-type'] || '';
      setContentType(ct);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: ct }));
      setBlobUrl(url);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to view file');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4 flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-lg p-4 md:p-6 flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-blue-700">Secure Viewer</h2>
        <form onSubmit={view} className="flex flex-col md:flex-row gap-3 items-center">
          <input type="password" placeholder="Enter passkey" value={passkey} onChange={e=>setPasskey(e.target.value)} className="border p-2 rounded w-full md:w-72" />
          <button className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition">View</button>
        </form>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="w-full" style={{height:'70vh'}}>
          {blobUrl && canEmbed && contentType.startsWith('application/pdf') && (
            <iframe title="pdf-viewer" src={blobUrl} className="w-full h-full" style={{border:'none'}} />
          )}
          {blobUrl && canEmbed && contentType.startsWith('image/') && (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <img src={blobUrl} alt="preview" className="max-w-full max-h-full object-contain" />
            </div>
          )}
          {blobUrl && !canEmbed && (
            <div className="text-gray-700">This file type cannot be previewed. Please download from Downloads.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Viewer;


