import axios, { AxiosError } from 'axios';
import { auth } from '../config/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Inject Firebase ID Token
apiClient.interceptors.request.use(
  async (config) => {
    let token: string | null = null;
    try {
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
    } catch {
      // fallback to stored token
    }

    if (!token) {
      token = localStorage.getItem('crm_token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401/403 and format errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; details?: Record<string, string> }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      try {
        auth.signOut();
      } catch {
        // ignore
      }
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const resData = error.response?.data;
    if (resData?.message) {
      return resData.message;
    }
    if (resData?.details) {
      return Object.values(resData.details).join(', ');
    }
    return error.message || 'Network error occurred. Please verify backend is running.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
