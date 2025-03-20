import { Bot } from "../types";

export class DiscordService {
  private bots: Bot[] = [
    {
      id: "1",
      name: "Discord Bot 1",
      type: "discord",
      status: "online",
      uptime: "24h",
    },
    {
      id: "2",
      name: "Discord Bot 2",
      type: "discord",
      status: "offline",
      uptime: null,
    },
  ];

  public async fetchBots(): Promise<Bot[]> {
    // Logic to fetch the list of Discord bots
    return this.bots;
  }

  public async fetchStatus(botId: string): Promise<{ id: string; status: string }> {
    // Logic to fetch the status of a specific Discord bot
    const bot = this.bots.find(bot => bot.id === botId);
    if (bot) {
      return { id: botId, status: bot.status };
    } else {
      throw new Error('Bot not found');
    }
  }

  public async fetchBotById(id: string): Promise<Bot | null> {
    // Implementation for fetching a bot by ID
    const bot = this.bots.find(bot => bot.id === id);
    return bot || null;
  }

  public async startBot(botId: string): Promise<{ id: string; status: string }> {
    // Mock action to start a bot
    const bot = this.bots.find(bot => bot.id === botId);
    if (bot) {
      bot.status = "online";
      bot.uptime = "0h"; // Reset uptime
      return { id: botId, status: bot.status };
    } else {
      throw new Error('Bot not found');
    }
  }

  public async stopBot(botId: string): Promise<{ id: string; status: string }> {
    // Mock action to stop a bot
    const bot = this.bots.find(bot => bot.id === botId);
    if (bot) {
      bot.status = "offline";
      bot.uptime = null;
      return { id: botId, status: bot.status };
    } else {
      throw new Error('Bot not found');
    }
  }
}
