# 🤖 Bot Monitoring & Status System

Este documento explica el nuevo sistema de monitoreo del bot que funciona tanto con PM2 como sin él.

## 📊 Sistema de Estado Unificado

El bot ahora mantiene un archivo de estado `bot-status.json` que contiene toda la información sobre:
- Estado actual del bot
- Progreso de inicialización
- Historial de métricas
- Fallos y errores
- Información del proceso

### ✅ Características

- **Fallback automático**: Si no se ejecuta con PM2, usa archivo JSON
- **Estado en tiempo real**: Actualización continua del estado
- **Historial completo**: Mantiene registro de todos los eventos
- **Fácil visualización**: Scripts para ver el estado actual

## 🚀 Comandos Disponibles

### Ver Estado Actual
```bash
npm run view-status
```

### Ver Estado en Tiempo Real (Auto-refresh cada 3 segundos)
```bash
npm run view-status:watch
```

### Ayuda
```bash
npm run view-status -- --help
```

## 📁 Archivos de Estado

### bot-status.json
Archivo principal que contiene:

```json
{
  "process_info": {
    "pid": 12345,
    "started_at": "2025-08-10T15:30:00.000Z",
    "running_with_pm2": false,
    "node_version": "v18.17.0",
    "working_directory": "/path/to/bot"
  },
  "current_status": {
    "overall_status": "running",
    "current_step": "whatsapp_ready",
    "progress_percentage": 100,
    "last_update": "2025-08-10T15:35:00.000Z",
    "bot_ready": true,
    "api_ready": true,
    "whatsapp_connected": true
  },
  "metrics_history": [...],
  "failures": [...],
  "last_shutdown": {...}
}
```

## 🔧 Estados del Bot

### Estados Generales
- `starting` 🟡 - Bot iniciándose
- `running` 🟢 - Bot operativo
- `error` 🔴 - Bot con errores
- `stopped` ⚫ - Bot detenido

### Componentes
- **Bot Ready**: Sistema de bot inicializado
- **API Ready**: Servidor Express funcionando
- **WhatsApp Connected**: Cliente WhatsApp conectado

## 📈 Monitoreo de Progreso

### Pasos de Inicialización
1. **Validation** - Validación del entorno
2. **Lifecycle Init** - Inicialización del orquestador
3. **WhatsApp Client** - Inicialización del cliente WhatsApp
4. **Error Check** - Verificación de errores críticos
5. **API Setup** - Configuración del servidor API
6. **Shutdown Handlers** - Configuración de manejadores de cierre

### Progreso en Porcentaje
- 0-16%: Validación inicial
- 17-33%: Inicialización del orquestador
- 34-50%: Cliente WhatsApp
- 51-66%: Verificación de errores
- 67-83%: Servidor API
- 84-100%: Manejadores de cierre

## 🚨 Manejo de Errores

### Tipos de Errores
- **Critical**: Impiden el funcionamiento del bot
- **Recoverable**: Permiten operación limitada
- **Warnings**: No afectan funcionalidad principal

### Estados de Error WhatsApp
- `whatsapp_error_browser` - Error del navegador
- `whatsapp_error_chrome` - Error de Chrome
- `whatsapp_error_validation` - Error de validación
- `whatsapp_error_connection` - Error de conexión
- `whatsapp_error_authentication` - Error de autenticación
- `whatsapp_qr_error` - Error del código QR

## 💡 Uso Práctico

### Durante Desarrollo
```bash
# Terminal 1: Ejecutar el bot
npm run dev

# Terminal 2: Monitorear estado
npm run view-status:watch
```

### En Producción con PM2
```bash
# Iniciar con PM2
pm2 start ecosystem.config.js

# Ver estado del bot
npm run view-status

# Ver logs de PM2
pm2 logs
```

### En Producción sin PM2
```bash
# Ejecutar bot
npm start

# Monitorear en otra terminal
npm run view-status:watch
```

## 🔍 Diagnóstico de Problemas

### Bot no inicia
1. Verificar `bot-status.json` para errores específicos
2. Revisar failures en el archivo de estado
3. Verificar que Chrome esté instalado

### WhatsApp no conecta
1. Verificar estado: `whatsapp_connected: false`
2. Buscar errores relacionados con QR code
3. Verificar puertos disponibles

### API no responde
1. Verificar `api_ready: false`
2. Revisar conflictos de puerto
3. Verificar dependencias de WhatsApp

## 📊 Ejemplo de Output

```
🤖 BOT STATUS DASHBOARD
══════════════════════════════════════════════════

📋 PROCESS INFORMATION
   PID: 12345
   Started: 8/10/2025, 3:30:00 PM
   Node Version: v18.17.0
   Running with PM2: ❌ No
   Working Directory: /Users/user/bot

📊 CURRENT STATUS
   Overall Status: 🟢 RUNNING
   Current Step: whatsapp_ready
   Progress: 100%
   Last Update: 8/10/2025, 3:35:00 PM

🔧 COMPONENT STATUS
   Bot Ready: ✅
   API Ready: ✅
   WhatsApp Connected: ✅

💡 HEALTH SUMMARY
   🎉 Bot is fully operational and ready to process messages!
```

## 🛠️ Personalización

### Modificar Intervalo de Actualización
Editar `scripts/view-bot-status.ts`:
```typescript
// Cambiar 3000ms a otro valor
setTimeout(() => {
  console.clear();
  displayBotStatus();
}, 5000); // 5 segundos
```

### Agregar Nuevas Métricas
Editar `src/utils/pm2Utils.ts` para agregar campos al `BotStatusFile`.

### Customizar Visualización
Modificar `scripts/view-bot-status.ts` para cambiar el formato de salida.
