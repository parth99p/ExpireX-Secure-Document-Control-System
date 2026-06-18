import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
function LandingPage(){
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-100">
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-16 text-center shadow-lg rounded-b-3xl">
        <h1 className="text-6xl font-extrabold tracking-tight drop-shadow-lg">ExpireX</h1>
        <p className="mt-6 text-2xl font-light">Secure your documents with encryption, watermarking, and role-based access.</p>
        <div className="mt-8 flex justify-center gap-4">
          {!isLoggedIn ? (
            <>
              <Link to="/signup" className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl shadow hover:bg-blue-100 transition">Get Started</Link>
              <Link to="/login" className="border border-white px-8 py-3 rounded-xl shadow text-white hover:bg-white hover:text-blue-700 transition">Login</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl shadow hover:bg-blue-100 transition">Dashboard</Link>
              <Link to="/profile" className="border border-white px-8 py-3 rounded-xl shadow text-white hover:bg-white hover:text-blue-700 transition">Profile</Link>
            </>
          )}
        </div>
      </header>
      <main className="flex-1 p-8 flex flex-col items-center">
        <h2 className="text-4xl font-bold mb-8 text-blue-700">Features</h2>
        <div className="grid md:grid-cols-3 gap-8 w-full max-w-4xl">
          <div className="p-8 bg-white rounded-2xl shadow-lg flex flex-col items-center">
            <span className="text-5xl mb-4">🔒</span>
            <span className="text-lg font-semibold">Secure Storage</span>
            <p className="text-gray-500 mt-2 text-center">Your files are encrypted and protected with advanced security.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-lg flex flex-col items-center">
            <span className="text-5xl mb-4">👥</span>
            <span className="text-lg font-semibold">Role-based Access</span>
            <p className="text-gray-500 mt-2 text-center">Control who can view, edit, download, or share your documents.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-lg flex flex-col items-center">
            <span className="text-5xl mb-4">📊</span>
            <span className="text-lg font-semibold">Admin Dashboard</span>
            <p className="text-gray-500 mt-2 text-center">Monitor usage, manage users, and view logs in a beautiful dashboard.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LandingPage;
