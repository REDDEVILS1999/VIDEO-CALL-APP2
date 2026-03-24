import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user and token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      setError(null);
      setLoading(true);

      // Call the login API
      const response = await authAPI.login(username, password);

      // FastAPI typically returns: { access_token: "...", token_type: "bearer" }
      const accessToken = response.access_token;

      // Store token
      localStorage.setItem('token', accessToken);
      setToken(accessToken);

      // Optionally fetch user details
      try {
        const userData = await authAPI.getCurrentUser();
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } catch (err) {
        // If fetching user fails, just store basic info
        const basicUser = { username };
        localStorage.setItem('user', JSON.stringify(basicUser));
        setUser(basicUser);
      }

      setLoading(false);
      return { success: true };
    } catch (err) {
      setLoading(false);
      let errorMessage = 'Login failed. Please check your credentials.';

      if (err.response?.data) {
        // Handle FastAPI validation errors
        if (err.response.data.detail) {
          if (typeof err.response.data.detail === 'string') {
            errorMessage = err.response.data.detail;
          } else if (Array.isArray(err.response.data.detail)) {
            // Handle array of validation errors
            errorMessage = err.response.data.detail.map(error => error.msg).join(', ');
          } else if (err.response.data.detail.msg) {
            // Handle single validation error object
            errorMessage = err.response.data.detail.msg;
          }
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!token;
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
