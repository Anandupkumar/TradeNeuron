import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { useIdentityStore } from '../store/identity.store';
import { logger } from '../utils/logger';
import type { ApiEnvelope } from '../types/api.types';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const { apiKey, userId } = useIdentityStore.getState();
  config.headers['X-API-Key'] = apiKey;
  config.headers['X-User-Id'] = userId;
  logger.debug('[API] -->', config.method?.toUpperCase(), config.url);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const envelope = response.data as ApiEnvelope<unknown>;
    if (envelope.success === false) {
      return Promise.reject(new Error(envelope.error ?? 'Unknown error'));
    }
    logger.debug('[API] <--', response.status, response.config.url);
    return envelope.data as never;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('tn:auth-failure'));
    }
    const message =
      (error.response?.data as ApiEnvelope<never>)?.error ?? error.message ?? 'Unknown error';
    logger.error('[API] ERROR', error.response?.status, message);
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
