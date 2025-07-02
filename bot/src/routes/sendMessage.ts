/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable max-len */
import express from "express";
import multer from "multer";
import {
  fetchUserData,
  formatMessage,
  sendErrorMessage,
  sendFileAndMessage,
  sendImageAndMessage,
  sendMessage,
} from "../helpers/helpers";
import { client } from "../config/whatsAppClient";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

interface SendMessageRequestBody {
  discorduserid?: string;
  phoneNumber?: string | string[];
  message: string;
  group_id?: string;
  group_name?: string;
}

interface ErrorObject {
  phoneNumber: string;
  error: string;
}

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { discorduserid, phoneNumber, message, group_id, group_name } =
      req.body as SendMessageRequestBody;
    const file = req.file as Express.Multer.File;
    const userData = discorduserid ? await fetchUserData(discorduserid) : null;
    console.log("Payload recibido en /sendMessage: ", req.body);

    if (!message && !file) {
      return res
        .status(400)
        .send({ error: "Missing message or file parameter" });
    }

    // Check if phoneNumber is a single string, array of phone numbers, or group_id is provided
    let numbersToProcess: string[] = [];
    if (typeof phoneNumber === "string") {
      numbersToProcess = [phoneNumber];
    } else if (Array.isArray(phoneNumber)) {
      numbersToProcess = phoneNumber;
    } else if (discorduserid) {
      numbersToProcess = [userData?.celular as string];
    }

    const messagesSent: string[] = [];
    const errors: ErrorObject[] = [];

    if (group_id) {
      try {
        if (file) {
          await client?.sendMessage(
            group_id,
            { data: file.buffer.toString("base64"), mimetype: file.mimetype },
            { caption: message }
          );
        } else {
          await client?.sendMessage(group_id, message);
        }
        messagesSent.push(group_id);
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        errors.push({ phoneNumber: group_id, error: reason });
        console.error(`Error sending message to group ${group_id}:`, error);
      }
    } else {
      for (const number of numbersToProcess) {
        try {
          console.log(number, "NUMBER");
          const { phoneNumber, formattedMessage } = formatMessage(message, {
            full_name: "",
            celular: number,
            user_id: 0,
            username: "",
            nickname: "",
            email: "",
            user_discord_id: "",
            youtube_id: "",
            individualID: 0,
            individual_id: 0,
            SubmissionId: 0,
            instagram: "",
          });

          if (file) {
            await sendFileAndMessage(
              client,
              phoneNumber,
              { data: file.buffer.toString("base64"), mimetype: file.mimetype },
              formattedMessage
            );
          } else {
            await sendMessage(client, phoneNumber, formattedMessage);
          }
          messagesSent.push(phoneNumber);
        } catch (error: unknown) {
          const reason =
            error instanceof Error ? error.message : "Unknown error";
          errors.push({ phoneNumber: number, error: reason });
          console.error(`Error sending message to ${number}:`, error);
        }
      }
    }

    const response = {
      success: errors.length === 0,
      messagesSent,
      errors,
    };

    if (errors.length > 0) {
      const errorMessage = `
Error en /send-message

Payload: ${JSON.stringify(req.body)}
Errors: ${JSON.stringify(errors)}
`;
      await sendErrorMessage(client, errorMessage);
    }

    return res.status(errors.length === 0 ? 200 : 207).send(response);
  } catch (error: unknown) {
    console.error("Error sending the message:", error);
    let reason = "Unknown reason";
    if (error instanceof Error) {
      reason = error.message;
    }
    const errorMessage: string = `
Error en /send-message

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
