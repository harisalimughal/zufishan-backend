import { z } from "zod";

/*
 * Validation schema for updating a vendor profile.
 *
 * All fields are optional because this is a PATCH request.
 * The vendor can update only the fields they want to change.
 */
export const updateVendorSchema = z
  .object({
    contact: z
      .string()
      .min(5, "Contact details are required")
      .optional(),

    businessName: z
      .string()
      .min(2, "Business name is required")
      .optional(),

    proof: z
      .string()
      .url("Proof must be a valid URL")
      .optional(),

    location: z
      .string()
      .min(2, "Location is required")
      .optional(),

    currentState: z
      .string()
      .min(2, "Current state is required")
      .optional(),

    businessRegistrationNumber: z
      .string()
      .min(2, "Reg number is required")
      .optional(),

    vendorPicture: z
      .string()
      .url("Vendor picture must be a valid URL")
      .optional(),

    businessPicture: z
      .string()
      .url("Business picture must be a valid URL")
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field is required to update vendor profile",
    }
  );

/*
 * Validation schema for rejecting a vendor.
 *
 * An administrator must provide a reason
 * when rejecting a vendor application.
 */
export const rejectVendorSchema = z.object({
  rejectionReason: z
    .string()
    .min(3, "Rejection reason must be at least 3 characters"),
});

export const suspendVendorSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
