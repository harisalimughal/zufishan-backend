import { Router } from "express";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import courseRoutes from "./course.routes";
import courseModuleRoutes from "./courseModule.routes";
import lessonRoutes from "./lesson.routes";
import courseResourceRoutes from "./courseResource.routes";
import assignmentRoutes from "./assignment.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);

router.use("/courses", courseRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/", courseModuleRoutes);
router.use("/", lessonRoutes);
router.use("/", courseResourceRoutes);

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

export default router;