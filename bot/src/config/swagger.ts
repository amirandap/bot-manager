/**
 * Swagger/OpenAPI Configuration for WhatsApp Bot API
 * Documentación completa de todos los endpoints disponibles
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp Bot Manager API',
      version: '1.0.0',
      description: `
        API completa para gestión de bot de WhatsApp con soporte para mensajes de texto, 
        multimedia y administración de grupos.
        
        ## Características Principales
        - ✅ Envío de mensajes de texto
        - ✅ Envío de archivos multimedia (imágenes, videos, audio, documentos)
        - ✅ Gestión de grupos
        - ✅ Envío masivo (broadcast)
        - ✅ Validación automática de números de teléfono
        - ✅ Manejo robusto de errores
        - ✅ Logging y métricas PM2
        
        ## Autenticación
        Esta API no requiere autenticación externa, pero el bot debe estar conectado a WhatsApp.
        
        ## Límites de Archivos
        - **Imágenes**: 16MB máximo
        - **Videos**: 64MB máximo  
        - **Audio**: 16MB máximo
        - **Documentos**: 100MB máximo
      `,
      contact: {
        name: 'Bot Manager Support',
        email: 'support@botmanager.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo local'
      },
      {
        url: 'https://your-production-server.com',
        description: 'Servidor de producción'
      }
    ],
    tags: [
      {
        name: 'Mensajes',
        description: 'Endpoints para envío de mensajes de texto'
      },
      {
        name: 'Multimedia',
        description: 'Endpoints para envío de archivos multimedia'
      },
      {
        name: 'Grupos',
        description: 'Gestión y consulta de grupos de WhatsApp'
      },
      {
        name: 'Estado',
        description: 'Endpoints de estado y salud del sistema'
      }
    ],
    components: {
      schemas: {
        // ======================================================================
        // SCHEMAS DE RESPUESTA
        // ======================================================================
        StandardResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica si la operación fue exitosa'
            },
            messagesSent: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Lista de destinatarios donde se envió el mensaje exitosamente'
            },
            errors: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/MessageError'
              },
              description: 'Lista de errores ocurridos durante el envío'
            },
            totalSent: {
              type: 'integer',
              description: 'Número total de mensajes enviados exitosamente'
            },
            totalErrors: {
              type: 'integer',
              description: 'Número total de errores'
            },
            requestId: {
              type: 'string',
              description: 'Identificador único de la solicitud para tracking'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp ISO de cuando se procesó la solicitud'
            }
          },
          required: ['success', 'messagesSent', 'errors', 'requestId', 'timestamp']
        },
        MediaUploadResponse: {
          type: 'object',
          description: 'Respuesta exitosa del envío de multimedia',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Multimedia message sent successfully'
            },
            details: {
              type: 'object',
              properties: {
                messageType: {
                  type: 'string',
                  enum: ['image', 'video', 'audio', 'document'],
                  example: 'image'
                },
                recipientCount: {
                  type: 'number',
                  example: 3
                },
                successfulDeliveries: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  example: ['1234567890', '123456789-987654321@g.us']
                },
                fileInfo: {
                  type: 'object',
                  properties: {
                    filename: {
                      type: 'string',
                      example: 'image.jpg'
                    },
                    mimeType: {
                      type: 'string',
                      example: 'image/jpeg'
                    },
                    size: {
                      type: 'number',
                      example: 1024567
                    }
                  }
                }
              }
            }
          }
        },
        MediaResponse: {
          oneOf: [
            {
              $ref: '#/components/schemas/MediaUploadResponse'
            },
            {
              $ref: '#/components/schemas/ErrorResponse'
            }
          ]
        },
        MessageError: {
          type: 'object',
          properties: {
            recipient: {
              type: 'string',
              description: 'Destinatario donde ocurrió el error'
            },
            error: {
              type: 'string',
              description: 'Descripción del error'
            },
            errorType: {
              type: 'string',
              enum: ['VALIDATION_ERROR', 'WHATSAPP_ERROR', 'NETWORK_ERROR', 'CRITICAL_ERROR'],
              description: 'Tipo de error categorizado'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp cuando ocurrió el error'
            }
          },
          required: ['recipient', 'error', 'errorType', 'timestamp']
        },
        Group: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único del grupo en formato WhatsApp',
              example: '123456789-987654321@g.us'
            },
            name: {
              type: 'string',
              description: 'Nombre del grupo'
            },
            description: {
              type: 'string',
              description: 'Descripción del grupo'
            },
            participants: {
              type: 'integer',
              description: 'Número de participantes en el grupo'
            },
            isGroupAdmin: {
              type: 'boolean',
              description: 'Indica si el bot es administrador del grupo'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación del grupo'
            }
          },
          required: ['id', 'name', 'participants']
        },
        GroupsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            groups: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Group'
              }
            },
            totalGroups: {
              type: 'integer',
              description: 'Número total de grupos encontrados'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['success', 'groups', 'timestamp']
        },
        StatusResponse: {
          type: 'object',
          properties: {
            botId: {
              type: 'string',
              description: 'ID único del bot'
            },
            botName: {
              type: 'string',
              description: 'Nombre del bot'
            },
            isReady: {
              type: 'boolean',
              description: 'Indica si el cliente de WhatsApp está listo'
            },
            hasClient: {
              type: 'boolean',
              description: 'Indica si hay un cliente de WhatsApp inicializado'
            },
            qrCode: {
              type: 'string',
              description: 'Código QR para autenticación (solo si isReady=false)'
            },
            connectionState: {
              type: 'string',
              enum: ['CONNECTED', 'CONNECTING', 'DISCONNECTED', 'AUTHENTICATION_NEEDED'],
              description: 'Estado actual de la conexión'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['botId', 'botName', 'isReady', 'hasClient', 'timestamp']
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'starting', 'unhealthy'],
              description: 'Estado general del sistema'
            },
            ready: {
              type: 'boolean',
              description: 'Indica si el sistema está listo para recibir solicitudes'
            },
            uptime: {
              type: 'number',
              description: 'Tiempo activo del proceso en segundos'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['status', 'ready', 'uptime', 'timestamp']
        },
        
        // ======================================================================
        // SCHEMAS DE REQUEST
        // ======================================================================
        MessageRequest: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Contenido del mensaje de texto a enviar',
              example: 'Hola, este es un mensaje desde el bot!'
            }
          },
          required: ['message']
        },
        PhoneMessageRequest: {
          allOf: [
            {
              $ref: '#/components/schemas/MessageRequest'
            },
            {
              type: 'object',
              properties: {
                phoneNumber: {
                  oneOf: [
                    {
                      type: 'string',
                      description: 'Número de teléfono individual'
                    },
                    {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: 'Array de números de teléfono'
                    }
                  ],
                  example: '1234567890'
                }
              },
              required: ['phoneNumber']
            }
          ]
        },
        GroupMessageRequest: {
          allOf: [
            {
              $ref: '#/components/schemas/MessageRequest'
            },
            {
              type: 'object',
              properties: {
                groupId: {
                  oneOf: [
                    {
                      type: 'string',
                      description: 'ID de grupo individual'
                    },
                    {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: 'Array de IDs de grupo'
                    }
                  ],
                  example: '123456789-987654321@g.us'
                }
              },
              required: ['groupId']
            }
          ]
        },
        UnifiedMessageRequest: {
          type: 'object',
          description: 'Request schema para el endpoint unificado /send-message que maneja automáticamente texto y multimedia',
          properties: {
            to: {
              oneOf: [
                {
                  type: 'string',
                  description: 'Destinatario individual (número de teléfono o ID de grupo)',
                  example: '1234567890'
                },
                {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Lista de destinatarios mixtos (números de teléfono e IDs de grupo)',
                  example: ['1234567890', '123456789-987654321@g.us', '0987654321']
                }
              ]
            },
            message: {
              type: 'string',
              description: 'Mensaje de texto (requerido para texto solo, opcional para multimedia)',
              example: 'Hola, este es un mensaje desde el bot'
            },
            caption: {
              type: 'string',
              description: 'Caption para imágenes y videos (usado automáticamente para estos tipos)',
              example: '¡Mira esta increíble imagen!'
            }
          },
          required: ['to'],
          additionalProperties: false
        },
        MainMessageRequest: {
          allOf: [
            {
              $ref: '#/components/schemas/MessageRequest'
            },
            {
              type: 'object',
              properties: {
                to: {
                  oneOf: [
                    {
                      type: 'string',
                      description: 'Destinatario individual (número o grupo)'
                    },
                    {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      description: 'Lista de destinatarios (números y grupos)'
                    }
                  ],
                  example: ['1234567890', '123456789-987654321@g.us', '0987654321']
                },
                caption: {
                  type: 'string',
                  description: 'Caption para imágenes y videos (usado cuando se envía archivo multimedia)',
                  example: '¡Mira esta increíble imagen!'
                }
              },
              required: ['to']
            }
          ]
        },
        BroadcastRequest: {
          allOf: [
            {
              $ref: '#/components/schemas/MessageRequest'
            },
            {
              type: 'object',
              properties: {
                to: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Array mixto de números de teléfono e IDs de grupo',
                  example: ['1234567890', '123456789-987654321@g.us', '0987654321']
                }
              },
              required: ['to']
            }
          ]
        },
        SimpleMessageRequest: {
          allOf: [
            {
              $ref: '#/components/schemas/MessageRequest'
            },
            {
              type: 'object',
              properties: {
                to: {
                  oneOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    }
                  ],
                  description: 'Destinatario(s) - puede ser número de teléfono o ID de grupo'
                },
                phoneNumber: {
                  oneOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    }
                  ],
                  description: 'Número(s) de teléfono (alternativo a "to")'
                }
              }
            }
          ]
        },
        
        // ======================================================================
        // SCHEMAS DE ERROR
        // ======================================================================
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Descripción del error'
            },
            errorType: {
              type: 'string',
              enum: ['VALIDATION_ERROR', 'CLIENT_ERROR', 'CRITICAL_ERROR'],
              description: 'Categoría del error'
            },
            details: {
              type: 'string',
              description: 'Detalles adicionales del error'
            },
            requestId: {
              type: 'string',
              description: 'ID de la solicitud para debugging'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['success', 'error', 'requestId', 'timestamp']
        }
      },
      responses: {
        // ======================================================================
        // RESPUESTAS ESTÁNDAR
        // ======================================================================
        Success: {
          description: 'Operación exitosa',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/StandardResponse'
              }
            }
          }
        },
        PartialSuccess: {
          description: 'Operación parcialmente exitosa - algunos mensajes enviados, otros fallaron',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/StandardResponse'
              }
            }
          }
        },
        BadRequest: {
          description: 'Solicitud inválida - datos de entrada incorrectos',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'VALIDATION_ERROR: message is required',
                errorType: 'VALIDATION_ERROR',
                requestId: '12345abcde',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        ServiceUnavailable: {
          description: 'Cliente de WhatsApp no disponible',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'WhatsApp client not ready',
                errorType: 'CLIENT_ERROR',
                requestId: '12345abcde',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Error interno del servidor',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'CRITICAL_ERROR: Internal server error',
                errorType: 'CRITICAL_ERROR',
                details: 'Unexpected error occurred while processing request',
                requestId: '12345abcde',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        }
      },
      requestBodies: {
        // ======================================================================
        // REQUEST BODIES REUTILIZABLES
        // ======================================================================
        MediaUpload: {
          description: 'Archivo multimedia con destinatarios',
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Archivo a enviar'
                  },
                  to: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    description: 'Lista de destinatarios (números de teléfono e IDs de grupo)'
                  },
                  caption: {
                    type: 'string',
                    description: 'Texto que acompaña al archivo (para imágenes y videos)'
                  },
                  message: {
                    type: 'string',
                    description: 'Mensaje que acompaña al archivo (para documentos y audio)'
                  }
                },
                required: ['file', 'to']
              },
              encoding: {
                file: {
                  style: 'form'
                }
              }
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/utils/apiUtils.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
