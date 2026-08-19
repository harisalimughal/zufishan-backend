import { Router } from "express";
import {
  createAssignmentController,
  deleteAssignmentController,
  listAssignments,
  getAssignment,
  submitAssignmentController,
  updateAssignmentController,
} from "../controllers/assignment.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createAssignmentSchema,
  submitAssignmentSchema,
  updateAssignmentSchema,
} from "../validators/assignment.validator";

const router = Router();

router.get("/", listAssignments);
router.get("/:id", getAssignment);
router.post("/", validate(createAssignmentSchema), createAssignmentController);
router.patch("/:id", validate(updateAssignmentSchema), updateAssignmentController);
router.delete("/:id", deleteAssignmentController);
router.post(
  "/:assignmentId/submit",
  authenticate,
  validate(submitAssignmentSchema),
  submitAssignmentController
);

export default router;
