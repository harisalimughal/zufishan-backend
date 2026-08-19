import { Router } from "express";
import * as courseController from "../controllers/course.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/admin.middleware";

const router = Router();

// Reads stay open — the public/student course catalog depends on these.
router.get("/", courseController.listCourses);
router.get("/detail/:slug", courseController.getCourseBySlug);
router.get("/slug/:slug", courseController.getCourseBySlug);
router.get("/:id", courseController.getCourse);

// Mutations are admin-only.
router.post("/", authenticate, requireAdmin, courseController.createCourse);
router.patch("/:id", authenticate, requireAdmin, courseController.updateCourse);
router.put("/:id", authenticate, requireAdmin, courseController.updateCourse);
router.delete("/:id", authenticate, requireAdmin, courseController.deleteCourse);

export default router;
