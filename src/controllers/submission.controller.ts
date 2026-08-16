import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getAllSubmissions,
  getSubmissionById,
  getSubmissionsByAssignment,
  createSubmission,
  updateSubmission,
  deleteSubmission,
} from "../services/submission.service";

export const listSubmissions = asyncHandler(
  async (_req: Request, res: Response) => {
    const submissions = await getAllSubmissions();

    res.status(200).json(submissions);
  }
);

export const getSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id);

    const submission = await getSubmissionById(id);

    res.status(200).json(submission);
  }
);

export const listSubmissionsByAssignment = asyncHandler(
  async (req: Request, res: Response) => {
    const assignmentId = String(req.params.assignmentId);

    const submissions =
      await getSubmissionsByAssignment(assignmentId);

    res.status(200).json(submissions);
  }
);

export const createSubmissionController = asyncHandler(
  async (req: Request, res: Response) => {
    const { assignmentId } = req.body;
    const userId = req.body.userId || (req as any).user?.id;

    if (!assignmentId || !userId) {
      res.status(400).json({
        success: false,
        message: "assignmentId and userId are required",
      });
      return;
    }

    const submission = await createSubmission(
      assignmentId,
      userId,
      req.body
    );

    res.status(201).json(submission);
  }
);

export const updateSubmissionController = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id);

    const submission = await updateSubmission(
      id,
      req.body
    );

    res.status(200).json(submission);
  }
);

export const deleteSubmissionController = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id);

    const result = await deleteSubmission(id);

    res.status(200).json(result);
  }
);