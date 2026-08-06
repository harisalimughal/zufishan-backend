import { Router } from "express";
import * as courseController from "../controllers/course.controller";

const router = Router();

router.get("/", courseController.listCourses);
router.get("/:id", courseController.getCourse);
router.post("/", courseController.createCourse);
router.patch("/:id", courseController.updateCourse);
router.delete("/:id", courseController.deleteCourse);

export default router;
