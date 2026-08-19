import { assignmentRepository } from "../repositories/assignment.repository";
import { courseRepository } from "../repositories/course.repository";
import { ApiError } from "../utils/apiError";
import {
  CreateAssignmentInput,
  SubmitAssignmentInput,
  UpdateAssignmentInput,
} from "../validators/assignment.validator";

export const getAllAssignments = async () => {
  return assignmentRepository.findAll();
};

export const createAssignment = async (data: CreateAssignmentInput) => {
  const course = await courseRepository.findById(data.courseId);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  return assignmentRepository.create(data);
};

export const updateAssignment = async (id: string, data: UpdateAssignmentInput) => {
  const assignment = await assignmentRepository.findById(id);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  return assignmentRepository.update(id, data);
};

export const deleteAssignment = async (id: string) => {
  const assignment = await assignmentRepository.findById(id);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  await assignmentRepository.delete(id);
  return { message: "Assignment deleted successfully" };
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
