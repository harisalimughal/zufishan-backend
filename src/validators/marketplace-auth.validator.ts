import { z } from "zod";


// Schema for Buyer and Vendor registration
export const registerSchema = z.discriminatedUnion("role", [

  // Buyer registration requirements
  z.object({
    role: z.literal("BUYER"),

    email: z.string().email("Invalid email address"),

    password: z
      .string()
      .min(6, "Password must be at least 6 characters"),

    fullName: z
      .string()
      .min(2, "Full name is required"),

    contact: z.string().min(5, "Contact is required"),

    address: z.string().min(2, "Address is required"),

    picture: z
      .string()
      .url()
      .optional(),
  }),

  // Vendor registration requirements
  z.object({
    role: z.literal("VENDOR"),

    email: z.string().email("Invalid email address"),

    password: z
      .string()
      .min(6, "Password must be at least 6 characters"),

    fullName: z
      .string()
      .min(2, "Full name is required"),

    contact: z.string().min(5, "Contact is required"),

    businessName: z.string().min(2, "Business name is required"),

    proof: z.string().min(1, "Business proof is required"),

    location: z.string().min(2, "Business address is required"),

    currentState: z.string().min(2, "Current state is required"),

    businessRegistrationNumber: z.string().min(2, "Business registration number is required"),

    vendorPicture: z.string().min(1, "Vendor picture is required"),

    businessPicture: z.string().min(1, "Business picture is required"),

    categories: z.array(z.string().cuid("Invalid category ID")).min(1, "Business category is required"),
  }),
]);


// Schema for user login
export const loginSchema = z.object({

  email: z
    .string()
    .email("Invalid email address"),

  password: z
    .string()
    .min(1, "Password is required"),
});

export const marketplaceRefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});
