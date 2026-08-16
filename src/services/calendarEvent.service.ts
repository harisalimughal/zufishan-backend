import { Prisma } from "@prisma/client";
import { calendarEventRepository } from "../repositories/calendarEvent.repository";
import { userRepository } from "../repositories/user.repository";
import { courseRepository } from "../repositories/course.repository";
import { ApiError } from "../utils/apiError";

export const getAllCalendarEvents = async () => {
  return calendarEventRepository.findAll();
};

export const getCalendarEventById = async (id: string) => {
  const event = await calendarEventRepository.findById(id);

  if (!event) {
    throw new ApiError(404, "Calendar event not found");
  }

  return event;
};

export const getCalendarEventsByUser = async (userId: string) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return calendarEventRepository.findByUserId(userId);
};

export const createCalendarEvent = async (
  userId: string,
  data: Omit<
    Prisma.CalendarEventCreateInput,
    "user"
  >
) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (data.course?.connect?.id) {
    const course = await courseRepository.findById(
      data.course.connect.id
    );

    if (!course) {
      throw new ApiError(404, "Course not found");
    }
  }

  if (data.startTime >= data.endTime) {
    throw new ApiError(
      400,
      "Start time must be before end time"
    );
  }

  return calendarEventRepository.create(userId, data);
};

export const updateCalendarEvent = async (
  id: string,
  data: Prisma.CalendarEventUpdateInput
) => {
  const event = await calendarEventRepository.findById(id);

  if (!event) {
    throw new ApiError(404, "Calendar event not found");
  }

  if (data.course?.connect?.id) {
    const course = await courseRepository.findById(
      data.course.connect.id
    );

    if (!course) {
      throw new ApiError(404, "Course not found");
    }
  }

  return calendarEventRepository.update(id, data);
};

export const deleteCalendarEvent = async (id: string) => {
  const event = await calendarEventRepository.findById(id);

  if (!event) {
    throw new ApiError(404, "Calendar event not found");
  }

  await calendarEventRepository.delete(id);

  return {
    message: "Calendar event deleted successfully",
  };
};