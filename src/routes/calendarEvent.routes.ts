import { Router } from "express";
import {
  listCalendarEvents,
  getCalendarEvent,
  listUserCalendarEvents,
  createCalendarEventController,
  updateCalendarEventController,
  deleteCalendarEventController,
} from "../controllers/calendarEvent.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", listCalendarEvents);

router.get("/user/:userId", listUserCalendarEvents);

router.get("/:id", getCalendarEvent);

// This is a shared resource: students use it for their own personal
// calendar, admins use it to schedule live classes — so it's gated to
// "logged in", not "admin only".
router.post("/", authenticate, createCalendarEventController);

router.put("/:id", authenticate, updateCalendarEventController);

router.delete("/:id", authenticate, deleteCalendarEventController);

export default router;