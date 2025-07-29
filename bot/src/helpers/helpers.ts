/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
import { Client, MessageMedia } from "whatsapp-web.js";
import { URL } from "../constants/URL";
import { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";
import { getFallbackNumber } from "../utils/fallbackUtils";

export interface User {
  user_id: number;
  full_name: string;
  username: string;
  nickname: string;
  email: string;
  user_discord_id: string;
  hearratelink?: string | null;
  youtube_id: string;
  iracing_id?: string | null;
  ea_ccount?: string | null;
  individualID: number;
  individual_id: number;
  SubmissionId: number;
  instagram: string;
  celular: string;
}

export const fetchUserData = async (discorduserid: string) => {
  try {
    const response = await fetch(
      `${URL}/consultaUser/private?user_discord_id=${discorduserid}`,
      {
        method: "GET",
        headers: { accept: "application/json" },
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const users = (await response.json()) as User[];

    if (response.status === 200 && users.length > 0) {
      return users[0];
    }

    throw new Error("User not found");
  } catch (error: any) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

export const formatMessage = (message: string, user: User) => {
  // Return the raw phone number - let the helper functions handle cleaning
  const phoneNumber = user.celular || getFallbackNumber();
  let formattedMessage = message.replace(/-/g, " ");

  // Note: We can't do validation here since it would duplicate cleaning
  // The sendMessage helper will handle validation and fallback if needed

  return { formattedMessage, phoneNumber };
};

export const sendMessage = async (
  client: Client | null,
  phoneNumber: string,
  message: string
) => {
  console.log(`📤 sendMessage called with: "${phoneNumber}"`);

  // Use the cleanAndFormatPhoneNumber function for consistent formatting
  const { cleanedPhoneNumber, isValid } =
    cleanAndFormatPhoneNumber(phoneNumber);

  if (!isValid) {
    console.log(
      `❌ Invalid phone number, using fallback: "${cleanedPhoneNumber}"`
    );
  }

  // Remove the + for WhatsApp Web.js format and add @c.us
  const whatsappNumber = cleanedPhoneNumber.startsWith("+")
    ? cleanedPhoneNumber.slice(1)
    : cleanedPhoneNumber;
  const formattedPhoneNumber = `${whatsappNumber.trim()}@c.us`;

  console.log(`📱 WhatsApp formatted number: "${formattedPhoneNumber}"`);

  try {
    if (!client) {
      console.error(`❌ [BOT] Client not initialized`);
      throw new Error("BOT_ERROR: WhatsApp client not initialized");
    }

    // Check if the number is registered on WhatsApp before sending
    try {
      console.log(`🔍 [BOT] Verifying number on WhatsApp: ${formattedPhoneNumber}`);
      const numberId = await client.getNumberId(formattedPhoneNumber);
      if (!numberId) {
        console.error(`❌ [BOT] Number not registered: ${formattedPhoneNumber}`);
        throw new Error(`WHATSAPP_ERROR: Number ${formattedPhoneNumber} is not registered on WhatsApp`);
      }
      console.log(`✅ [BOT] Number verified on WhatsApp: ${numberId._serialized}`);
    } catch (verifyError) {
      console.error(`❌ [BOT] Number verification failed for ${formattedPhoneNumber}:`, verifyError);
      throw new Error(`WHATSAPP_VERIFICATION_ERROR: Number not available on WhatsApp - ${formattedPhoneNumber}`);
    }

    console.log(`📤 [BOT] Sending message to verified number: ${formattedPhoneNumber}`);
    
    let messageResult;
    let messageSent = false;
    
    try {
      messageResult = await client.sendMessage(formattedPhoneNumber, message);
      messageSent = true;
      console.log(`✅ [BOT] Message sent successfully to: "${formattedPhoneNumber}"`);
      console.log(`📝 [BOT] Message ID: ${messageResult.id?._serialized || 'N/A'}`);
      
      return { 
        status: "success", 
        message: "Message sent successfully",
        recipient: formattedPhoneNumber,
        messageId: messageResult.id?._serialized,
        timestamp: new Date().toISOString()
      };
    } catch (sendError: any) {
      // If message was sent but serialization failed after, treat as success
      if (messageSent || (sendError.message && sendError.message.includes("serialize"))) {
        console.warn(`⚠️ [BOT] Post-send serialization error (message likely sent): ${sendError.message}`);
        console.log(`✅ [BOT] Treating as successful send despite post-send error`);
        
        return { 
          status: "success", 
          message: "Message sent successfully (post-send error ignored)",
          recipient: formattedPhoneNumber,
          warning: "Post-send serialization error occurred but message was likely delivered",
          timestamp: new Date().toISOString()
        };
      }
      
      // Re-throw if it's a real send error
      throw sendError;
    }
  } catch (error: any) {
    console.error(`❌ [BOT] Error sending message to ${formattedPhoneNumber}:`, error);
    
    let errorType = "UNKNOWN_ERROR";
    let errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Categorize error types
    if (errorMessage.includes("BOT_ERROR:")) {
      errorType = "BOT_INITIALIZATION_ERROR";
    } else if (errorMessage.includes("WHATSAPP_ERROR:")) {
      errorType = "WHATSAPP_NUMBER_ERROR";
    } else if (errorMessage.includes("WHATSAPP_VERIFICATION_ERROR:")) {
      errorType = "WHATSAPP_VERIFICATION_ERROR";
    } else if (errorMessage.includes("serialize")) {
      errorType = "WHATSAPP_SERIALIZATION_ERROR";
      errorMessage = "WhatsApp post-send serialization error - message likely delivered but session unstable";
    } else if (errorMessage.includes("Cannot read properties")) {
      errorType = "WHATSAPP_DOM_ERROR";
      errorMessage = "WhatsApp Web DOM structure changed or session lost";
    } else if (errorMessage.includes("Evaluation failed")) {
      errorType = "WHATSAPP_SCRIPT_ERROR";
      errorMessage = "WhatsApp Web script execution failed - session may be unstable";
    }

    const errorDetails = {
      errorType,
      originalError: errorMessage,
      recipient: formattedPhoneNumber,
      originalRecipient: phoneNumber,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        BOT_INITIALIZATION_ERROR: "Restart the bot service",
        WHATSAPP_NUMBER_ERROR: "Verify the phone number is registered on WhatsApp",
        WHATSAPP_VERIFICATION_ERROR: "Check number format and WhatsApp registration",
        WHATSAPP_SERIALIZATION_ERROR: "Post-send error - message likely delivered, monitor session stability",
        WHATSAPP_SESSION_ERROR: "Scan QR code to re-authenticate",
        WHATSAPP_DOM_ERROR: "Restart bot - WhatsApp Web may have updated",
        WHATSAPP_SCRIPT_ERROR: "Restart bot and scan QR code if needed"
      }[errorType] || "Check bot logs for more details"
    };

    console.error(`🔥 [BOT] Detailed error info:`, errorDetails);
    throw new Error(`BOT_SEND_ERROR: ${JSON.stringify(errorDetails)}`);
  }
};

export const sendImageAndMessage = async (
  client: Client | null,
  phoneNumber: string,
  imagePath: string,
  imageName: string,
  message: string
) => {
  console.log(`📤 sendImageAndMessage called with: "${phoneNumber}"`);

  try {
    if (!phoneNumber || !message || !imagePath || !imageName) {
      throw new Error(
        "Phone number, message, image path and name are required"
      );
    }

    if (!client) {
      throw new Error("Client not initialized");
    }

    const { cleanedPhoneNumber, isValid } =
      cleanAndFormatPhoneNumber(phoneNumber);

    if (!isValid) {
      console.log(
        `❌ Invalid phone number, using fallback: "${cleanedPhoneNumber}"`
      );
    }

    // Remove the + for WhatsApp Web.js format and add @c.us
    const whatsappNumber = cleanedPhoneNumber.startsWith("+")
      ? cleanedPhoneNumber.slice(1)
      : cleanedPhoneNumber;
    const formattedPhoneNumber = `${whatsappNumber.trim()}@c.us`;

    console.log(
      `📱 WhatsApp formatted number for image: "${formattedPhoneNumber}"`
    );

    const media = await MessageMedia.fromUrl(imagePath, { unsafeMime: true });
    const contact = await client.getContactById(formattedPhoneNumber);
    const chat = await contact.getChat();

    await chat.sendMessage(media, { caption: message });
    console.log(`✅ Image sent successfully to: "${formattedPhoneNumber}"`);

    return { status: "success", message: "Message sent successfully" };
  } catch (error: any) {
    console.error(`❌ Error sending image to ${phoneNumber}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error?.response
      ? error.response.data
      : { to: phoneNumber, text: errorMessage };
    throw new Error(`Error sending image: ${JSON.stringify(errorDetails)}`);
  }
};

export const sendFileAndMessage = async (
  client: Client | null,
  phoneNumber: string,
  file: any,
  message: string
) => {
  console.log(`📤 sendFileAndMessage called with: "${phoneNumber}"`);

  try {
    if (!phoneNumber || !message || !file) {
      throw new Error("Phone number, message, and file are required");
    }

    if (!client) {
      throw new Error("Client not initialized");
    }

    const { cleanedPhoneNumber, isValid } =
      cleanAndFormatPhoneNumber(phoneNumber);

    if (!isValid) {
      console.log(
        `❌ Invalid phone number, using fallback: "${cleanedPhoneNumber}"`
      );
    }

    // Remove the + for WhatsApp Web.js format and add @c.us
    const whatsappNumber = cleanedPhoneNumber.startsWith("+")
      ? cleanedPhoneNumber.slice(1)
      : cleanedPhoneNumber;
    const formattedPhoneNumber = `${whatsappNumber.trim()}@c.us`;

    console.log(
      `📱 WhatsApp formatted number for file: "${formattedPhoneNumber}"`
    );

    let messageResult;
    let messageSent = false;

    try {
      const mimeType = file.mimetype;
      const media = new MessageMedia(mimeType, file.data, "file.mp4");
      messageResult = await client.sendMessage(formattedPhoneNumber, message, { media });
      messageSent = true;
      
      console.log(`✅ File sent successfully to: "${formattedPhoneNumber}"`);
      console.log(`📝 [BOT] File message ID: ${messageResult.id?._serialized || 'N/A'}`);

      return { 
        status: "success", 
        message: "File and message sent successfully",
        recipient: formattedPhoneNumber,
        messageId: messageResult.id?._serialized,
        timestamp: new Date().toISOString()
      };
    } catch (sendError: any) {
      // If message was sent but serialization failed after, treat as success
      if (messageSent || (sendError.message && sendError.message.includes("serialize"))) {
        console.warn(`⚠️ [BOT] Post-send serialization error for file (message likely sent): ${sendError.message}`);
        console.log(`✅ [BOT] Treating file send as successful despite post-send error`);
        
        return { 
          status: "success", 
          message: "File and message sent successfully (post-send error ignored)",
          recipient: formattedPhoneNumber,
          warning: "Post-send serialization error occurred but file was likely delivered",
          timestamp: new Date().toISOString()
        };
      }
      
      // Re-throw if it's a real send error
      throw sendError;
    }
  } catch (error: any) {
    console.error(`❌ Error sending file to ${phoneNumber}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error?.response
      ? error.response.data
      : { to: phoneNumber, text: errorMessage };
    throw new Error(`Error sending file: ${JSON.stringify(errorDetails)}`);
  }
};

export const sendErrorMessage = async (
  client: Client | null,
  message: string
) => {
  const fallbackNum = getFallbackNumber();
  // Remove the + for WhatsApp Web.js format and add @c.us
  const whatsappNumber = fallbackNum.startsWith("+")
    ? fallbackNum.slice(1)
    : fallbackNum;
  const formattedNumber = `${whatsappNumber.trim()}@c.us`;

  console.log(`📱 Sending error message to fallback: "${formattedNumber}"`);

  try {
    if (!client) {
      throw new Error("Client not initialized");
    }
    await client.sendMessage(formattedNumber, message);
    return { status: "success", message: "Message sent successfully" };
  } catch (error: any) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error?.response
      ? error.response.data
      : { to: getFallbackNumber(), text: errorMessage };
    throw new Error(`Error sending message: ${JSON.stringify(errorDetails)}`);
  }
};
