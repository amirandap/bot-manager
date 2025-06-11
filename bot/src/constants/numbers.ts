// eslint-disable-next-line max-len, node/no-process-env
import dotenv from 'dotenv';
dotenv.config();

export const DEFAULT_FALLBACK_PHONE_NUMBER = process.env.FALLBACKNUMBER || '18295600987';
