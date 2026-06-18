import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import axios from 'axios';

const Feedback = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const profile = await authService.getProfile();
        setEmail(profile.email);
      } catch (e) {
        setEmail('');
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setStatus('');
    try {
      await axios.post('http://localhost:5000/feedback', { email, message });
      setStatus('Thank you for your feedback!');
      setMessage('');
    } catch (e) {
      setStatus('Failed to send feedback.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex flex-col items-center p-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-blue-700">Feedback</h1>
        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Your Email</label>
            <input type="email" value={email} disabled className="w-full p-3 border rounded-lg bg-gray-100" />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Your Feedback</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Type your feedback here..." />
          </div>
          <button className="bg-purple-600 text-white px-6 py-3 rounded-lg shadow hover:bg-purple-700 transition w-full">Submit Feedback</button>
        </form>
        {status && <p className="mt-4 text-center text-green-600 font-semibold">{status}</p>}
      </div>
    </div>
  );
};

export default Feedback;
