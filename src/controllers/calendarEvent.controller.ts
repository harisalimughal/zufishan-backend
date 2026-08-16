import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getAllCalendarEvents,
  getCalendarEventById,
  getCalendarEventsByUser,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../services/calendarEvent.service";

export const listCalendarEvents = asyncHandler(
  async (_req: Request, res: Response) => {
    const events = await getAllCalendarEvents();

    res.status(200).json(events);
  }
);

export const getCalendarEvent = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
      return;
    }

    const event = await getCalendarEventById(id);

    res.status(200).json(event);
  }
);

export const listUserCalendarEvents = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const events = await getCalendarEventsByUser(userId);

    res.status(200).json(events);
  }
);

export const createCalendarEventController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.body.userId || (req as any).user?.id;
    const { userId: _, ...data } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "userId is required",
      });
      return;
    }

    const event = await createCalendarEvent(userId, data);

    res.status(201).json(event);
  }
);

export const updateCalendarEventController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
      return;
    }

    const event = await updateCalendarEvent(id, req.body);

    res.status(200).json(event);
  }
);

export const deleteCalendarEventController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
      return;
    }

    const result = await deleteCalendarEvent(id);

    res.status(200).json(result);
  }
);