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

function isApiEnvelope(data: unknown): data is ApiEnvelope<unknown> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    'data' in data &&
    'error' in data
  );
}

apiClient.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') {
      logger.debug('[API] <--', response.status, response.config.url);
      return response.data as never;
    }

    if (typeof response.data === 'string' || !isApiEnvelope(response.data)) {
      logger.error('[API] Unexpected response format (likely 404 HTML fallback).');
      return Promise.reject(new Error('Invalid API response format. Check API URL and server status.'));
    }

    const envelope = response.data;
    if (envelope.success === false) {
      return Promise.reject(new Error(envelope.error ?? 'Unknown error'));
    }

    if (envelope.data == null) {
      logger.error('[API] Missing response payload', response.config.url);
      return Promise.reject(new Error('API returned an empty success payload.'));
    }

    logger.debug('[API] <--', response.status, response.config.url);
    return envelope.data as never;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      globalThis.dispatchEvent(new CustomEvent('tn:auth-failure'));
    }
    const message =
      (error.response?.data as ApiEnvelope<never>)?.error ?? error.message ?? 'Unknown error';
    logger.error('[API] ERROR', error.response?.status, message);
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
