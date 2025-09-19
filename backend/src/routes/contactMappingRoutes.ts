import { Router } from 'express';
import { ContactMappingController } from '../controllers/ContactMappingController';

const router = Router();
const contactMappingController = new ContactMappingController();

/**
 * @swagger
 * components:
 *   schemas:
 *     ContactMapping:
 *       type: object
 *       required:
 *         - externalsource
 *         - externalid
 *         - phonenumber
 *       properties:
 *         externalsource:
 *           type: string
 *           description: External source system (e.g., trellousername, slack, etc.)
 *           example: trellousername
 *         externalid:
 *           type: string
 *           description: External identifier within the source system
 *           example: "@logistica_softgroup"
 *         phonenumber:
 *           type: string
 *           description: Phone number in international format
 *           example: "+18091234567"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/contacts/mappings:
 *   get:
 *     summary: Get all contact mappings
 *     tags: [Contact Mappings]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of mappings to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of mappings to skip
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by external source
 *     responses:
 *       200:
 *         description: List of contact mappings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     mappings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ContactMapping'
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 */
router.get('/mappings', contactMappingController.getAllMappings.bind(contactMappingController));

/**
 * @swagger
 * /api/contacts/lookup/{source}/{id}:
 *   get:
 *     summary: Look up phone number by external source and ID
 *     tags: [Contact Mappings]
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *         description: External source system
 *         example: trellousername
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: External identifier
 *         example: "@logistica_softgroup"
 *     responses:
 *       200:
 *         description: Contact found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     found:
 *                       type: boolean
 *                     phonenumber:
 *                       type: string
 *                     mapping:
 *                       $ref: '#/components/schemas/ContactMapping'
 *       404:
 *         description: Contact not found
 */
router.get('/lookup/:source/:id', contactMappingController.lookupContact.bind(contactMappingController));

/**
 * @swagger
 * /api/contacts/mappings:
 *   post:
 *     summary: Add new contact mapping
 *     tags: [Contact Mappings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - externalsource
 *               - externalid
 *               - phonenumber
 *             properties:
 *               externalsource:
 *                 type: string
 *                 example: trellousername
 *               externalid:
 *                 type: string
 *                 example: "@logistica_softgroup"
 *               phonenumber:
 *                 type: string
 *                 example: "+18091234567"
 *     responses:
 *       201:
 *         description: Contact mapping created successfully
 *       409:
 *         description: Contact mapping already exists
 *       400:
 *         description: Invalid request data
 */
router.post('/mappings', contactMappingController.addMapping.bind(contactMappingController));

/**
 * @swagger
 * /api/contacts/mappings/{source}/{id}:
 *   put:
 *     summary: Update existing contact mapping
 *     tags: [Contact Mappings]
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *         description: External source system
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: External identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phonenumber
 *             properties:
 *               phonenumber:
 *                 type: string
 *                 example: "+18091234567"
 *     responses:
 *       200:
 *         description: Contact mapping updated successfully
 *       404:
 *         description: Contact mapping not found
 *       400:
 *         description: Invalid request data
 */
router.put('/mappings/:source/:id', contactMappingController.updateMapping.bind(contactMappingController));

/**
 * @swagger
 * /api/contacts/mappings/{source}/{id}:
 *   delete:
 *     summary: Delete contact mapping
 *     tags: [Contact Mappings]
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *         description: External source system
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: External identifier
 *     responses:
 *       200:
 *         description: Contact mapping deleted successfully
 *       404:
 *         description: Contact mapping not found
 */
router.delete('/mappings/:source/:id', contactMappingController.deleteMapping.bind(contactMappingController));

/**
 * @swagger
 * /api/contacts/mappings/all:
 *   delete:
 *     summary: Delete all contact mappings
 *     tags: [Contact Mappings]
 *     responses:
 *       200:
 *         description: All contact mappings deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 */
router.delete('/mappings/all', contactMappingController.deleteAllMappings.bind(contactMappingController));

/**
 * @swagger
 * /api/contacts/stats:
 *   get:
 *     summary: Get database statistics
 *     tags: [Contact Mappings]
 *     responses:
 *       200:
 *         description: Database statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalMappings:
 *                       type: integer
 *                     uniqueSources:
 *                       type: integer
 *                     dbPath:
 *                       type: string
 *                     health:
 *                       type: object
 *                       properties:
 *                         healthy:
 *                           type: boolean
 */
router.get('/stats', contactMappingController.getStats.bind(contactMappingController));

/**
 * @swagger
 * /api/contacts/unknown:
 *   get:
 *     summary: Get unknown contacts that need mapping
 *     tags: [Contact Mappings]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, resolved, ignored, all]
 *           default: pending
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of unknown contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     unknownContacts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           externalsource:
 *                             type: string
 *                           externalid:
 *                             type: string
 *                           first_seen:
 *                             type: string
 *                           last_seen:
 *                             type: string
 *                           attempt_count:
 *                             type: integer
 *                           status:
 *                             type: string
 *                     count:
 *                       type: integer
 *                     status:
 *                       type: string
 */
router.get('/unknown', contactMappingController.getUnknownContacts.bind(contactMappingController));

/**
 * @swagger
 * /api/contacts/unknown/{source}/{id}/ignore:
 *   put:
 *     summary: Mark unknown contact as ignored
 *     tags: [Contact Mappings]
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *         description: External source system
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: External identifier
 *     responses:
 *       200:
 *         description: Unknown contact marked as ignored successfully
 *       404:
 *         description: Unknown contact not found
 */
router.put('/unknown/:source/:id/ignore', contactMappingController.ignoreUnknownContact.bind(contactMappingController));

/**
 * @swagger
 * /api/contacts/bulk-import:
 *   post:
 *     summary: Bulk import contact mappings
 *     tags: [Contact Mappings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mappings
 *             properties:
 *               mappings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - externalsource
 *                     - externalid
 *                     - phonenumber
 *                   properties:
 *                     externalsource:
 *                       type: string
 *                     externalid:
 *                       type: string
 *                     phonenumber:
 *                       type: string
 *           example:
 *             mappings:
 *               - externalsource: "trellousername"
 *                 externalid: "@logistica_softgroup"
 *                 phonenumber: "+18091234567"
 *               - externalsource: "trellousername"
 *                 externalid: "@marketing_team"
 *                 phonenumber: "+18091234568"
 *     responses:
 *       201:
 *         description: All mappings imported successfully
 *       207:
 *         description: Partial success - some mappings failed
 *       400:
 *         description: Invalid request data
 */
router.post('/bulk-import', contactMappingController.bulkImport.bind(contactMappingController));

export default router;