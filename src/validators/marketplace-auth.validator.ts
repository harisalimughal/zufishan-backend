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

    address: z.string().optional(),

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

    contact: z.string().optional(),

    businessName: z.string().optional(),

    proof: z.string().optional(),

    location: z.string().optional(),

    currentState: z.string().optional(),

    businessRegistrationNumber: z.string().optional(),

    vendorPicture: z.string().optional(),

    businessPicture: z.string().optional(),

    categories: z.array(z.string()).optional(),
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