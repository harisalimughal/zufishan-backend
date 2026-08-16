import { Router } from "express";
import * as submissionController from "../controllers/submission.controller";

const router = Router();

router.get(
  "/",
  submissionController.listSubmissions
);

router.get(
  "/:id",
  submissionController.getSubmission
);

router.get(
  "/assignment/:assignmentId",
  submissionController.listSubmissionsByAssignment
);

router.post(
  "/",
  submissionController.createSubmissionController
);

router.patch(
  "/:id",
  submissionController.updateSubmissionController
);

router.delete(
  "/:id",
  submissionController.deleteSubmissionController
);

export default router;