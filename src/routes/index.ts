import { Router } from "express";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import courseRoutes from "./course.routes";
import courseModuleRoutes from "./courseModule.routes";
import lessonRoutes from "./lesson.routes";
import courseResourceRoutes from "./courseResource.routes";
import assignmentRoutes from "./assignment.routes";
import submissionRoutes from "./submission.routes";
import calendarEventRoutes from "./calendarEvent.routes";
import messageRoutes from "./message.routes";
import groupMessageRoutes from "./groupMessage.routes";
import userRoutes from "./user.routes";
import achievementRoutes from "./achievement.routes";
import enrollmentRoutes from "./enrollment.routes";
import attendanceRoutes from "./attendance.routes";

const router = Router();

// Auth & Admin
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);

// Courses & Content
router.use("/courses", courseRoutes);
router.use("/", courseModuleRoutes);
router.use("/", lessonRoutes);
router.use("/", courseResourceRoutes);

// Assignments & Submissions
router.use("/assignments", assignmentRoutes);
router.use("/submissions", submissionRoutes);

// User Features
router.use("/users", userRoutes);
router.use("/achievements", achievementRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/attendance", attendanceRoutes);

// Communication
router.use("/messages", messageRoutes);
router.use("/group-messages", groupMessageRoutes);
router.use("/calendar-events", calendarEventRoutes);

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

export default router;
