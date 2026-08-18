import { Router } from "express";
import {
  createAssignmentController,
  listAssignments,
  getAssignment,
  submitAssignmentController,
} from "../controllers/assignment.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createAssignmentSchema, submitAssignmentSchema } from "../validators/assignment.validator";

const router = Router();

router.get("/", listAssignments);
router.get("/:id", getAssignment);
router.post("/", validate(createAssignmentSchema), createAssignmentController);
router.post(
  "/:assignmentId/submit",
  authenticate,
  validate(submitAssignmentSchema),
  submitAssignmentController
);

export default router;
