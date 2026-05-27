import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { axiosClient } from './axiosClient';

export type AxiosBaseQueryArgs = {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: AxiosRequestConfig['data'];
  params?: AxiosRequestConfig['params'];
  headers?: AxiosRequestConfig['headers'];
};

export type AxiosBaseQueryError = {
  status?: number;
  data?: {
    error?: {
      code?: string;
      message?: string;
      details?: Record<string, unknown> & {
        expiredTime?: string;
      };
      path?: string;
      timestamp?: string;
    };
    [key: string]: unknown;
  };
  message?: string;
};

export const axiosBaseQuery =
  (): BaseQueryFn<AxiosBaseQueryArgs, unknown, AxiosBaseQueryError> =>
  async (args, api) => {
    // ✅ 使用 api.signal 讓 RTK Query 能 cancel request
    // Axios v1 支援 signal
    const controller = new AbortController();
    const abort = () => controller.abort();

    // 若 RTK Query 取消，跟著取消 axios
    api.signal.addEventListener('abort', abort);

    try {
      const result = await axiosClient.request({
        url: args.url,
        method: args.method ?? 'GET',
        data: args.data,
        params: args.params,
        headers: {
          ...(args.headers ?? {}),
          //   ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });

      return {
        data: result.data,
      };
    } catch (e) {
      const err = e as AxiosError<AxiosBaseQueryError['data']>;
      // 取消請求時（被 abort）
      if (axios.isCancel(err) || err.name === 'CanceledError') {
        return {
          error: {
            status: 499, // client closed request（慣用碼，純自訂）
            message: 'Request cancelled',
          },
        };
      }

      return {
        error: {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        },
      };
    } finally {
      // ✅ 清理 listener，避免 memory leak
      api.signal.removeEventListener('abort', abort);
    }
  };
