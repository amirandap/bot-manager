import dotenv from 'dotenv';

dotenv.config();

// Private user-directory API. Set USER_API_BASE_URL in bot/.env.
// eslint-disable-next-line node/no-process-env
export const URL = process.env.USER_API_BASE_URL || '';
