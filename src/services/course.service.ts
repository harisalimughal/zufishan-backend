import { courseRepository } from "../repositories/course.repository";
import { ApiError } from "../utils/apiError";
import { Prisma } from "@prisma/client";

export const getAllCourses = async () => {
  return courseRepository.findAll();
};

export const getCourseById = async (id: string) => {
  const course = await courseRepository.findById(id);

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  return course;
};

export const createCourse = async (data: Prisma.CourseCreateInput) => {
  const existingCourse = await courseRepository.findBySlug(data.detailSlug);

  if (existingCourse) {
    throw new ApiError(409, "Course with this slug already exists");
  }

  return courseRepository.create(data);
};

export const updateCourse = async (id: string, data: Prisma.CourseUpdateInput) => {
  const existingCourse = await courseRepository.findById(id);

  if (!existingCourse) {
    throw new ApiError(404, "Course not found");
  }

  if (typeof data.detailSlug === "string") {
    const existingSlug = await courseRepository.findBySlug(data.detailSlug);

    if (existingSlug && existingSlug.id !== id) {
      throw new ApiError(409, "Course with this slug already exists");
    }
  }

  return courseRepository.update(id, data);
};

export const deleteCourse = async (id: string) => {
  const course = await courseRepository.findById(id);

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  await courseRepository.delete(id);

  return {
    message: "Course deleted successfully",
  };
};
