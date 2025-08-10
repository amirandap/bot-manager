/* eslint-disable max-len */
import { getClient } from "../config/clientExporter";
import { fetchUserData } from "../utils/userDataService";
import { cleanAndFormatPhoneNumber } from "../utils/cleanAndFormatPhoneNumber";
import { sendImageMessage } from "../utils/mediaMessaging";
import { sendErrorMessage } from "../utils/errorHandler";
import { Participant } from "../types/types";
import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  const client = getClient();

  if (!client) {
    return res.status(503).json({
      success: false,
      error: "WhatsApp client not ready",
    });
  }

  try {
    const { participant } = req.body as { participant: Participant };
    console.log("Payload recibido en /receiveImageAndJson: ", req.body);

    if (!participant) {
      return res.status(400).send({ error: "Missing parameters" });
    }
    const { phone, image, rank, name } = participant;

    if (typeof phone !== "string" || !image || !rank || !name) {
      return res.status(400).send({ error: "Missing parameters" });
    }

    const text = `Saludos ${name}, felicidades en tu P${rank}, sube tu historia a Instagram y recuerda etiquetar a @gpesportsrd y @entrandoapits. ¡Buena suerte en tu próxima carrera!`;

    // Use new sendImageMessage which handles URL images
    const result = await sendImageMessage(client, [phone], image, text);

    if (result.messagesSent.length > 0) {
      return res.status(200).send({
        message: "Message sent successfully",
        messagesSent: result.messagesSent.length,
      });
    } else {
      throw new Error("Failed to send image message");
    }
  } catch (error) {
    console.error("Error sending the message:", error);
    let reason = "Unknown reason";
    if (error instanceof Error) {
      reason = error?.message && error.message;
    }
    const errorMessage: string = `
Error en /receiveImageAndJson

Payload: ${JSON.stringify(req.body)}
Error: ${reason}
`;
    await sendErrorMessage(client, errorMessage);
    return res
      .status(500)
      .send({ error: `Error sending message: ${reason}`, errorMessage });
  }
});

export default router;
