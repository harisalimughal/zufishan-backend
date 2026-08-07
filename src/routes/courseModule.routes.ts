import { Router } from "express";
import {
  listModules,
  getModule,
  createCourseModule,
  updateCourseModule,
  deleteCourseModule,
} from "../controllers/courseModule.controller";

const router = Router();

// Collection routes
router.get("/courses/:courseId/modules", listModules);
router.post("/courses/:courseId/modules", createCourseModule);

// Single resource routes
router.get("/modules/:id", getModule);
router.patch("/modules/:id", updateCourseModule);
router.delete("/modules/:id", deleteCourseModule);

export default router;