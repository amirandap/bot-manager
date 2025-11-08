import { Router, Request, Response } from 'express';
import { groupWebhookService } from '../services/GroupWebhookService';
import { logger } from '../services/LoggerService';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Grupos Monitoreados
 *     description: Gestión de grupos de WhatsApp monitoreados para reenvío automático a webhooks externos
 * 
 * components:
 *   schemas:
 *     MonitoredGroup:
 *       type: object
 *       properties:
 *         groupId:
 *           type: string
 *           description: ID único del grupo de WhatsApp
 *           example: "123456789-111222333@g.us"
 *         groupName:
 *           type: string
 *           description: Nombre del grupo (opcional)
 *           example: "Equipo de Marketing"
 *         webhooks:
 *           type: array
 *           items:
 *             type: string
 *           description: URLs de webhooks donde se reenviarán los mensajes
 *           example: ["https://mi-servidor.com/webhook", "https://backup.com/webhook"]
 *         enabled:
 *           type: boolean
 *           description: Si el monitoreo está activo
 *           example: true
 *         includeAttachments:
 *           type: boolean
 *           description: Si se incluyen archivos adjuntos (imágenes, videos, documentos)
 *           example: true
 *         includeMetadata:
 *           type: boolean
 *           description: Si se incluye metadata del bot (ID, nombre, timestamp)
 *           example: true
 *     
 *     WebhookPayload:
 *       type: object
 *       description: Payload enviado al webhook cuando se recibe un mensaje
 *       properties:
 *         messageId:
 *           type: string
 *           example: "3EB0E8D6A5C5E5E5E5E5"
 *         groupId:
 *           type: string
 *           example: "123456789-111222333@g.us"
 *         groupName:
 *           type: string
 *           example: "Equipo de Marketing"
 *         senderId:
 *           type: string
 *           example: "521234567890@c.us"
 *         senderName:
 *           type: string
 *           example: "Juan Pérez"
 *         timestamp:
 *           type: number
 *           example: 1699468800
 *         message:
 *           type: string
 *           example: "Hola, este es un mensaje del grupo"
 *         messageType:
 *           type: string
 *           enum: [text, image, document, audio, video, sticker, other]
 *           example: "text"
 *         hasMedia:
 *           type: boolean
 *           example: false
 *         isForwarded:
 *           type: boolean
 *           example: false
 *         isReply:
 *           type: boolean
 *           example: false
 *         quotedMessage:
 *           type: object
 *           properties:
 *             senderId:
 *               type: string
 *             message:
 *               type: string
 *         attachment:
 *           type: object
 *           properties:
 *             filename:
 *               type: string
 *               example: "imagen.jpg"
 *             mimetype:
 *               type: string
 *               example: "image/jpeg"
 *             data:
 *               type: string
 *               description: Contenido del archivo en base64
 *               example: "iVBORw0KGgoAAAANSUhEUgAA..."
 *             size:
 *               type: number
 *               description: Tamaño en bytes
 *               example: 245678
 *         metadata:
 *           type: object
 *           properties:
 *             botId:
 *               type: string
 *             botName:
 *               type: string
 *             forwardedAt:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * /api/monitored-groups/:
 *   get:
 *     tags: [Grupos Monitoreados]
 *     summary: Obtener lista de grupos monitoreados
 *     description: |
 *       Devuelve la lista completa de grupos de WhatsApp que están siendo monitoreados
 *       para reenvío automático de mensajes a webhooks externos.
 *     responses:
 *       200:
 *         description: Lista de grupos monitoreados obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 groups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MonitoredGroup'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             examples:
 *               multiple_groups:
 *                 summary: Múltiples grupos monitoreados
 *                 value:
 *                   success: true
 *                   groups:
 *                     - groupId: "123456789-111222333@g.us"
 *                       groupName: "Equipo de Marketing"
 *                       webhooks: ["https://mi-servidor.com/webhook"]
 *                       enabled: true
 *                       includeAttachments: true
 *                       includeMetadata: true
 *                     - groupId: "987654321-444555666@g.us"
 *                       groupName: "Soporte Técnico"
 *                       webhooks: ["https://soporte.com/webhook", "https://backup.com/webhook"]
 *                       enabled: false
 *                       includeAttachments: false
 *                       includeMetadata: true
 *                   timestamp: "2025-11-08T12:00:00.000Z"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const groups = groupWebhookService.getMonitoredGroups();
    res.json({ success: true, groups, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error(`Failed to get monitored groups: ${error}`);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @swagger
 * /api/monitored-groups/add:
 *   post:
 *     tags: [Grupos Monitoreados]
 *     summary: Agregar webhook a un grupo monitoreado
 *     description: |
 *       Agrega un webhook a un grupo existente o crea un nuevo grupo monitoreado.
 *       Si el grupo ya existe, el webhook se añade a la lista.
 *       Si el webhook ya está registrado, no se duplica.
 *       
 *       **¿Cómo obtener el groupId?**
 *       - Usar el endpoint `/get-groups` para listar todos los grupos
 *       - Buscar grupos con `isGroup: true` y copiar `id._serialized`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - webhookUrl
 *             properties:
 *               groupId:
 *                 type: string
 *                 description: ID único del grupo de WhatsApp (formato @g.us)
 *                 example: "123456789-111222333@g.us"
 *               webhookUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL del webhook donde se reenviarán los mensajes
 *                 example: "https://mi-servidor.com/webhook/messages"
 *               groupName:
 *                 type: string
 *                 description: Nombre descriptivo del grupo (opcional)
 *                 example: "Equipo de Marketing"
 *               includeAttachments:
 *                 type: boolean
 *                 description: Si se deben incluir archivos adjuntos (imágenes, videos, etc.)
 *                 default: true
 *                 example: true
 *               includeMetadata:
 *                 type: boolean
 *                 description: Si se debe incluir metadata del bot (ID, nombre, timestamp)
 *                 default: true
 *                 example: true
 *           examples:
 *             basic:
 *               summary: Configuración básica
 *               value:
 *                 groupId: "123456789-111222333@g.us"
 *                 webhookUrl: "https://mi-servidor.com/webhook"
 *             complete:
 *               summary: Configuración completa
 *               value:
 *                 groupId: "123456789-111222333@g.us"
 *                 webhookUrl: "https://mi-servidor.com/webhook/messages"
 *                 groupName: "Equipo de Marketing"
 *                 includeAttachments: true
 *                 includeMetadata: true
 *             no_attachments:
 *               summary: Sin adjuntos
 *               value:
 *                 groupId: "987654321-444555666@g.us"
 *                 webhookUrl: "https://soporte.com/webhook"
 *                 groupName: "Soporte Técnico"
 *                 includeAttachments: false
 *                 includeMetadata: false
 *     responses:
 *       200:
 *         description: Webhook agregado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Monitored group added"
 *                 groupId:
 *                   type: string
 *                 webhookUrl:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Parámetros faltantes o inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "groupId and webhookUrl are required"
 *       500:
 *         description: Error interno del servidor
 */
router.post('/add', async (req: Request, res: Response) => {
  const { groupId, webhookUrl, groupName, includeAttachments, includeMetadata } = req.body;

  if (!groupId || !webhookUrl) {
    return res.status(400).json({ success: false, error: 'groupId and webhookUrl are required' });
  }

  try {
    await groupWebhookService.addMonitoredGroup(groupId, webhookUrl, {
      groupName,
      includeAttachments,
      includeMetadata,
    });

    res.json({ success: true, message: 'Monitored group added', groupId, webhookUrl, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error(`Error adding monitored group: ${error}`);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @swagger
 * /api/monitored-groups/remove:
 *   delete:
 *     tags: [Grupos Monitoreados]
 *     summary: Eliminar webhook o grupo monitoreado completo
 *     description: |
 *       Elimina un webhook específico de un grupo o elimina el grupo completo
 *       del monitoreo si no se especifica un webhook.
 *       
 *       - Si se proporciona `webhookUrl`: elimina solo ese webhook del grupo
 *       - Si NO se proporciona `webhookUrl`: elimina el grupo completo
 *       - Si un grupo se queda sin webhooks, se elimina automáticamente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *             properties:
 *               groupId:
 *                 type: string
 *                 description: ID del grupo de WhatsApp
 *                 example: "123456789-111222333@g.us"
 *               webhookUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL del webhook a eliminar (opcional, si se omite elimina el grupo completo)
 *                 example: "https://mi-servidor.com/webhook"
 *           examples:
 *             remove_webhook:
 *               summary: Eliminar webhook específico
 *               value:
 *                 groupId: "123456789-111222333@g.us"
 *                 webhookUrl: "https://mi-servidor.com/webhook"
 *             remove_group:
 *               summary: Eliminar grupo completo
 *               value:
 *                 groupId: "123456789-111222333@g.us"
 *     responses:
 *       200:
 *         description: Webhook o grupo eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Monitored group updated/removed"
 *                 groupId:
 *                   type: string
 *                 webhookUrl:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: groupId requerido
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/remove', async (req: Request, res: Response) => {
  const { groupId, webhookUrl } = req.body;

  if (!groupId) {
    return res.status(400).json({ success: false, error: 'groupId is required' });
  }

  try {
    await groupWebhookService.removeMonitoredGroup(groupId, webhookUrl);
    res.json({ success: true, message: 'Monitored group updated/removed', groupId, webhookUrl, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error(`Error removing monitored group: ${error}`);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @swagger
 * /api/monitored-groups/toggle:
 *   post:
 *     tags: [Grupos Monitoreados]
 *     summary: Habilitar o deshabilitar monitoreo de un grupo
 *     description: |
 *       Activa o desactiva el monitoreo de un grupo sin eliminar su configuración.
 *       Útil para pausar temporalmente el reenvío de mensajes.
 *       
 *       - `enabled: true`: activa el monitoreo y reenvío de mensajes
 *       - `enabled: false`: pausa el monitoreo (la configuración se mantiene)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - enabled
 *             properties:
 *               groupId:
 *                 type: string
 *                 description: ID del grupo de WhatsApp
 *                 example: "123456789-111222333@g.us"
 *               enabled:
 *                 type: boolean
 *                 description: true para activar, false para desactivar
 *                 example: true
 *           examples:
 *             enable:
 *               summary: Activar monitoreo
 *               value:
 *                 groupId: "123456789-111222333@g.us"
 *                 enabled: true
 *             disable:
 *               summary: Desactivar monitoreo
 *               value:
 *                 groupId: "123456789-111222333@g.us"
 *                 enabled: false
 *     responses:
 *       200:
 *         description: Estado de monitoreo actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Monitoring enabled for 123456789-111222333@g.us"
 *                 groupId:
 *                   type: string
 *                 enabled:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Parámetros faltantes o inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "groupId and enabled(boolean) are required"
 *       500:
 *         description: Error interno del servidor
 */
router.post('/toggle', async (req: Request, res: Response) => {
  const { groupId, enabled } = req.body;

  if (!groupId || typeof enabled !== 'boolean') {
    return res.status(400).json({ success: false, error: 'groupId and enabled(boolean) are required' });
  }

  try {
    await groupWebhookService.toggleMonitoredGroup(groupId, enabled);
    res.json({ success: true, message: `Monitoring ${enabled ? 'enabled' : 'disabled'} for ${groupId}`, groupId, enabled, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error(`Error toggling monitored group: ${error}`);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @swagger
 * /api/monitored-groups/update:
 *   post:
 *     tags: [Grupos Monitoreados]
 *     summary: Actualizar configuración de un grupo monitoreado
 *     description: |
 *       Actualiza la configuración de un grupo monitoreado existente.
 *       Permite modificar cualquier propiedad excepto el groupId.
 *       
 *       **Propiedades actualizables:**
 *       - `groupName`: nombre descriptivo del grupo
 *       - `webhooks`: lista completa de webhooks
 *       - `enabled`: activar/desactivar monitoreo
 *       - `includeAttachments`: incluir o no archivos adjuntos
 *       - `includeMetadata`: incluir o no metadata del bot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - updates
 *             properties:
 *               groupId:
 *                 type: string
 *                 description: ID del grupo de WhatsApp
 *                 example: "123456789-111222333@g.us"
 *               updates:
 *                 type: object
 *                 description: Objeto con las propiedades a actualizar
 *                 properties:
 *                   groupName:
 *                     type: string
 *                   webhooks:
 *                     type: array
 *                     items:
 *                       type: string
 *                   enabled:
 *                     type: boolean
 *                   includeAttachments:
 *                     type: boolean
 *                   includeMetadata:
 *                     type: boolean
 *           examples:
 *             update_name:
 *               summary: Actualizar nombre del grupo
 *               value:
 *                 groupId: "123456789-111222333@g.us"
 *                 updates:
 *                   groupName: "Nuevo Nombre del Equipo"
 *             update_webhooks:
 *               summary: Actualizar lista de webhooks
 *               value:
 *                 groupId: "123456789-111222333@g.us"
 *                 updates:
 *                   webhooks: ["https://nuevo.com/webhook", "https://backup.com/webhook"]
 *             update_settings:
 *               summary: Actualizar configuraciones
 *               value:
 *                 groupId: "123456789-111222333@g.us"
 *                 updates:
 *                   includeAttachments: false
 *                   includeMetadata: true
 *                   enabled: true
 *             update_multiple:
 *               summary: Actualizar múltiples propiedades
 *               value:
 *                 groupId: "123456789-111222333@g.us"
 *                 updates:
 *                   groupName: "Equipo Actualizado"
 *                   webhooks: ["https://api.example.com/webhook"]
 *                   includeAttachments: true
 *                   includeMetadata: true
 *                   enabled: true
 *     responses:
 *       200:
 *         description: Configuración actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Group configuration updated"
 *                 groupId:
 *                   type: string
 *                 updates:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Parámetros faltantes o inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post('/update', async (req: Request, res: Response) => {
  const { groupId, updates } = req.body;

  if (!groupId || !updates) {
    return res.status(400).json({ success: false, error: 'groupId and updates are required' });
  }

  try {
    await groupWebhookService.updateGroupConfig(groupId, updates);
    res.json({ success: true, message: 'Group configuration updated', groupId, updates, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error(`Error updating monitored group: ${error}`);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @swagger
 * /api/monitored-groups/test:
 *   post:
 *     tags: [Grupos Monitoreados]
 *     summary: Probar conectividad de un webhook
 *     description: |
 *       Envía un payload de prueba a un webhook para verificar que esté funcionando correctamente.
 *       
 *       **Payload de prueba enviado:**
 *       ```json
 *       {
 *         "test": true,
 *         "message": "This is a test webhook from WhatsApp Bot",
 *         "timestamp": 1699468800000
 *       }
 *       ```
 *       
 *       El webhook debe responder con status 2xx para considerarse exitoso.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - webhookUrl
 *             properties:
 *               webhookUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL del webhook a probar
 *                 example: "https://mi-servidor.com/webhook"
 *           examples:
 *             test_webhook:
 *               summary: Probar webhook
 *               value:
 *                 webhookUrl: "https://mi-servidor.com/webhook/messages"
 *     responses:
 *       200:
 *         description: Resultado de la prueba del webhook
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: true si el webhook respondió correctamente
 *                   example: true
 *                 message:
 *                   type: string
 *                   description: Mensaje descriptivo del resultado
 *                   example: "Webhook responded with status 200"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             examples:
 *               success:
 *                 summary: Webhook funcionando
 *                 value:
 *                   success: true
 *                   message: "Webhook responded with status 200"
 *                   timestamp: "2025-11-08T12:00:00.000Z"
 *               failure:
 *                 summary: Webhook con error
 *                 value:
 *                   success: false
 *                   message: "connect ECONNREFUSED 127.0.0.1:3000"
 *                   timestamp: "2025-11-08T12:00:00.000Z"
 *       400:
 *         description: webhookUrl requerido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "webhookUrl is required"
 *       500:
 *         description: Error interno del servidor
 */
router.post('/test', async (req: Request, res: Response) => {
  const { webhookUrl } = req.body;

  if (!webhookUrl) {
    return res.status(400).json({ success: false, error: 'webhookUrl is required' });
  }

  try {
    const result = await groupWebhookService.testWebhook(webhookUrl);
    res.json({ success: result.success, message: result.message, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error(`Error testing webhook: ${error}`);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
