// eslint-disable-next-line max-len, node/no-process-env
import dotenv from "dotenv";
dotenv.config();

// No baked-in number. Set FALLBACKNUMBER in bot/.env (see bot/.env.example).
export const DEFAULT_FALLBACK_PHONE_NUMBER = process.env.FALLBACKNUMBER || "";
