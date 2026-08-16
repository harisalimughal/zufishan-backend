import { Prisma } from "@prisma/client";
import { messageRepository } from "../repositories/message.repository";
import { userRepository } from "../repositories/user.repository";
import { ApiError } from "../utils/apiError";

export const getAllMessages = async () => {
  return messageRepository.findAll();
};

export const getMessageById = async (id: string) => {
  const message = await messageRepository.findById(id);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  return message;
};

export const getConversation = async (
  userId: string,
  otherUserId: string
) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otherUser = await userRepository.findById(otherUserId);

  if (!otherUser) {
    throw new ApiError(404, "Other user not found");
  }

  return messageRepository.findConversation(
    userId,
    otherUserId
  );
};

export const getMessagesByReceiver = async (
  receiverId: string
) => {
  const user = await userRepository.findById(receiverId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return messageRepository.findByReceiver(receiverId);
};

export const getUnreadMessages = async (
  receiverId: string
) => {
  const user = await userRepository.findById(receiverId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return messageRepository.findUnreadByReceiver(receiverId);
};

export const createMessage = async (
  senderId: string,
  receiverId: string,
  data: Omit<
    Prisma.MessageCreateInput,
    "sender" | "receiver"
  >
) => {
  if (senderId === receiverId) {
    throw new ApiError(
      400,
      "You cannot send a message to yourself"
    );
  }

  const sender = await userRepository.findById(senderId);

  if (!sender) {
    throw new ApiError(404, "Sender not found");
  }

  const receiver = await userRepository.findById(receiverId);

  if (!receiver) {
    throw new ApiError(404, "Receiver not found");
  }

  if (!data.content || data.content.trim().length === 0) {
    throw new ApiError(400, "Message content is required");
  }

  return messageRepository.create(
    senderId,
    receiverId,
    {
      content: data.content.trim(),
    }
  );
};

export const markMessageAsRead = async (
  id: string
) => {
  const message = await messageRepository.findById(id);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  return messageRepository.markAsRead(id);
};

export const markConversationAsRead = async (
  receiverId: string,
  senderId: string
) => {
  const receiver = await userRepository.findById(
    receiverId
  );

  if (!receiver) {
    throw new ApiError(404, "Receiver not found");
  }

  const sender = await userRepository.findById(senderId);

  if (!sender) {
    throw new ApiError(404, "Sender not found");
  }

  return messageRepository.markConversationAsRead(
    receiverId,
    senderId
  );
};

export const updateMessage = async (
  id: string,
  data: Prisma.MessageUpdateInput
) => {
  const message = await messageRepository.findById(id);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  return messageRepository.update(id, data);
};

export const deleteMessage = async (
  id: string
) => {
  const message = await messageRepository.findById(id);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  await messageRepository.delete(id);

  return {
    message: "Message deleted successfully",
  };
};