import { Router } from "express";
import {
  listMessages,
  getMessage,
  getConversationController,
  listMessagesByReceiver,
  listUnreadMessages,
  createMessageController,
  markMessageAsReadController,
  markConversationAsReadController,
  updateMessageController,
  deleteMessageController,
} from "../controllers/message.controller";

const router = Router();

router.get("/", listMessages);

router.get(
  "/conversation/:userId/:otherUserId",
  getConversationController
);

router.get(
  "/receiver/:receiverId",
  listMessagesByReceiver
);

router.get(
  "/receiver/:receiverId/unread",
  listUnreadMessages
);

router.post("/", createMessageController);

router.patch(
  "/:id/read",
  markMessageAsReadController
);

router.patch(
  "/conversation/:receiverId/:senderId/read",
  markConversationAsReadController
);

router.put("/:id", updateMessageController);

router.get("/:id", getMessage);

router.delete("/:id", deleteMessageController);

export default router;