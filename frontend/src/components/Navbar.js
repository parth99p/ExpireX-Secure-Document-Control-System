import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
function Navbar(){
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const [userName, setUserName] = useState('');
  // Try to get display name from localStorage, fallback to email
  useEffect(() => {
    let name = localStorage.getItem('userName') || localStorage.getItem('userEmail') || '';
    setUserName(name);
    // Optionally, get fresh name from backend here if needed
  }, []);
  const navigate = useNavigate();
  const logout = ()=>{ localStorage.clear(); navigate('/login'); };
  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold text-blue-600"><Link to="/">ExpireX</Link></h1>
      <nav className="space-x-4 flex items-center">
        <Link to="/">Home</Link>
        {!token && <>
          <Link to="/login">Login</Link>
          <Link to="/signup">Register</Link>
        </>}
        {token && role==='user' && <>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/downloads">My Downloads</Link>
          <Link to="/request-access">Request Access</Link>
          <Link to="/pending-requests">Pending Requests</Link>
          <Link to="/logs">My Logs</Link>
        </>}
        {token && role==='admin' && <Link to="/admin">Admin</Link>}
        <Link to="/contact">Contact</Link>
        <Link to="/feedback">Feedback</Link>
        {token && (
          <>
            <span className="flex items-center ml-4">
              <Link to="/profile" title="Profile">
                <span className="inline-flex items-center justify-center bg-blue-100 rounded-full w-9 h-9 text-xl font-bold text-blue-600 shadow">
                  <span role="img" aria-label="profile">👤</span>
                </span>
              </Link>
            </span>
            <button onClick={logout} className="bg-red-500 text-white px-3 py-1 rounded ml-3">Logout</button>
          </>
        )}
      </nav>
    </header>
  );
}
export default Navbar;
