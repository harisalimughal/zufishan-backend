import { Prisma } from "@prisma/client";
import { courseModuleRepository } from "../repositories/courseModule.repository";
import { lessonRepository } from "../repositories/lesson.repository";
import { ApiError } from "../utils/apiError";

export const getLessonsByModule = async (moduleId: string) => {
  const module = await courseModuleRepository.findById(moduleId);

  if (!module) {
    throw new ApiError(404, "Course module not found");
  }

  return lessonRepository.findAllByModuleId(moduleId);
};

export const getLessonById = async (id: string) => {
  const lesson = await lessonRepository.findById(id);

  if (!lesson) {
    throw new ApiError(404, "Lesson not found");
  }

  return lesson;
};

export const createLesson = async (
  moduleId: string,
  data: Prisma.LessonCreateInput
) => {
  const module = await courseModuleRepository.findById(moduleId);

  if (!module) {
    throw new ApiError(404, "Course module not found");
  }

  return lessonRepository.create({
    title: data.title,
    videoUrl: data.videoUrl,
    duration: data.duration,
    order: data.order,
    module: {
      connect: {
        id: moduleId,
      },
    },
  });
};

export const updateLesson = async (
  id: string,
  data: Prisma.LessonUpdateInput
) => {
  const lesson = await lessonRepository.findById(id);

  if (!lesson) {
    throw new ApiError(404, "Lesson not found");
  }

  return lessonRepository.update(id, data);
};

export const deleteLesson = async (id: string) => {
  const lesson = await lessonRepository.findById(id);

  if (!lesson) {
    throw new ApiError(404, "Lesson not found");
  }

  await lessonRepository.delete(id);

  return {
    message: "Lesson deleted successfully",
  };
};