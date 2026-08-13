import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getAllAssignments,
  getAssignmentById as getAssignmentService,
  submitAssignment as submitAssignmentService,
} from "../services/assignment.service";

export const listAssignments = asyncHandler(async (_req: Request, res: Response) => {
  const assignments = await getAllAssignments();
  res.status(200).json(assignments);
});

export const getAssignment = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const assignment = await getAssignmentService(id);
  res.status(200).json(assignment);
});

export const submitAssignmentController = asyncHandler(async (req: Request, res: Response) => {
  const assignmentId = req.params.assignmentId as string;
  const userId = (req as any).user?.id || "anonymous-user";

  const submission = await submitAssignmentService(assignmentId, userId, req.body);
  res.status(201).json({
    success: true,
    message: "Assignment submitted successfully",
    data: submission,
  });
});
