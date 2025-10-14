import { Request, Response } from 'express';
import { TwilioCompatibleOTPService } from '../../services/TwilioCompatibleOTPService';
import { logger } from '../../services/LoggerService';

/**
 * Controller for Twilio-compatible verification endpoints
 * Implements the exact same API as Twilio Verify API
 */
export class VerifyController {
  private otpService: TwilioCompatibleOTPService;

  constructor() {
    this.otpService = new TwilioCompatibleOTPService();
  }

  /**
   * POST /verify/v2/Services/{ServiceSid}/Verifications
   * Creates a new verification (sends OTP code)
   * 
   * Compatible with Twilio Verify API
   */
  async createVerification(req: Request, res: Response): Promise<void> {
    try {
      const { ServiceSid } = req.params;
      const { 
        To: to, 
        Channel: channel = 'whatsapp',
        CustomMessage: customMessage,
        Locale: locale = 'en'
      } = req.body;

      // Validate required parameters
      if (!to) {
        res.status(400).json({
          code: 60200,
          message: "'To' is required",
          more_info: "https://www.twilio.com/docs/api/errors/60200",
          status: 400
        });
        return;
      }

      // Validate channel
      if (channel !== 'whatsapp' && channel !== 'sms') {
        res.status(400).json({
          code: 60212,
          message: "Invalid 'Channel' value. Supported channels: whatsapp, sms",
          more_info: "https://www.twilio.com/docs/api/errors/60212",
          status: 400
        });
        return;
      }

      // For now, only support WhatsApp
      if (channel === 'sms') {
        res.status(400).json({
          code: 60212,
          message: "SMS channel not supported yet. Use 'whatsapp'",
          more_info: "https://www.twilio.com/docs/api/errors/60212",
          status: 400
        });
        return;
      }

      logger.getPinoLogger().info({
        serviceSid: ServiceSid,
        to,
        channel,
        locale
      }, `Creating verification for ${to} via ${channel}`);

      const verification = await this.otpService.createVerification({
        to,
        channel,
        serviceSid: ServiceSid,
        customMessage,
        locale
      });

      // Return Twilio-compatible response
      res.status(201).json({
        sid: verification.sid,
        service_sid: verification.service_sid,
        account_sid: verification.account_sid,
        to: verification.to,
        channel: verification.channel,
        status: verification.status,
        valid: verification.valid,
        date_created: verification.date_created,
        date_updated: verification.date_updated,
        lookup: {},
        amount: null,
        payee: null,
        send_code_attempts: [{
          time: verification.date_created,
          channel: verification.channel,
          attempt_sid: verification.sid
        }],
        sna: null,
        url: `https://verify.twilio.com/v2/Services/${ServiceSid}/Verifications/${verification.sid}`
      });

    } catch (error) {
      logger.getPinoLogger().error({ error }, 'Error creating verification');
      
      if (error instanceof Error) {
        // Handle specific errors
        if (error.message.includes('No available bots')) {
          res.status(503).json({
            code: 60202,
            message: "Service temporarily unavailable. No bots available.",
            more_info: "https://www.twilio.com/docs/api/errors/60202",
            status: 503
          });
          return;
        }

        if (error.message.includes('Invalid phone number')) {
          res.status(400).json({
            code: 60200,
            message: "Invalid phone number format",
            more_info: "https://www.twilio.com/docs/api/errors/60200",
            status: 400
          });
          return;
        }
      }

      res.status(500).json({
        code: 20001,
        message: "Internal server error",
        more_info: "https://www.twilio.com/docs/api/errors/20001",
        status: 500
      });
    }
  }

