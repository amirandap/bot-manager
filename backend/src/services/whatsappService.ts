import { WAPI_URL, WAPI_URL2 } from "../constants/Urls";
import { Bot } from "../types";

export class WhatsappService {
  public async fetchBots(): Promise<Bot[]> {
    try {
      // Fetch data from both WAPI_URL and WAPI_URL2
      const [response1, response2] = await Promise.all([
        fetch(`${WAPI_URL}/status`),
        fetch(`${WAPI_URL2}/status`),
      ]);

      // Parse the JSON responses
      const [bots1, bots2] = await Promise.all([
        response1.json(),
        response2.json(),
      ]);

      console.log(bots1, bots2);
      // Combine the bots from both sources
      const combinedBots: Bot[] = [bots1, bots2];

      console.log(combinedBots);
      return combinedBots;
    } catch (error) {
      console.error("Error fetching bots:", error);
      throw new Error("Failed to fetch bots");
    }
  }

  public async fetchStatus(
    botId: string
  ): Promise<{ id: string; status: string }> {
    // Logic to fetch the status of a specific bot
    return { id: botId, status: "online" }; // Example response
  }

  public async fetchBotById(id: string): Promise<{ id: string; name: string }> {
    // Placeholder implementation for fetching a bot by ID
    return { id, name: "WhatsApp Bot" };
  }
}
