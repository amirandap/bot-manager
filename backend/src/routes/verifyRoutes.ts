import express from 'express';
import { VerifyController } from '../controllers/verify/VerifyController';
import { apiAuthMiddleware } from '../middleware/apiAuth';

const router = express.Router();
const verifyController = new VerifyController();

// Optional authentication middleware - only enforced if API key is provided
const optionalAuth = (req: any, res: any, next: any) => {
  // Check if API key is provided
  const hasApiKey = req.headers.authorization || req.query.api_key;
  
  if (hasApiKey) {
    // If API key is provided, enforce authentication
    return apiAuthMiddleware('verify:create')(req, res, next);
  } else {
    // If no API key, allow for backward compatibility
    next();
  }
};

/**
 * Twilio-compatible Verify API routes
 * These routes replicate the exact Twilio Verify API structure
 */

/**
 * @swagger
 * /verify/v2/Services/{ServiceSid}/Verifications:
 *   post:
 *     summary: Create a new verification (send OTP code)
 *     description: |
 *       Creates a new verification and sends an OTP code via WhatsApp.
 *       Compatible with Twilio Verify API.
 *     tags:
 *       - Verify API
 *     parameters:
 *       - in: path
 *         name: ServiceSid
 *         required: true
 *         description: Service identifier (can be any string)
 *         schema:
 *           type: string
 *           example: "VA1234567890abcdef1234567890abcdef"
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - To
 *             properties:
 *               To:
 *                 type: string
 *                 description: Phone number to verify (E.164 format)
 *                 example: "+1234567890"
 *               Channel:
 *                 type: string
 *                 description: Verification channel
 *                 enum: [whatsapp, sms]
 *                 default: whatsapp
 *               CustomMessage:
 *                 type: string
 *                 description: Custom message template (optional)
 *                 example: "Your verification code is: {{code}}"
 *               Locale:
 *                 type: string
 *                 description: Language locale for message
 *                 default: "en"
 *                 example: "es"
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - To
 *             properties:
 *               To:
 *                 type: string
 *                 description: Phone number to verify (E.164 format)
 *                 example: "+1234567890"
 *               Channel:
 *                 type: string
 *                 description: Verification channel
 *                 enum: [whatsapp, sms]
 *                 default: whatsapp
 *               CustomMessage:
 *                 type: string
 *                 description: Custom message template (optional)
 *                 example: "Your verification code is: {{code}}"
 *               Locale:
 *                 type: string
 *                 description: Language locale for message
 *                 default: "en"
 *                 example: "es"
 *     responses:
 *       201:
 *         description: Verification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sid:
 *                   type: string
 *                   description: Verification SID
 *                   example: "VE1234567890abcdef1234567890abcdef"
 *                 service_sid:
 *                   type: string
 *                   description: Service SID
 *                   example: "VA1234567890abcdef1234567890abcdef"
 *                 account_sid:
 *                   type: string
 *                   description: Account SID
 *                   example: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *                 to:
 *                   type: string
 *                   description: Phone number being verified
 *                   example: "+1234567890"
 *                 channel:
 *                   type: string
 *                   description: Verification channel used
 *                   example: "whatsapp"
 *                 status:
 *                   type: string
 *                   description: Verification status
 *                   example: "pending"
 *                 valid:
 *                   type: boolean
 *                   description: Whether verification is valid
 *                   example: false
 *                 date_created:
 *                   type: string
 *                   format: date-time
 *                   description: Creation timestamp
 *                 date_updated:
 *                   type: string
 *                   format: date-time
 *                   description: Last update timestamp
 *       400:
 *         description: Bad request - missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 60200
 *                 message:
 *                   type: string
 *                   example: "'To' is required"
 *                 status:
 *                   type: integer
 *                   example: 400
 *       503:
 *         description: Service unavailable - no bots available
 */
router.post('/verify/v2/Services/:ServiceSid/Verifications', 
  optionalAuth,
  verifyController.createVerification.bind(verifyController)
);

