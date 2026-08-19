import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createAssignment as createAssignmentService,
  deleteAssignment as deleteAssignmentService,
  getAllAssignments,
  getAssignmentById as getAssignmentService,
  submitAssignment as submitAssignmentService,
  updateAssignment as updateAssignmentService,
} from "../services/assignment.service";

export const listAssignments = asyncHandler(async (_req: Request, res: Response) => {
  const assignments = await getAllAssignments();
  res.status(200).json(assignments);
});

export const createAssignmentController = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await createAssignmentService(req.body);
  res.status(201).json(assignment);
});

export const getAssignment = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const assignment = await getAssignmentService(id);
  res.status(200).json(assignment);
});

export const updateAssignmentController = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const assignment = await updateAssignmentService(id, req.body);
  res.status(200).json(assignment);
});

export const deleteAssignmentController = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await deleteAssignmentService(id);
  res.status(200).json(result);
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
