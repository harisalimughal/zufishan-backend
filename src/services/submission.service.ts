import { Prisma } from "@prisma/client";
import { submissionRepository } from "../repositories/submission.repository";
import { assignmentRepository } from "../repositories/assignment.repository";
import { ApiError } from "../utils/apiError";

export const getAllSubmissions = async () => {
  return submissionRepository.findAll();
};

export const getSubmissionById = async (id: string) => {
  const submission = await submissionRepository.findById(id);

  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  return submission;
};

export const getSubmissionsByAssignment = async (
  assignmentId: string
) => {
  const assignment = await assignmentRepository.findById(assignmentId);

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  return submissionRepository.findByAssignmentId(assignmentId);
};

export const createSubmission = async (
  assignmentId: string,
  userId: string,
  data: Omit<
    Prisma.SubmissionCreateInput,
    "assignment" | "user"
  >
) => {
  const assignment = await assignmentRepository.findById(assignmentId);

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  const existingSubmission =
    await submissionRepository.findByAssignmentAndUser(
      assignmentId,
      userId
    );

  if (existingSubmission) {
    throw new ApiError(
      409,
      "You have already submitted this assignment"
    );
  }

  return submissionRepository.create(
    assignmentId,
    userId,
    {
      content: data.content,
      fileUrl: data.fileUrl,
    }
  );
};

export const updateSubmission = async (
  id: string,
  data: Prisma.SubmissionUpdateInput
) => {
  const submission = await submissionRepository.findById(id);

  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  return submissionRepository.update(id, data);
};

export const deleteSubmission = async (id: string) => {
  const submission = await submissionRepository.findById(id);

  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  await submissionRepository.delete(id);

  return {
    message: "Submission deleted successfully",
  };
};