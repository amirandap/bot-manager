import { Request, Response } from "express";
import { WhatsappService } from "../services/whatsappService";

export class StatusController {
  private whatsappService: WhatsappService;

  constructor() {
    this.whatsappService = new WhatsappService();
  }

  async getWhatsappStatus(req: Request, res: Response) {
    // Logic to fetch WhatsApp bot status
    const whatsappService = new WhatsappService();
    const { id } = req.params;
    const status = await whatsappService.fetchStatus(id);
    res.json(status);
  }
}
