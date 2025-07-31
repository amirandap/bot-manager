# 📋 PROPUESTA DE ESTANDARIZACIÓN DE RUTAS

## 🎯 SEPARACIÓN DE RESPONSABILIDADES

### 1. **botsRoutes.ts** - ADMINISTRACIÓN DE BOTS
```
# CRUD de configuración de bots
GET    /api/bots                    # Listar todos los bots
GET    /api/bots/:id                # Obtener bot específico  
POST   /api/bots                    # Crear nueva configuración
PUT    /api/bots/:id                # Actualizar configuración
DELETE /api/bots/:id                # Eliminar configuración

# Gestión del ciclo de vida de bots
POST   /api/bots/spawn/whatsapp     # Crear y spawner nuevo bot
DELETE /api/bots/:id/terminate      # Terminar completamente un bot
POST   /api/bots/:id/start          # Iniciar bot existente
POST   /api/bots/:id/stop           # Detener bot
POST   /api/bots/:id/restart        # Reiniciar bot (PM2 restart)

# Estado administrativo
GET    /api/bots/sync/status        # Estado de sincronización config vs PM2

# Gestión PM2 específica
POST   /api/bots/:id/pm2/restart    # Reiniciar servicio PM2
POST   /api/bots/:id/pm2/recreate   # Recrear servicio PM2
GET    /api/bots/:id/pm2/status     # Estado detallado PM2
```

### 2. **botProxyRoutes.ts** - OPERACIONES DE BOT (Mensajería)
```
# Estado operacional de bots
POST   /api/bots/status             # Estado actual del bot (botId en body)
GET    /api/bots/:id/qr-code        # Obtener QR code para autenticación
POST   /api/bots/qr-code/update     # Actualizar QR code

# Configuración operacional
POST   /api/bots/change-fallback-number  # Cambiar número fallback
POST   /api/bots/change-port        # Cambiar puerto del bot

# Mensajería (botId en body)
POST   /api/bots/send-message       # Enviar mensaje
POST   /api/bots/get-groups         # Obtener grupos de WhatsApp
POST   /api/bots/pending            # Mensaje pendiente
POST   /api/bots/followup           # Mensaje de seguimiento
POST   /api/bots/receive-image-and-json  # Recibir imagen con JSON
POST   /api/bots/confirmation       # Mensaje de confirmación
```

### 3. **statusRoutes.ts** - ESTADO GENERAL DE SERVICIOS
```
GET    /api/status/discord          # Estado del servicio Discord
GET    /api/status/whatsapp         # Estado general WhatsApp
GET    /api/status/:id              # Estado de servicio específico
```

### 4. **deployRoutes.ts** - DESPLIEGUE
```
POST   /api/deploy/webhook          # Webhook de Git
POST   /api/deploy/trigger          # Despliegue manual
GET    /api/deploy/status           # Estado del despliegue
GET    /api/deploy/history          # Historial de despliegues
GET    /api/deploy/health           # Health check
```

## ✅ CONFLICTOS RESUELTOS

### 1. **Reinicio de bots - ✅ RESUELTO**
- ~~**botsRoutes.ts**: `POST /api/bots/:id/restart` (ID en URL)~~
- ~~**botProxyRoutes.ts**: `POST /api/bots/restart` (botId en body)~~
  
**✅ SOLUCIÓN APLICADA**: Se eliminó `POST /api/bots/restart` de botProxyRoutes.ts. Solo queda la ruta en botsRoutes.ts.

### 2. **Estado de bots - ✅ RESUELTO**
- ~~**botProxyRoutes.ts**: `POST /api/bots/status` Y `GET /api/bots/:id/status`~~
- ~~**statusRoutes.ts**: `GET /api/status/:id`~~

**✅ SOLUCIÓN APLICADA**: 
- Se mantiene `GET /api/bots/:id/status` en botProxyRoutes.ts para estado operacional
- Se mantiene `GET /api/status/:id` en statusRoutes.ts para estado general de servicios
- Se eliminó `POST /api/bots/status` (redundante)

## 🎯 CONFIGURACIÓN FINAL PARA ZAPIER ✅ FUNCIONANDO
Con esta estandarización, Zapier usará:
```
URL: https://wapi.softgrouprd.com/api/bots/send-message
Body: {
  "botId": "whatsapp-bot-1753798189240",
  "phoneNumber": ["+18495078547", "+18294740123", "+18495078653", "+18495815946"],
  "message": "Tu mensaje",
  "groupId": "120363280706945135@g.us"
}
```

## 📋 RESUMEN DE CAMBIOS IMPLEMENTADOS

### ✅ Archivos Modificados:
1. **backend/src/routes/botProxyRoutes.ts** - Eliminadas rutas conflictivas
2. **backend/src/controllers/botProxyController.ts** - Eliminados métodos obsoletos
3. **backend/src/routes/botsRoutes.ts** - Limpiado de duplicaciones

### 🔄 Próximos Pasos:
1. ✅ Actualizar Swagger documentation
2. ✅ Verificar frontend references
3. ✅ Probar endpoints
