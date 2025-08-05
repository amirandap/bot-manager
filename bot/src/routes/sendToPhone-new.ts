import express from "express";
import { getClient } from "../config/clientExporter";

const router = express.Router();

router.post("/", async (req, res) => {
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

    try {
      const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
      await client.sendMessage(chatId, message);
      
      res.json({ 
        success: true, 
        message: "Message sent to phone successfully",
        to: phone
      });
    } catch (error) {
      console.error("Error sending message to phone:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      });
    }

  } catch (error) {
    console.error("Critical error in sendToPhone route:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
