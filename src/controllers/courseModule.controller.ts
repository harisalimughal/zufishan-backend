import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getModulesByCourse,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
} from "../services/courseModule.service";

export const listModules = asyncHandler(
  async (req: Request, res: Response) => {
    const courseId = req.params.courseId as string;

    const modules = await getModulesByCourse(courseId);

    res.status(200).json(modules);
  }
);

export const getModule = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const module = await getModuleById(id);

    res.status(200).json(module);
  }
);

export const createCourseModule = asyncHandler(
  async (req: Request, res: Response) => {
    const courseId = req.params.courseId as string;

    const module = await createModule(courseId, req.body);

    res.status(201).json(module);
  }
);

export const updateCourseModule = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const module = await updateModule(id, req.body);

    res.status(200).json(module);
  }
);

export const deleteCourseModule = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const result = await deleteModule(id);

    res.status(200).json(result);
  }
);