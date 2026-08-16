import { Router } from "express";
import {
  listCalendarEvents,
  getCalendarEvent,
  listUserCalendarEvents,
  createCalendarEventController,
  updateCalendarEventController,
  deleteCalendarEventController,
} from "../controllers/calendarEvent.controller";

const router = Router();

router.get("/", listCalendarEvents);

router.get("/user/:userId", listUserCalendarEvents);

router.get("/:id", getCalendarEvent);

router.post("/", createCalendarEventController);

router.put("/:id", updateCalendarEventController);

router.delete("/:id", deleteCalendarEventController);

export default router;