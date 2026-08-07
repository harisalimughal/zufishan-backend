// Loads and validates process.env, exports a typed `env` object so the rest
// of the app never touches `process.env` directly.
//
// TODO:
// - dotenv.config()
// - validate required vars (DATABASE_URL, JWT_SECRET, ...) and fail fast if missing
// - export a typed `env` object (PORT, NODE_ENV, DATABASE_URL, JWT_SECRET, ...)

import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 4000,
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
};
