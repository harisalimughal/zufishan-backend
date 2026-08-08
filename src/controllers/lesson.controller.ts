import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getLessonsByModule,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
} from "../services/lesson.service";

export const listLessons = asyncHandler(
  async (req: Request, res: Response) => {
    const moduleId = req.params.moduleId as string;

    const lessons = await getLessonsByModule(moduleId);

    res.status(200).json(lessons);
  }
);

export const getLesson = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const lesson = await getLessonById(id);

    res.status(200).json(lesson);
  }
);

export const createLessonController = asyncHandler(
  async (req: Request, res: Response) => {
    const moduleId = req.params.moduleId as string;

    const lesson = await createLesson(moduleId, req.body);

    res.status(201).json(lesson);
  }
);

export const updateLessonController = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const lesson = await updateLesson(id, req.body);

    res.status(200).json(lesson);
  }
);

export const deleteLessonController = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const result = await deleteLesson(id);

    res.status(200).json(result);
  }
);