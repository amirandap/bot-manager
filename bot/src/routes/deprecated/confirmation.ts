/* eslint-disable max-len */
import { Request, Response } from 'express';

import express from 'express';
import { sendTextWithErrorHandling } from '../../utils/messageHandler';
import { fetchUserData } from '../../utils/userDataService';
import { createPersonalizedMessage } from '../../utils/messageFormatter';
import { MessageErrorHandler } from '../../utils/errorHandler';
import { getClient } from '../../config/clientExporter';

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const { discorduserid, phoneNumber, message } = req.body as {
    discorduserid: string;
    phoneNumber: string;
    message: string;
  };
  console.log("Payload recibido en /confirmation: ", req.body);
  
  const client = getClient();
  
  if (!client) {
    return res.status(503).json({ 
      success: false, 
      error: "WhatsApp client not ready"
    });
  }

  let userData;
  let finalPhoneNumber = phoneNumber;
  let newMessage = message;

  if (discorduserid) {
    try {
      userData = await fetchUserData(discorduserid);
      if (userData) {
        const { celular, full_name } = userData;
        finalPhoneNumber = celular;
        const firstName = full_name.split(' ')[0]; // Extract the first name
        newMessage = createPersonalizedMessage(
          message.replace(/-/g, ' '),
          userData,
          'Saludos',
        );
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
    // Use new centralized message handler
    const result = await sendTextWithErrorHandling(
      client,
      [finalPhoneNumber],
      newMessage,
    );

    if (result.success) {
      return res.send({ 
        message: 'Message sent successfully',
        messagesSent: result.messagesSent.length,
      });
    } else {
      // If there were errors, handle them
      await MessageErrorHandler.sendErrorReport(
        client,
        { discorduserid, phoneNumber, message, userData },
        result.errors,
        'confirmation-endpoint',
      );
      
      return res.status(500).send({ 
        error: 'Error sending message',
        details: result.errors,
      });
    }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Unknown reason';
    
    // Handle critical errors
    await MessageErrorHandler.handleCriticalError(
      client,
      error,
      { discorduserid, phoneNumber, message, userData },
      'confirmation-endpoint',
    );
    
    return res.status(500).send({ 
      error: `Error sending message: ${reason}`,
    });
  }
});

export default router;
