/* eslint-disable max-len */
import { client } from "../config/whatsAppClient";
import { sendErrorMessage, sendImageAndMessage } from "../helpers/helpers";
import { Participant } from "../types/types";
import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
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

    // sendImageAndMessage will handle phone number cleaning internally
    await sendImageAndMessage(client, phone, image, `image_${name}`, text);
    return res.status(200).send({ message: "Message sent successfully" });
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
