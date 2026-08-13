import { assignmentRepository } from "../repositories/assignment.repository";
import { ApiError } from "../utils/apiError";
import { SubmitAssignmentInput } from "../validators/assignment.validator";

export const getAllAssignments = async () => {
  return assignmentRepository.findAll();
};

export const getAssignmentById = async (id: string) => {
  const assignment = await assignmentRepository.findById(id);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }
  return assignment;
};

export const submitAssignment = async (
  assignmentId: string,
  userId: string,
  data: SubmitAssignmentInput
) => {
  const assignment = await assignmentRepository.findById(assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  return assignmentRepository.createSubmission({
    assignmentId,
    userId,
    content: data.content,
    fileUrl: data.fileUrl,
  });
};
