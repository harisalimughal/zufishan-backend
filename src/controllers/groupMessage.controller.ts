import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getAllGroupMessages,
  getGroupMessageById,
  getGroupMessagesByChannel,
  createGroupMessage,
  updateGroupMessage,
  deleteGroupMessage,
} from "../services/groupMessage.service";

export const listGroupMessages = asyncHandler(
  async (_req: Request, res: Response) => {
    const messages = await getAllGroupMessages();

    res.status(200).json(messages);
  }
);

export const getGroupMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
      return;
    }

    const message = await getGroupMessageById(id);

    res.status(200).json(message);
  }
);

export const listChannelMessages = asyncHandler(
  async (req: Request, res: Response) => {
    const { channelId } = req.params;

    if (typeof channelId !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid channel ID",
      });
      return;
    }

    const messages = await getGroupMessagesByChannel(channelId);

    res.status(200).json(messages);
  }
);

export const createGroupMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const { channelId, senderId, content } = req.body;

    const message = await createGroupMessage(
      channelId,
      senderId,
      { channelId, content }
    );

    res.status(201).json(message);
  }
);

export const updateGroupMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
      return;
    }

    const message = await updateGroupMessage(id, req.body);

    res.status(200).json(message);
  }
);

export const deleteGroupMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid message ID",
      });
      return;
    }

    const result = await deleteGroupMessage(id);

    res.status(200).json(result);
  }
);