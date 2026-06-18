import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import GrantAccess from './pages/GrantAccess';
import RequestAccess from './pages/RequestAccess';
import AdminDashboard from './pages/AdminDashboard';
import ContactUs from './pages/ContactUs';
import Feedback from './pages/Feedback';
import Profile from './pages/Profile';
import DownloadManager from './pages/DownloadManager';
import UserLogs from './pages/UserLogs';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Viewer from './pages/Viewer';
import PendingRequests from './pages/PendingRequests';

function App(){
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/signup" element={<Signup/>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
        <Route path="/grant-access/:fileId" element={<ProtectedRoute><GrantAccess/></ProtectedRoute>} />
        <Route path="/request-access" element={<ProtectedRoute><RequestAccess/></ProtectedRoute>} />
        <Route path="/downloads" element={<ProtectedRoute><DownloadManager/></ProtectedRoute>} />
        <Route path="/pending-requests" element={<ProtectedRoute><PendingRequests/></ProtectedRoute>} />
        <Route path="/view/:id" element={<ProtectedRoute><Viewer/></ProtectedRoute>} />
        <Route path="/logs" element={<ProtectedRoute><UserLogs/></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile/></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard/></ProtectedRoute>} />
        <Route path="/contact" element={<ContactUs/>} />
        <Route path="/feedback" element={<Feedback/>} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
