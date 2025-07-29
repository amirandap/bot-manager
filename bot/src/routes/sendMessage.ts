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
  to?: string | string[]; // Alias for phoneNumber
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
    const { discorduserid, phoneNumber, to, message, group_id, group_name } =
      req.body as SendMessageRequestBody;
    const file = req.file as Express.Multer.File;
    const userData = discorduserid ? await fetchUserData(discorduserid) : null;
    console.log("Payload recibido en /send-message: ", req.body);

    if (!message && !file) {
      return res
        .status(400)
        .send({ error: "Missing message or file parameter" });
    }

    // Check if phoneNumber/to is a single string, array of phone numbers, or group_id is provided
    // Use 'to' as alias for 'phoneNumber' for API compatibility
    const targetNumber = phoneNumber || to;
    let numbersToProcess: string[] = [];
    if (typeof targetNumber === "string") {
      numbersToProcess = [targetNumber];
    } else if (Array.isArray(targetNumber)) {
      numbersToProcess = targetNumber;
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
            const result = await sendFileAndMessage(
              client,
              phoneNumber,
              { data: file.buffer.toString("base64"), mimetype: file.mimetype },
              formattedMessage
            );
            
            // Check if file was sent successfully (even with warnings)
            if (result.status === "success") {
              if (result.warning) {
                console.warn(`⚠️ [BOT_ROUTE] File sent with warning to ${phoneNumber}: ${result.warning}`);
              }
              messagesSent.push(phoneNumber);
            } else {
              throw new Error(`File send failed: ${result.message || 'Unknown error'}`);
            }
          } else {
            const result = await sendMessage(client, phoneNumber, formattedMessage);
            
            // Check if message was sent successfully (even with warnings)
            if (result.status === "success") {
              if (result.warning) {
                console.warn(`⚠️ [BOT_ROUTE] Message sent with warning to ${phoneNumber}: ${result.warning}`);
              }
              messagesSent.push(phoneNumber);
            } else {
              throw new Error(`Message send failed: ${result.message || 'Unknown error'}`);
            }
          }
        } catch (error: unknown) {
          console.error(`❌ [BOT_ROUTE] Error sending message to ${number}:`, error);
          
          let errorType = "UNKNOWN_ERROR";
          let errorMessage = error instanceof Error ? error.message : "Unknown error";
          
          // Parse structured error from helper
          if (errorMessage.startsWith("BOT_SEND_ERROR:")) {
            try {
              const errorData = JSON.parse(errorMessage.replace("BOT_SEND_ERROR: ", ""));
              errorType = errorData.errorType;
              errorMessage = errorData.originalError;
            } catch (parseError) {
              console.error(`❌ [BOT_ROUTE] Failed to parse error data:`, parseError);
            }
          }
          
          const errorDetails = {
            phoneNumber: number,
            error: errorMessage,
            errorType,
            timestamp: new Date().toISOString()
          };
          
          errors.push(errorDetails);
          console.error(`🔥 [BOT_ROUTE] Detailed error for ${number}:`, errorDetails);
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
    console.error("❌ [BOT_ROUTE] Critical error in /send-message endpoint:", error);
    
    let reason = "Unknown reason";
    let errorType = "CRITICAL_ERROR";
    
    if (error instanceof Error) {
      reason = error.message;
      
      // Categorize critical errors
      if (reason.includes("Client not initialized")) {
        errorType = "CLIENT_NOT_INITIALIZED";
      } else if (reason.includes("Cannot read properties")) {
        errorType = "SESSION_CORRUPTED";
      } else if (reason.includes("Evaluation failed")) {
        errorType = "WHATSAPP_SESSION_LOST";
      }
    }
    
    const errorDetails = {
      endpoint: "/send-message",
      errorType,
      error: reason,
      payload: req.body,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        CLIENT_NOT_INITIALIZED: "Restart bot service",
        SESSION_CORRUPTED: "Scan QR code to re-authenticate",
        WHATSAPP_SESSION_LOST: "Re-scan QR code",
        CRITICAL_ERROR: "Check bot logs and restart if necessary"
      }[errorType]
    };
    
    console.error(`🔥 [BOT_ROUTE] Critical error details:`, errorDetails);
    
    const errorMessage: string = `
🚨 Critical Error in /send-message

Error Type: ${errorType}
Payload: ${JSON.stringify(req.body, null, 2)}
Error: ${reason}
Timestamp: ${new Date().toISOString()}
Troubleshooting: ${errorDetails.troubleshooting}
`;

    try {
      await sendErrorMessage(client, errorMessage);
    } catch (fallbackError) {
      console.error("❌ [BOT_ROUTE] Failed to send error message to fallback:", fallbackError);
    }
    
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      errorType,
      details: reason,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
