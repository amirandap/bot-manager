/* eslint-disable no-console */
/* eslint-disable max-len */
import express from "express";
import { client } from "../config/whatsAppClient";
import { GroupChat } from "whatsapp-web.js";
import { getGroupDetails } from "../helpers/groupHelper";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    console.log("GET /get-groups: Request received");

    if (!client) {
      console.log("GET /get-groups: Client not initialized");
      return res.status(503).send({ error: "WhatsApp client not initialized" });
    }

    console.log("GET /get-groups: Client info:", {
      phoneNumber: client.info.wid.user,
      wid: client.info.wid._serialized,
    });

    console.log("GET /get-groups: Fetching chats...");
    const chats = await client.getChats();
    console.log(`GET /get-groups: ${chats.length} chats fetched`);

    const groupChats = chats.filter((chat) =>
      chat.id._serialized.endsWith("@g.us")
    ) as GroupChat[];
    console.log(`GET /get-groups: ${groupChats.length} group chats found`);

    const groups = await Promise.all(
      groupChats.map((group) => getGroupDetails(group))
    );

    console.log("GET /get-groups: Response prepared:", groups);
    return res.status(200).send({ groups });
  } catch (error: unknown) {
    console.error("GET /get-groups: Failed to retrieve groups:", error);
    const reason = error instanceof Error ? error.message : "Unknown error";
    return res
      .status(500)
      .send({ error: `Error retrieving groups: ${reason}` });
  }
});

export default router;