  /**
   * POST /verify/v2/Services/{ServiceSid}/VerificationCheck
   * Checks a verification code
   * 
   * Compatible with Twilio Verify API
   */
  async checkVerification(req: Request, res: Response): Promise<void> {
    try {
      const { ServiceSid } = req.params;
      const { 
        Code: code,
        To: to,
        VerificationSid: verificationSid
      } = req.body;

      // Validate required parameters
      if (!code) {
        res.status(400).json({
          code: 60200,
          message: "'Code' is required",
          more_info: "https://www.twilio.com/docs/api/errors/60200",
          status: 400
        });
        return;
      }

      if (!to && !verificationSid) {
        res.status(400).json({
          code: 60200,
          message: "Either 'To' or 'VerificationSid' is required",
          more_info: "https://www.twilio.com/docs/api/errors/60200",
          status: 400
        });
        return;
      }

      logger.getPinoLogger().info({
        serviceSid: ServiceSid,
        to,
        verificationSid,
        hasCode: !!code
      }, `Checking verification code for ${to || verificationSid}`);

      const result = await this.otpService.checkVerification({
        code,
        to,
        verificationSid,
        serviceSid: ServiceSid
      });

      // Return Twilio-compatible response
      res.status(200).json({
        sid: result.sid,
        service_sid: result.service_sid,
        account_sid: result.account_sid,
        to: result.to,
        channel: result.channel,
        status: result.status,
        valid: result.valid,
        date_created: result.date_created,
        date_updated: result.date_updated,
        amount: null,
        payee: null,
        sna: null
      });

    } catch (error) {
      logger.getPinoLogger().error({ error }, 'Error checking verification');
      
      if (error instanceof Error) {
        // Handle specific errors
        if (error.message.includes('Verification not found')) {
          res.status(404).json({
            code: 20404,
            message: "The requested resource /Services/" + req.params.ServiceSid + "/VerificationCheck was not found",
            more_info: "https://www.twilio.com/docs/api/errors/20404",
            status: 404
          });
          return;
        }

        if (error.message.includes('Invalid code')) {
          res.status(404).json({
            code: 60202,
            message: "Invalid verification code",
            more_info: "https://www.twilio.com/docs/api/errors/60202",
            status: 404
          });
          return;
        }

        if (error.message.includes('Verification expired')) {
          res.status(404).json({
            code: 60203,
            message: "Verification code has expired",
            more_info: "https://www.twilio.com/docs/api/errors/60203",
            status: 404
          });
          return;
        }

        if (error.message.includes('Too many attempts')) {
          res.status(429).json({
            code: 60203,
            message: "Too many verification attempts",
            more_info: "https://www.twilio.com/docs/api/errors/60203",
            status: 429
          });
          return;
        }
      }

      res.status(500).json({
        code: 20001,
        message: "Internal server error",
        more_info: "https://www.twilio.com/docs/api/errors/20001",
        status: 500
      });
    }
  }

  /**
   * GET /verify/v2/Services/{ServiceSid}/Verifications/{Sid}
   * Retrieves a verification
   * 
   * Compatible with Twilio Verify API
   */
  async getVerification(req: Request, res: Response): Promise<void> {
    try {
      const { ServiceSid, Sid } = req.params;

      logger.getPinoLogger().info({
        serviceSid: ServiceSid,
        verificationSid: Sid
      }, `Getting verification ${Sid}`);

      const verification = await this.otpService.getVerificationDetails(Sid);

      if (!verification) {
        res.status(404).json({
          code: 20404,
          message: `The requested resource /Services/${ServiceSid}/Verifications/${Sid} was not found`,
          more_info: "https://www.twilio.com/docs/api/errors/20404",
          status: 404
        });
        return;
      }

      // Return Twilio-compatible response
      res.status(200).json({
        sid: verification.sid,
        service_sid: verification.service_sid,
        account_sid: verification.account_sid,
        to: verification.to,
        channel: verification.channel,
        status: verification.status,
        valid: verification.valid,
        date_created: verification.date_created,
        date_updated: verification.date_updated,
        lookup: {},
        amount: null,
        payee: null,
        send_code_attempts: [{
          time: verification.date_created,
          channel: verification.channel,
          attempt_sid: verification.sid
        }],
        sna: null,
        url: `https://verify.twilio.com/v2/Services/${ServiceSid}/Verifications/${verification.sid}`
      });

    } catch (error) {
      logger.getPinoLogger().error({ error }, 'Error getting verification');
      
      res.status(500).json({
        code: 20001,
        message: "Internal server error",
        more_info: "https://www.twilio.com/docs/api/errors/20001",
        status: 500
      });
    }
  }
}