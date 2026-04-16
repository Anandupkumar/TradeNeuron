/* eslint-disable no-console */
import { DEBUG_MODE } from './constants';

const isDev = import.meta.env.DEV;
const isDebug = isDev || DEBUG_MODE;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDebug) console.debug('[TN]', ...args);
  },
  info: (...args: unknown[]) => {
    if (isDebug) console.info('[TN]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[TN]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[TN]', ...args);
  },
};
