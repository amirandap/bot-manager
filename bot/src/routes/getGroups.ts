 
 
import express from "express";
import { getClient } from "../config/clientExporter";
import { GroupChat } from "whatsapp-web.js";
import { getGroupDetails } from "../utils";
import { logger } from "../services/LoggerService";
const router = express.Router();

/**
 * @swagger
 * /get-groups:
 *   get:
 *     tags: [Grupos]
 *     summary: Obtener lista de grupos de WhatsApp
 *     description: |
 *       Devuelve todos los grupos de WhatsApp donde el bot es miembro.
 *       Incluye información detallada de cada grupo como ID, nombre, 
 *       número de participantes y si el bot es administrador.
 *     responses:
 *       200:
 *         description: Lista de grupos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GroupsResponse'
 *             examples:
 *               groups_list:
 *                 summary: Ejemplo de lista de grupos
 *                 value:
 *                   success: true
 *                   groups:
 *                     - id: "123456789-987654321@g.us"
 *                       name: "Grupo de Trabajo"
 *                       description: "Coordinación de proyectos"
 *                       participants: 15
 *                       isGroupAdmin: true
 *                       createdAt: "2023-01-15T10:30:00.000Z"
 *                     - id: "111222333-444555666@g.us"
 *                       name: "Chat Familiar"
 *                       participants: 8
 *                       isGroupAdmin: false
 *                       createdAt: "2022-12-01T08:00:00.000Z"
 *                   totalGroups: 2
 *                   timestamp: "2024-01-15T16:45:00.000Z"
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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
