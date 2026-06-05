import axios from 'axios';

// Detección dinámica del host para permitir acceso local (localhost) y remoto (IP de red)
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return `http://${host}:4000/api/`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:4000/api/';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
});

// Interceptor para inyectar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
