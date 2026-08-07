// Root router — aggregates every module's router and mounts each under its
// own path prefix. This is the ONLY file app.ts needs to import routes from.
//
// TODO:
// - import { Router } from "express";
// - import userRoutes from "./user.routes";
// - const router = Router();
// - router.use("/users", userRoutes);
// - export default router;

import { Router } from "express";

import courseRoutes from "./course.routes";
import courseModuleRoutes from "./courseModule.routes";
import lessonRoutes from "./lesson.routes";

const router = Router();

router.use("/courses", courseRoutes);
router.use("/", courseModuleRoutes);
router.use("/", lessonRoutes);

export default router;