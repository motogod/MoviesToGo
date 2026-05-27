import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { store } from '@/store';
// import {
//   clearActiveSession,
//   clearTokens,
//   setAccessToken,
// } from "src/store/slice/userSlice";
// http://api.moviestogo.app
const BASE_URL = 'https://api.moviestogo.app/api/';
// const BASE_URL = 'http://139.180.159.47:8000/api/';
// const BASE_URL = 'http://127.0.0.1:8000/api/';
export const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// ------------------------------
// Request: attach access token (except auth endpoints)
// ------------------------------
axiosClient.interceptors.request.use(config => {
  return config;
});

// ------------------------------
// Refresh control (queue)
// ------------------------------
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function resolveQueue(token: string | null) {
  pendingQueue.forEach(cb => cb(token));
  pendingQueue = [];
}

// 用「乾淨的 axios」呼叫 refresh（避免被同一組 interceptors 影響）
const refreshClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// ------------------------------
// Response: refresh on 401 then retry
// ------------------------------
axiosClient.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    // 沒 response：網路錯誤、timeout、DNS、CORS 等
    if (!error.response) return Promise.reject(error);

    const status = error.response.status;
    const originalRequest = error.config as RetriableRequestConfig;

    const url = originalRequest?.url ?? '';
    const isAuthEndpoint = ['users/login', 'users/refresh'].some(p =>
      url.includes(p),
    );

    // ✅ 不是 401 或者本來就是 auth endpoint -> 不做 refresh
    if (status !== 401 || isAuthEndpoint) {
      return Promise.reject(error);
    }

    // ✅ 避免無限 retry
    if (originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    // ✅ 如果正在 refresh，把 request 掛起來等
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push(newToken => {
          if (!newToken) {
            reject(error);
            return;
          }

          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(axiosClient(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      return axiosClient(originalRequest);
    } catch (e) {
      // refresh 失敗：清 token，讓使用者重新登入
      resolveQueue(null);
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  },
);
