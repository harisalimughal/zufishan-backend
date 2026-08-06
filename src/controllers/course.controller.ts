import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getAllCourses,
  getCourseById,
  createCourse as createCourseService,
  updateCourse as updateCourseService,
  deleteCourse as deleteCourseService,
} from "../services/course.service";

export const listCourses = asyncHandler(async (_req: Request, res: Response) => {
  const courses = await getAllCourses();

  res.status(200).json(courses);
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const course = await getCourseById(id);

  res.status(200).json(course);
});

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await createCourseService(req.body);

  res.status(201).json(course);
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const updatedCourse = await updateCourseService(id, req.body);

  res.status(200).json(updatedCourse);
});

export const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await deleteCourseService(id);

  res.status(200).json(result);
});
