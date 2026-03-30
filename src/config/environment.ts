

import { cleanEnv, str, port, num } from "envalid";
import dotenv from "dotenv";

dotenv.config();

export const environment = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ["development", "production", "test"], default: "development" }),
  PORT: port({ default: 5000 }),
  CORS_ORIGIN: str({ default: "http://localhost:5173" }),

  MONGODB_URI: str({ desc: "MongoDB Atlas connection URI" }),

  REDIS_HOST: str({ default: "127.0.0.1" }),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_PASSWORD: str({ default: "" }),

  JWT_SECRET: str({ desc: "Secret key for JWT signing" }),
  JWT_EXPIRY: str({ default: "24h" }),

  OPENAI_API_KEY: str({ default: "" }),
  OPENAI_MODEL: str({ default: "gpt-4o-2024-11-20" }),

  GEMINI_API_KEY: str({ default: "" }),
  GEMINI_MODEL: str({ default: "gemini-1.5-pro" }),

  RATE_LIMIT_WINDOW_MS: num({ default: 3600000 }),
  RATE_LIMIT_MAX_REQUESTS: num({ default: 100 }),

  LOG_LEVEL: str({ default: "debug" }),
});
