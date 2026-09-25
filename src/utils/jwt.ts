import jwt from "jsonwebtoken";
import { env } from "../config/env";

// JWT secret is required and comes from environment configuration
const JWT_SECRET = env.JWT_SECRET;

// Expiry time used for refresh tokens
const JWT_EXPIRES_IN = String(env.JWT_EXPIRES_IN || "7d");

// Structure of data stored inside the JWT
interface TokenPayload {
  id: string;
  email: string;
  role: string;
  type?: "ACCESS" | "REFRESH";
}

// Generate the access token used for authenticated requests
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(
    { ...payload, type: "ACCESS" },
    JWT_SECRET,
    {
      expiresIn: "15m",
    } as jwt.SignOptions
  );
};

// Generate a refresh token
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(
    {
      ...payload,
      type: "REFRESH",

      // Unique identifier for the refresh token
      jti: `${Date.now()}_${Math.random()}`,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions
  );
};

// Generate a token with a custom expiry time
export const generateTokenWithExpiry = (
  payload: TokenPayload,
  expiresIn: string
): string => {
  return jwt.sign(
    { ...payload, type: "ACCESS" },
    JWT_SECRET,
    {
      expiresIn,
    } as jwt.SignOptions
  );
};

// Verify the access token
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded.type === "ACCESS" ? decoded : null;
  } catch {
    // Return null if the token is invalid or expired
    return null;
  }
};

// Verify the refresh token
export const verifyRefreshToken = (
  token: string
): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded.type === "REFRESH" ? decoded : null;
  } catch {
    // Return null if the token is invalid or expired
    return null;
  }
};

export const generateAccessToken = generateToken;
