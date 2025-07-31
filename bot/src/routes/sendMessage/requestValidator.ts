import { Request, Response } from "express";
import { SendMessageRequestBody, SendResponse } from "./types";

/**
 * Validates incoming request data
 */
export default class RequestValidator {
  static validateRequest(req: Request, res: Response): {
    isValid: boolean;
    body?: SendMessageRequestBody;
    file?: Express.Multer.File;
  } {
    const body = req.body as SendMessageRequestBody;
    const file = req.file as Express.Multer.File;
    
    console.log("Payload recibido en /send-message: ", body);

    if (!body.message && !file) {
      res.status(400).send({ error: "Missing message or file parameter" });
      return { isValid: false };
    }

    return { isValid: true, body, file };
  }

  static buildResponse(messagesSent: string[], errors: any[]): SendResponse {
    return {
      success: errors.length === 0,
      messagesSent,
      errors,
    };
  }

  static getResponseStatus(errors: any[]): number {
    return errors.length === 0 ? 200 : 207;
  }
}
