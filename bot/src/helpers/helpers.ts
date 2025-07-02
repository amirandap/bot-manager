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
      throw new Error("Client not initialized");
    }
    await client.sendMessage(formattedPhoneNumber, message);
    console.log(`✅ Message sent successfully to: "${formattedPhoneNumber}"`);
    return { status: "success", message: "Message sent successfully" };
  } catch (error: any) {
    console.error(
      `❌ Error sending message to ${formattedPhoneNumber}:`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error?.response
      ? error.response.data
      : { to: phoneNumber, text: errorMessage };
    throw new Error(`Error sending message: ${JSON.stringify(errorDetails)}`);
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

    const mimeType = file.mimetype;
    const media = new MessageMedia(mimeType, file.data, "file.mp4");
    await client.sendMessage(formattedPhoneNumber, message, { media });

    console.log(`✅ File sent successfully to: "${formattedPhoneNumber}"`);

    return { status: "success", message: "Message sent successfully" };
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
