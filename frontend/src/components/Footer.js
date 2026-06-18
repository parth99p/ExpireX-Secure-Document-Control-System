import React from 'react';
import { Link } from 'react-router-dom';
function Footer(){ return (
  <footer className="bg-gray-900 text-gray-300 py-6 mt-10">
    <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
      <h2 className="text-lg font-bold text-white">ExpireX</h2>
      <nav className="space-x-6 mt-4 md:mt-0">
        <Link to="/" className="hover:text-white">Home</Link>
        <Link to="/contact" className="hover:text-white">Contact Us</Link>
        <Link to="/feedback" className="hover:text-white">Feedback</Link>
      </nav>
      <p className="mt-4 md:mt-0 text-sm text-gray-400">&copy; {new Date().getFullYear()} ExpireX. </p>
    </div>
  </footer>
);}
export default Footer;
