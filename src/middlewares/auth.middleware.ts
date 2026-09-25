import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

// Middleware used to protect authenticated routes
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Expected format:
    // Authorization: Bearer YOUR_TOKEN
    const [scheme, token] = authHeader.split(" ");

    // Check if the format is correct
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    // Verify the JWT token
    const decoded = verifyToken(token);

    // Token is invalid or expired
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Attach decoded user information to the request
    (req as any).user = decoded;

    // Continue to the next middleware/controller
    return next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};