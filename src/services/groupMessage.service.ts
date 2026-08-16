import { Prisma } from "@prisma/client";
import { groupMessageRepository } from "../repositories/groupMessage.repository";
import { userRepository } from "../repositories/user.repository";
import { ApiError } from "../utils/apiError";

export const getAllGroupMessages = async () => {
  return groupMessageRepository.findAll();
};

export const getGroupMessageById = async (id: string) => {
  const message = await groupMessageRepository.findById(id);

  if (!message) {
    throw new ApiError(404, "Group message not found");
  }

  return message;
};

export const getGroupMessagesByChannel = async (channelId: string) => {
  return groupMessageRepository.findByChannelId(channelId);
};

export const createGroupMessage = async (
  channelId: string,
  senderId: string,
  data: Omit<Prisma.GroupMessageCreateInput, "sender">
) => {
  // Check whether sender exists
  const sender = await userRepository.findById(senderId);

  if (!sender) {
    throw new ApiError(404, "User not found");
  }

  return groupMessageRepository.create(
    channelId,
    senderId,
    data
  );
};

export const updateGroupMessage = async (
  id: string,
  data: Prisma.GroupMessageUpdateInput
) => {
  const message = await groupMessageRepository.findById(id);

  if (!message) {
    throw new ApiError(404, "Group message not found");
  }

  return groupMessageRepository.update(id, data);
};

export const deleteGroupMessage = async (id: string) => {
  const message = await groupMessageRepository.findById(id);

  if (!message) {
    throw new ApiError(404, "Group message not found");
  }

  await groupMessageRepository.delete(id);

  return {
    message: "Group message deleted successfully",
  };
};