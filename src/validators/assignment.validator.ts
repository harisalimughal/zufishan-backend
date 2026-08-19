import { z } from "zod";

export const submitAssignmentSchema = z.object({
  content: z.string().optional(),
  fileUrl: z.string().optional(),
});

export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;

export const createAssignmentSchema = z.object({
  courseId: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.coerce.date(),
  totalPoints: z.number().int().positive().optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const updateAssignmentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  dueDate: z.coerce.date().optional(),
  totalPoints: z.number().int().positive().optional(),
});

export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
