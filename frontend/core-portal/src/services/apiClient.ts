import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API base URLs from environment variables
export const API_URLS = {
  identity: import.meta.env.VITE_IDENTITY_SERVICE_URL || 'http://localhost:5006',
  metrics: import.meta.env.VITE_METRICS_SERVICE_URL || 'http://localhost:5008',
  knowledgeValidator: import.meta.env.VITE_KNOWLEDGE_VALIDATOR_SERVICE_URL || 'http://localhost:5005',
  partnerManagement: import.meta.env.VITE_PARTNER_MANAGEMENT_SERVICE_URL || 'http://localhost:5007',
};

export default apiClient;
