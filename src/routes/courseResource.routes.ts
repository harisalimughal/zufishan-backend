import { Router } from "express";
import {
  listResources,
  getResource,
  createCourseResource,
  updateCourseResource,
  deleteCourseResource,
} from "../controllers/courseResource.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createCourseResourceSchema,
  updateCourseResourceSchema,
} from "../validators/courseResource.validator";

const router = Router();

router.get("/courses/:courseId/resources", listResources);
router.post(
  "/courses/:courseId/resources",
  authenticate,
  validate(createCourseResourceSchema),
  createCourseResource
);

router.get("/resources/:id", getResource);
router.patch(
  "/resources/:id",
  authenticate,
  validate(updateCourseResourceSchema),
  updateCourseResource
);
router.delete("/resources/:id", authenticate, deleteCourseResource);

export default router;