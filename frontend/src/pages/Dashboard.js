import React, { useEffect, useState } from 'react';
import fileService from '../services/fileService';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import adminService from '../services/adminService';
function Dashboard(){
  const [file,setFile]=useState(null); const [files,setFiles]=useState([]);
  const [passkey, setPasskey] = useState('');
  const [user, setUser] = useState({ name: '' });
  const navigate=useNavigate();
  const fetch = async()=>{ try{ const res = await fileService.getMyFiles(); setFiles(res); }catch(e){ console.error(e); } };
  useEffect(()=>{ fetch(); },[]);
  useEffect(() => {
    (async () => {
      try {
        const res = await authService.getProfile();
        setUser(res);
      } catch (e) {
        const name = localStorage.getItem('userName') || localStorage.getItem('userEmail') || '';
        setUser({ name });
      }
    })();
  }, []);
  const upload=async(e)=>{ 
    e.preventDefault(); 
    if(!file) return alert('Select file'); 
    if(!passkey) return alert('Enter passkey'); 
    try{
      const t0=performance.now();
      const res=await fileService.uploadFile(file, passkey);
      const clientMs=performance.now()-t0;
      
      // Send client-side metric to admin API
      try{
        const token=localStorage.getItem('token');
        if(token && res.fileId){
          await adminService.sendClientMetric(res.fileId, clientMs, { filename: file.name, size: file.size }, token);
        }
      }catch(me){
        console.warn('Could not send client metric',me);
      }
      
      alert('Uploaded'); 
      setPasskey(''); 
      setFile(null); 
      (e.target.reset && e.target.reset()); 
      fetch(); 
    }catch(e){ 
      alert(e?.response?.data?.error || 'Upload failed'); 
    } 
  };
  return (
  <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-100 px-6 py-10">
    
    {/* Welcome Card */}
    <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl p-8 mb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-700">
            Welcome back, {user.name || 'User'} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Manage, protect, and control your documents with <b>ExpireX</b>
          </p>
        </div>
        <Link to="/profile">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-2xl shadow">
            👤
          </div>
        </Link>
      </div>
    </div>

    {/* Upload Section */}
    <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-lg p-8 mb-10">
      <h2 className="text-2xl font-bold text-indigo-700 mb-6">
        📤 Upload a New File
      </h2>

      <form
        onSubmit={upload}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center"
      >
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="border border-gray-300 rounded-xl p-3 w-full"
        />

        <input
          type="password"
          placeholder="Encryption Passkey"
          value={passkey}
          onChange={(e) => setPasskey(e.target.value)}
          className="border border-gray-300 rounded-xl p-3 w-full"
        />

        <button
          className="bg-indigo-600 text-white py-3 rounded-xl font-semibold shadow hover:bg-indigo-700 transition"
        >
          Upload Securely
        </button>
      </form>
    </div>

    {/* Files Table */}
    <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        📁 My Files
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-indigo-50 text-indigo-700">
              <th className="py-4 px-4 text-left font-semibold">ID</th>
              <th className="py-4 px-4 text-left font-semibold">File Name</th>
              <th className="py-4 px-4 text-left font-semibold">Uploaded</th>
              <th className="py-4 px-4 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 && (
              <tr>
                <td colSpan="4" className="py-6 text-center text-gray-400">
                  No files uploaded yet
                </td>
              </tr>
            )}

            {files.map((f) => (
              <tr
                key={f.id}
                className="border-t hover:bg-indigo-50 transition"
              >
                <td className="py-3 px-4">{f.id}</td>
                <td className="py-3 px-4 font-medium">
                  {f.originalname}
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {new Date(f.uploaded_at).toLocaleString()}
                </td>
                <td className="py-3 px-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate('/view/' + f.id)}
                    className="bg-indigo-500 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-600 transition"
                  >
                    View
                  </button>
                  <button
                    onClick={() => navigate('/grant-access/' + f.id)}
                    className="bg-green-500 text-white px-4 py-1.5 rounded-lg hover:bg-green-600 transition"
                  >
                    Grant
                  </button>
                  <button
                    onClick={async () => {
                      await fileService.deleteFile(f.id);
                      fetch();
                    }}
                    className="bg-red-500 text-white px-4 py-1.5 rounded-lg hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
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
export default Dashboard;
