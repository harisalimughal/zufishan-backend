import { Router } from "express";
import {
  listGroupMessages,
  getGroupMessage,
  listChannelMessages,
  createGroupMessageController,
  updateGroupMessageController,
  deleteGroupMessageController,
} from "../controllers/groupMessage.controller";

const router = Router();

router.get("/", listGroupMessages);

router.get("/channel/:channelId", listChannelMessages);

router.get("/:id", getGroupMessage);

router.post("/", createGroupMessageController);

router.put("/:id", updateGroupMessageController);

router.delete("/:id", deleteGroupMessageController);

export default router;