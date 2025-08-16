 
 
import express from "express";
import { getClient } from "../config/clientExporter";
import { GroupChat } from "whatsapp-web.js";
import { getGroupDetails } from "../utils";
import { logger } from "../services/LoggerService";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    logger.info("GET /get-groups: Request received");

    const client = getClient();

    if (!client) {
      logger.warn("GET /get-groups: Client not initialized");
      return res.status(503).send({ error: "WhatsApp client not initialized" });
    }

    logger.info(`GET /get-groups: Client info - Phone: ${client.info.wid.user}, WID: ${client.info.wid._serialized}`);

    logger.info("GET /get-groups: Fetching chats...");
    const chats = await client.getChats();
    logger.info(`GET /get-groups: ${chats.length} chats fetched`);

    const groupChats = chats.filter((chat: any) =>
      chat.id._serialized.endsWith("@g.us")
    ) as GroupChat[];
    logger.info(`GET /get-groups: ${groupChats.length} group chats found`);

    const groups = await Promise.all(
      groupChats.map((group) => getGroupDetails(group))
    );

    logger.info(`GET /get-groups: Response prepared with ${groups.length} groups`);
    return res.status(200).send({ groups });
  } catch (error: unknown) {
    logger.error(`GET /get-groups: Failed to retrieve groups: ${error}`);
    const reason = error instanceof Error ? error.message : "Unknown error";
    return res
      .status(500)
      .send({ error: `Error retrieving groups: ${reason}` });
  }
});

export default router;
