import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import '../styles/Login.css';

const Register = () => {
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', confirm: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.username || !form.email || !form.password) {
      setFormError('Username, email and password are required.');
      return;
    }
    if (form.password !== form.confirm) {
      setFormError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.register(form.username, form.password, form.email, form.full_name);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Create account</h1>
          <p>Join and start making video calls</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {formError && (
            <div className="error-message">
              <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input type="text" id="username" value={form.username}
              onChange={set('username')} placeholder="Choose a username"
              disabled={isLoading} autoComplete="username" />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input type="email" id="email" value={form.email}
              onChange={set('email')} placeholder="you@example.com"
              disabled={isLoading} autoComplete="email" />
          </div>

          <div className="form-group">
            <label htmlFor="full_name">Full name</label>
            <input type="text" id="full_name" value={form.full_name}
              onChange={set('full_name')} placeholder="Optional"
              disabled={isLoading} autoComplete="name" />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input type="password" id="password" value={form.password}
              onChange={set('password')} placeholder="At least 6 characters"
              disabled={isLoading} autoComplete="new-password" />
          </div>

          <div className="form-group">
            <label htmlFor="confirm">Confirm password *</label>
            <input type="password" id="confirm" value={form.confirm}
              onChange={set('confirm')} placeholder="Repeat your password"
              disabled={isLoading} autoComplete="new-password" />
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? <><span className="spinner" /> Creating account…</> : 'Create account'}
          </button>
        </form>

        <div className="login-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
