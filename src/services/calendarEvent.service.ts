import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
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

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (startTime >= endTime) {
    throw new ApiError(
      400,
      "Start time must be before end time"
    );
  }

  const { courseId, ...rest } = data as any;
  const createData: Prisma.CalendarEventCreateInput = {
    ...rest,
    startTime,
    endTime,
    user: { connect: { id: userId } },
    ...(courseId ? { course: { connect: { id: courseId } } } : {}),
  };

  return prisma.calendarEvent.create({
    data: createData,
  });
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