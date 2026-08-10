import { courseRepository } from "../repositories/course.repository";
import { courseResourceRepository } from "../repositories/courseResource.repository";
import { ApiError } from "../utils/apiError";
import {
  CreateCourseResourceInput,
  UpdateCourseResourceInput,
} from "../validators/courseResource.validator";

export const getResourcesByCourse = async (courseId: string) => {
  const course = await courseRepository.findById(courseId);

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  return courseResourceRepository.findAllByCourseId(courseId);
};

export const getResourceById = async (id: string) => {
  const resource = await courseResourceRepository.findById(id);

  if (!resource) {
    throw new ApiError(404, "Course resource not found");
  }

  return resource;
};

export const createResource = async (
  courseId: string,
  data: CreateCourseResourceInput
) => {
  const course = await courseRepository.findById(courseId);

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  return courseResourceRepository.create({
    title: data.title,
    fileUrl: data.fileUrl,
    fileType: data.fileType ?? "pdf",
    course: {
      connect: {
        id: courseId,
      },
    },
  });
};

export const updateResource = async (
  id: string,
  data: UpdateCourseResourceInput
) => {
  const resource = await courseResourceRepository.findById(id);

  if (!resource) {
    throw new ApiError(404, "Course resource not found");
  }

  return courseResourceRepository.update(id, data);
};

export const deleteResource = async (id: string) => {
  const resource = await courseResourceRepository.findById(id);

  if (!resource) {
    throw new ApiError(404, "Course resource not found");
  }

  await courseResourceRepository.delete(id);

  return {
    message: "Course resource deleted successfully",
  };
};