import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import VideoCall from './VideoCall';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [postData, setPostData] = useState('{\n  "message": "Hello!"\n}');
  const [getData, setGetData] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [postSuccess, setPostSuccess] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePostRequest = async () => {
    setApiError(null);
    setPostSuccess(false);
    let jsonData;
    try {
      jsonData = JSON.parse(postData);
    } catch {
      setApiError('Invalid JSON — please fix the syntax and try again.');
      return;
    }
    setApiLoading(true);
    try {
      await authAPI.postTestData(jsonData);
      setPostSuccess(true);
    } catch (error) {
      setApiError(error.response?.data?.detail || 'Request failed');
    } finally {
      setApiLoading(false);
    }
  };

  const handleGetRequest = async () => {
    setApiError(null);
    setApiLoading(true);
    try {
      const response = await authAPI.getTestData();
      setGetData(response.data);
    } catch (error) {
      setApiError(error.response?.data?.detail || 'Request failed');
      setGetData(null);
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {showVideoCall && (
        <VideoCall token={token} onClose={() => setShowVideoCall(false)} />
      )}

      <nav className="dashboard-nav">
        <div className="nav-content">
          <h2 className="nav-title">Dashboard</h2>
          <div className="nav-actions">
            <button className="video-call-btn" onClick={() => setShowVideoCall(true)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              Video Call
            </button>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        {/* Welcome */}
        <div className="welcome-card">
          <h1>Welcome, {user?.full_name || user?.username || 'User'}!</h1>
          <p>You're signed in and ready to go.</p>
        </div>

        {/* User info */}
        <div className="info-card">
          <h3>Account</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Username</span>
              <span className="info-value">{user?.username || '—'}</span>
            </div>
            {user?.email && (
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{user.email}</span>
              </div>
            )}
            {user?.full_name && (
              <div className="info-item">
                <span className="info-label">Name</span>
                <span className="info-value">{user.full_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Video call promo */}
        <div className="video-card">
          <div className="video-card-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <div className="video-card-text">
            <h3>Start a Video Call</h3>
            <p>Connect with anyone — share a room ID and call peer-to-peer via WebRTC.</p>
          </div>
          <button className="video-card-btn" onClick={() => setShowVideoCall(true)}>
            Start Call
          </button>
        </div>

        {/* API tester */}
        <div className="api-card">
          <h3>API Tester</h3>
          <p>Test authenticated POST and GET requests to the backend.</p>

          {apiError && <div className="api-error">{apiError}</div>}
          {postSuccess && <div className="api-success">Data stored successfully.</div>}

          <div className="api-section">
            <h4>POST /test-data</h4>
            <textarea
              className="api-textarea"
              value={postData}
              onChange={e => setPostData(e.target.value)}
              rows={5}
            />
            <button className="api-btn api-btn--post" onClick={handlePostRequest} disabled={apiLoading}>
              {apiLoading ? 'Sending…' : 'POST'}
            </button>
          </div>

          <div className="api-section">
            <h4>GET /test-data</h4>
            <button className="api-btn api-btn--get" onClick={handleGetRequest} disabled={apiLoading}>
              {apiLoading ? 'Loading…' : 'GET'}
            </button>
            {getData && (
              <pre className="api-response">{JSON.stringify(getData, null, 2)}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
