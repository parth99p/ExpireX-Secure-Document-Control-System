import React from 'react';

const ContactUs = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex flex-col items-center p-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-blue-700">Contact Us</h1>
        <div className="mb-4">
          <p className="text-lg text-gray-700">For any queries, support, or feedback, reach out to us:</p>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Email:</span> <a href="mailto:support@docguard.com" className="text-blue-600 underline">support@expirex.com</a>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Phone:</span> <span className="text-gray-700">+91 9226040105</span>
        </div>
        <div className="mt-6">
          <p className="text-gray-500"></p>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
