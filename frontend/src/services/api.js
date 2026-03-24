import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (username, password, email, full_name) =>
    api.post('/register', { username, password, email, full_name }).then(r => r.data),

  login: (username, password) => {
    const body = new URLSearchParams({ username, password });
    return axios.post(`${API_BASE_URL}/token`, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).then(r => r.data);
  },

  getCurrentUser: () => api.get('/users/me').then(r => r.data),

  logout: () => api.post('/auth/logout').catch(() => {}),

  postTestData: (data) => api.post('/test-data', data).then(r => r.data),

  getTestData: () => api.get('/test-data').then(r => r.data),
};

export default api;
