import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getAllMessages,
  getMessageById,
  getConversation,
  getMessagesByReceiver,
  getUnreadMessages,
  createMessage,
  markMessageAsRead,
  markConversationAsRead,
  updateMessage,
  deleteMessage,
} from "../services/message.service";

export const listMessages = asyncHandler(
  async (_req: Request, res: Response) => {
    const messages = await getAllMessages();

    res.status(200).json(messages);
  }
);

export const getMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
      return;
    }

    const message = await getMessageById(id);

    res.status(200).json(message);
  }
);

export const getConversationController = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, otherUserId } = req.params;

    if (
      typeof userId !== "string" ||
      typeof otherUserId !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const messages = await getConversation(
      userId,
      otherUserId
    );

    res.status(200).json(messages);
  }
);

export const listMessagesByReceiver = asyncHandler(
  async (req: Request, res: Response) => {
    const { receiverId } = req.params;

    if (typeof receiverId !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid receiver ID",
      });
      return;
    }

    const messages = await getMessagesByReceiver(
      receiverId
    );

    res.status(200).json(messages);
  }
);

export const listUnreadMessages = asyncHandler(
  async (req: Request, res: Response) => {
    const { receiverId } = req.params;

    if (typeof receiverId !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid receiver ID",
      });
      return;
    }

    const messages = await getUnreadMessages(receiverId);

    res.status(200).json(messages);
  }
);

export const createMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      senderId,
      receiverId,
      content,
    } = req.body;

    if (!senderId || !receiverId || !content) {
      res.status(400).json({
        success: false,
        message:
          "senderId, receiverId and content are required",
      });
      return;
    }

    const message = await createMessage(
      senderId,
      receiverId,
      {
        content,
      }
    );

    res.status(201).json(message);
  }
);

export const markMessageAsReadController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
      return;
    }

    const message = await markMessageAsRead(id);

    res.status(200).json(message);
  }
);

export const markConversationAsReadController =
  asyncHandler(
    async (req: Request, res: Response) => {
      const { receiverId, senderId } = req.params;

      if (
        typeof receiverId !== "string" ||
        typeof senderId !== "string"
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
        return;
      }

      const result =
        await markConversationAsRead(
          receiverId,
          senderId
        );

      res.status(200).json({
        success: true,
        message: "Conversation marked as read",
        data: result,
      });
    }
  );

export const updateMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
      return;
    }

    const message = await updateMessage(
      id,
      req.body
    );

    res.status(200).json(message);
  }
);

export const deleteMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
      return;
    }

    const result = await deleteMessage(id);

    res.status(200).json(result);
  }
);