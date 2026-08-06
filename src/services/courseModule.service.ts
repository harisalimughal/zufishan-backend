import { Prisma } from "@prisma/client";
import { courseRepository } from "../repositories/course.repository";
import { courseModuleRepository } from "../repositories/courseModule.repository";
import { ApiError } from "../utils/apiError";

export const getModulesByCourse = async (courseId: string) => {
  const course = await courseRepository.findById(courseId);

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  return courseModuleRepository.findAllByCourseId(courseId);
};

export const getModuleById = async (id: string) => {
  const module = await courseModuleRepository.findById(id);

  if (!module) {
    throw new ApiError(404, "Course module not found");
  }

  return module;
};

export const createModule = async (
  courseId: string,
  data: Prisma.CourseModuleCreateInput
) => {
  const course = await courseRepository.findById(courseId);

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  return courseModuleRepository.create({
  title: data.title,
  order: data.order,
  course: {
    connect: {
      id: courseId,
    },
  },
});

};

export const updateModule = async (
  id: string,
  data: Prisma.CourseModuleUpdateInput
) => {
  const module = await courseModuleRepository.findById(id);

  if (!module) {
    throw new ApiError(404, "Course module not found");
  }

  return courseModuleRepository.update(id, data);
};

export const deleteModule = async (id: string) => {
  const module = await courseModuleRepository.findById(id);

  if (!module) {
    throw new ApiError(404, "Course module not found");
  }

  await courseModuleRepository.delete(id);

  return {
    message: "Course module deleted successfully",
  };
};