/**
 * @swagger
 * /verify/v2/Services/{ServiceSid}/VerificationCheck:
 *   post:
 *     summary: Check a verification code
 *     description: |
 *       Validates a verification code sent to a phone number.
 *       Compatible with Twilio Verify API.
 *     tags:
 *       - Verify API
 *     parameters:
 *       - in: path
 *         name: ServiceSid
 *         required: true
 *         description: Service identifier
 *         schema:
 *           type: string
 *           example: "VA1234567890abcdef1234567890abcdef"
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - Code
 *             properties:
 *               Code:
 *                 type: string
 *                 description: Verification code to check
 *                 pattern: '^[0-9]{4,10}$'
 *                 example: "123456"
 *               To:
 *                 type: string
 *                 description: Phone number (required if VerificationSid not provided)
 *                 example: "+1234567890"
 *               VerificationSid:
 *                 type: string
 *                 description: Verification SID (alternative to To)
 *                 example: "VE1234567890abcdef1234567890abcdef"
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Code
 *             properties:
 *               Code:
 *                 type: string
 *                 description: Verification code to check
 *                 pattern: '^[0-9]{4,10}$'
 *                 example: "123456"
 *               To:
 *                 type: string
 *                 description: Phone number (required if VerificationSid not provided)
 *                 example: "+1234567890"
 *               VerificationSid:
 *                 type: string
 *                 description: Verification SID (alternative to To)
 *                 example: "VE1234567890abcdef1234567890abcdef"
 *     responses:
 *       200:
 *         description: Verification check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sid:
 *                   type: string
 *                   description: Verification SID
 *                   example: "VE1234567890abcdef1234567890abcdef"
 *                 service_sid:
 *                   type: string
 *                   description: Service SID
 *                   example: "VA1234567890abcdef1234567890abcdef"
 *                 account_sid:
 *                   type: string
 *                   description: Account SID
 *                   example: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *                 to:
 *                   type: string
 *                   description: Phone number that was verified
 *                   example: "+1234567890"
 *                 channel:
 *                   type: string
 *                   description: Verification channel used
 *                   example: "whatsapp"
 *                 status:
 *                   type: string
 *                   description: Verification status
 *                   enum: [approved, failed]
 *                   example: "approved"
 *                 valid:
 *                   type: boolean
 *                   description: Whether verification is valid
 *                   example: true
 *                 date_created:
 *                   type: string
 *                   format: date-time
 *                   description: Creation timestamp
 *                 date_updated:
 *                   type: string
 *                   format: date-time
 *                   description: Last update timestamp
 *       400:
 *         description: Bad request - missing or invalid parameters
 *       404:
 *         description: Verification not found or invalid code
 *       429:
 *         description: Too many verification attempts
 */
router.post('/verify/v2/Services/:ServiceSid/VerificationCheck', 
  optionalAuth,
  verifyController.checkVerification.bind(verifyController)
);

/**
 * @swagger
 * /verify/v2/Services/{ServiceSid}/Verifications/{Sid}:
 *   get:
 *     summary: Get verification details
 *     description: |
 *       Retrieves details about a specific verification.
 *       Compatible with Twilio Verify API.
 *     tags:
 *       - Verify API
 *     parameters:
 *       - in: path
 *         name: ServiceSid
 *         required: true
 *         description: Service identifier
 *         schema:
 *           type: string
 *           example: "VA1234567890abcdef1234567890abcdef"
 *       - in: path
 *         name: Sid
 *         required: true
 *         description: Verification SID
 *         schema:
 *           type: string
 *           example: "VE1234567890abcdef1234567890abcdef"
 *     responses:
 *       200:
 *         description: Verification details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sid:
 *                   type: string
 *                   description: Verification SID
 *                   example: "VE1234567890abcdef1234567890abcdef"
 *                 service_sid:
 *                   type: string
 *                   description: Service SID
 *                   example: "VA1234567890abcdef1234567890abcdef"
 *                 account_sid:
 *                   type: string
 *                   description: Account SID
 *                   example: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *                 to:
 *                   type: string
 *                   description: Phone number being verified
 *                   example: "+1234567890"
 *                 channel:
 *                   type: string
 *                   description: Verification channel used
 *                   example: "whatsapp"
 *                 status:
 *                   type: string
 *                   description: Current verification status
 *                   enum: [pending, approved, failed, canceled]
 *                   example: "pending"
 *                 valid:
 *                   type: boolean
 *                   description: Whether verification is valid
 *                   example: false
 *                 date_created:
 *                   type: string
 *                   format: date-time
 *                   description: Creation timestamp
 *                 date_updated:
 *                   type: string
 *                   format: date-time
 *                   description: Last update timestamp
 *       404:
 *         description: Verification not found
 */
router.get('/verify/v2/Services/:ServiceSid/Verifications/:Sid', 
  optionalAuth,
  verifyController.getVerification.bind(verifyController)
);

export default router;