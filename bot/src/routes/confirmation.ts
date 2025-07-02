/* eslint-disable max-len */
import { Request, Response } from "express";

import express from "express";
import {
  sendMessage,
  fetchUserData,
  sendErrorMessage,
} from "../helpers/helpers";
import { client } from "../config/whatsAppClient";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const { discorduserid, phoneNumber, message } = req.body as {
    discorduserid: string;
    phoneNumber: string;
    message: string;
  };
  console.log("Payload recibido en /confirmation: ", req.body);

  let userData;
  let finalPhoneNumber = phoneNumber;
  let newMessage = message;

  if (discorduserid) {
    try {
      userData = await fetchUserData(discorduserid);
      if (userData) {
        const { celular, full_name } = userData;
        finalPhoneNumber = celular;
        const firstName = full_name.split(" ")[0]; // Extract the first name
        newMessage = `Saludos ${firstName}, como estas? ${message.replace(
          /-/g,
          " "
        )}`;
      } else {
        console.error("Discord user ID not found: ", discorduserid);
        return res.status(404).send({ error: "Discord user ID not found" });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      return res
        .status(500)
        .send({ error: "Error when fetching phone number" });
    }
  }

  if (!finalPhoneNumber) {
    return res
      .status(400)
      .send({ error: "Either discorduserid or phoneNumber is required" });
  }

  try {
    // sendMessage will handle cleaning internally, no need for validation here
    await sendMessage(client, finalPhoneNumber, newMessage);
    return res.send({ message: "Message sent successfully" });
  } catch (error: unknown) {
    console.error("Error sending the message:", error);
    let reason = "Unknown reason";
    if (error instanceof Error) {
      reason = error?.message && error.message;
    }
    let errorMessage: string = `
Error en /confirmation

${userData ? userData.full_name : ""}
www.instagram.com/${userData ? userData.instagram : ""}
${finalPhoneNumber}
${discorduserid}
Error: ${reason}
`;
    // Note: Phone number validation errors will be handled by sendMessage helper
    await sendErrorMessage(client, errorMessage);
    return res
      .status(500)
      .send({ error: `Error sending message: ${reason}`, errorMessage });
  }
});

export default router;
