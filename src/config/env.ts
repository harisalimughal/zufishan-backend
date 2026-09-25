import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z
    .string()
    .default("4000")
    .transform((val) => parseInt(val, 10)),
  // Comma-separated list of allowed CORS origins
  CLIENT_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  PAYMENT_WEBHOOK_SECRET: z.string().min(32).optional(),
  // AI provider (optional: the AI Assistant is unavailable until it is set)
  GEMINI_API_KEY: z.string().optional(),
  // Optional market price providers for Zakat Nisab live rates
  GOLDAPI_KEY: z.string().optional(),
  METALPRICEAPI_KEY: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment variables:");
  console.error(
    result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }))
  );
  console.error("\n💡 Required variables:");
  console.error("  - DATABASE_URL");
  console.error("  - JWT_SECRET");
  throw new Error("Invalid environment variables");
}

export const env = result.data;
export type Env = typeof env;
export default env;
