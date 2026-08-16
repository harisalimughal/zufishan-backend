// user.validator.ts — request payload schemas for the "user" module
// (recommended: zod). Used as middleware on the route so controllers only
// ever see already-validated req.body/query/params.
//
// TODO:
// - import { z } from "zod";
// - export const createUserSchema = z.object({ body: z.object({...}) });
// - export const updateUserSchema = z.object({...});
import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
})

export const updatePreferencesSchema = z.object({
  theme: z.enum(['dark', 'light']).optional(),
  language: z.string().min(2).max(10).optional(),
  notificationsEnabled: z.boolean().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>