import { Request, Response } from "express";
import { 
  BotStatusController, 
  BotConfigController, 
  BotMessagingController 
} from "./botProxy";

/**
 * Main BotProxyController that delegates to specialized controllers
 * This maintains the existing API interface while using modular components
 */
export class BotProxyController {
  private statusController: BotStatusController;
  private configController: BotConfigController;
  private messagingController: BotMessagingController;

  constructor() {
    this.statusController = new BotStatusController();
    this.configController = new BotConfigController();
    this.messagingController = new BotMessagingController();
  }

  // ===== QR CODE & STATUS OPERATIONS =====
  public async getBotQRCode(req: Request, res: Response): Promise<void> {
    return this.statusController.getBotQRCode(req, res);
  }

  public async getBotQRCodeById(req: Request, res: Response): Promise<void> {
    return this.statusController.getBotQRCodeById(req, res);
  }

  public async getBotStatusById(req: Request, res: Response): Promise<void> {
    return this.statusController.getBotStatusById(req, res);
  }

  public async updateBotQRCode(req: Request, res: Response): Promise<void> {
    return this.statusController.updateBotQRCode(req, res);
  }

  // ===== CONFIGURATION OPERATIONS =====
  public async changeFallbackNumber(req: Request, res: Response): Promise<void> {
    return this.configController.changeFallbackNumber(req, res);
  }

  public async changePort(req: Request, res: Response): Promise<void> {
    return this.configController.changePort(req, res);
  }

  public async getGroups(req: Request, res: Response): Promise<void> {
    return this.configController.getGroups(req, res);
  }

  // ===== MESSAGING OPERATIONS =====
  public async sendMessage(req: Request, res: Response): Promise<void> {
    return this.messagingController.sendMessage(req, res);
  }

  public async sendPendingMessage(req: Request, res: Response): Promise<void> {
    return this.messagingController.sendPendingMessage(req, res);
  }

  public async sendFollowupMessage(req: Request, res: Response): Promise<void> {
    return this.messagingController.sendFollowupMessage(req, res);
  }

  public async receiveImageAndJson(req: Request, res: Response): Promise<void> {
    return this.messagingController.receiveImageAndJson(req, res);
  }

  public async sendConfirmationMessage(req: Request, res: Response): Promise<void> {
    return this.messagingController.sendConfirmationMessage(req, res);
  }
}
