import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getResourcesByCourse,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
} from "../services/courseResource.service";

export const listResources = asyncHandler(
  async (req: Request, res: Response) => {
    const courseId = req.params.courseId as string;

    const resources = await getResourcesByCourse(courseId);

    res.status(200).json(resources);
  }
);

export const getResource = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const resource = await getResourceById(id);

    res.status(200).json(resource);
  }
);

export const createCourseResource = asyncHandler(
  async (req: Request, res: Response) => {
    const courseId = req.params.courseId as string;

    const resource = await createResource(courseId, req.body);

    res.status(201).json(resource);
  }
);

export const updateCourseResource = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const resource = await updateResource(id, req.body);

    res.status(200).json(resource);
  }
);

export const deleteCourseResource = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const result = await deleteResource(id);

    res.status(200).json(result);
  }
);