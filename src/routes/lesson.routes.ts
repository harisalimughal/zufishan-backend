import { Router } from "express";
import {
  listLessons,
  getLesson,
  createLessonController,
  updateLessonController,
  deleteLessonController,
} from "../controllers/lesson.controller";

const router = Router();

// Collection routes
router.get("/modules/:moduleId/lessons", listLessons);
router.post("/modules/:moduleId/lessons", createLessonController);

// Single resource routes
router.get("/lessons/:id", getLesson);
router.patch("/lessons/:id", updateLessonController);
router.delete("/lessons/:id", deleteLessonController);

export default router;