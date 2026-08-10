import { z } from "zod";

export const createCourseResourceSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  fileUrl: z.string().min(1, "File URL is required"),
  fileType: z.string().optional(),
});

export const updateCourseResourceSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").max(255, "Title too long").optional(),
  fileUrl: z.string().min(1, "File URL cannot be empty").optional(),
  fileType: z.string().optional(),
});

export type CreateCourseResourceInput = z.infer<typeof createCourseResourceSchema>;
export type UpdateCourseResourceInput = z.infer<typeof updateCourseResourceSchema>;
