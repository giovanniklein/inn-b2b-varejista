import axios from 'axios';

import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

let isRefreshing = false;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('pinn_varejista_access_token');

  // Controle de loader global
  useUiStore.getState().increment();

  if (accessToken && config.headers) {
    // JWT sempre enviado; backend extrai varejista_id do payload
    // para aplicar multi-tenant automaticamente
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Finaliza loader global em respostas de sucesso
    useUiStore.getState().decrement();
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Finaliza loader global em erros
    useUiStore.getState().decrement();

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('pinn_varejista_refresh_token');
      if (!refreshToken) {
        isRefreshing = false;

        // Sem refresh token, encerramos sessão imediatamente
        useAuthStore.getState().clearSession();
        window.location.href = '/login';

        return Promise.reject(error);
      }

      try {
        const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });

        localStorage.setItem('pinn_varejista_access_token', data.access_token);
        localStorage.setItem('pinn_varejista_refresh_token', data.refresh_token);

        api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
        processQueue(null, data.access_token);

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;

        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);

        // Falha ao renovar token -> limpar sessão e voltar para login
        useAuthStore.getState().clearSession();
        window.location.href = '/login';

        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
