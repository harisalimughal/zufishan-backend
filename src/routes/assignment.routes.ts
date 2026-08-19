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
import { requireAdmin } from "../middlewares/admin.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createAssignmentSchema,
  submitAssignmentSchema,
  updateAssignmentSchema,
} from "../validators/assignment.validator";

const router = Router();

// Reads stay open — students browse assignments here.
router.get("/", listAssignments);
router.get("/:id", getAssignment);

// Creating/editing/deleting an assignment is an admin action, not a student one.
router.post(
  "/",
  authenticate,
  requireAdmin,
  validate(createAssignmentSchema),
  createAssignmentController
);
router.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validate(updateAssignmentSchema),
  updateAssignmentController
);
router.delete("/:id", authenticate, requireAdmin, deleteAssignmentController);

// Submitting your own work stays open to any authenticated user.
router.post(
  "/:assignmentId/submit",
  authenticate,
  validate(submitAssignmentSchema),
  submitAssignmentController
);

export default router;
