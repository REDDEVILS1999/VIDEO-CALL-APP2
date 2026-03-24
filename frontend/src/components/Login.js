import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Use `token` directly (stable value) instead of isAuthenticated() (new fn every render)
  const { login, error, token, setError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

  useEffect(() => () => setError(null), [setError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setIsLoading(true);
    const result = await login(username, password);
    setIsLoading(false);
    if (result.success) navigate('/dashboard', { replace: true });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome back</h1>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <Link to="/register">Create one</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
