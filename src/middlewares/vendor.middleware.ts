import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";

/*
 * Checks whether the authenticated user owns
 * the vendor profile specified in the URL.
 *
 * Route example:
 * PATCH /api/marketplace/vendors/:vendorId
 *
 * The user ID comes from the JWT created during login.
 */
export const requireVendorOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the authenticated user from the authenticate middleware.
    const user = (req as any).user;

    // Authentication should already have been checked,
    // but we verify the user exists before continuing.
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get the vendor ID from the URL.
    const vendorId = req.params.vendorId as string;

    // Find the vendor profile in the database.
    const vendor = await prisma.vendorProfile.findUnique({
      where: {
        id: vendorId,
      },
      select: {
        userId: true,
      },
    });

    // Vendor profile does not exist.
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Make sure the logged-in user owns this vendor profile.
    if (vendor.userId !== user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this vendor",
      });
    }

    // User owns the vendor profile, so continue.
    return next();
  } catch (error) {
    return next(error);
  }
};