/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { getClient } from "../config/clientExporter";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("media"), async (req, res) => {
  try {
    const client = getClient();
    
    if (!client) {
      return res.status(503).json({ 
        success: false, 
        error: "WhatsApp client not ready" 
      });
    }

    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        error: "Phone and message are required" 
      });
    }

    // Simple message sending
    try {
      const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
      await client.sendMessage(chatId, message);
      
      res.json({ 
        success: true, 
        message: "Message sent successfully",
        to: phone
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      });
    }

  } catch (error) {
    console.error("Critical error in sendMessage route:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
