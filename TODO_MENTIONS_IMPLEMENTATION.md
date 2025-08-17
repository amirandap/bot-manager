# TODO: Implementar Soporte Completo para Menciones en WhatsApp

## 📋 **Tarea: Agregar soporte para menciones (@mentions) en mensajes de WhatsApp**

### 🎯 **Objetivo:**
Permitir que los mensajes enviados a través del bot puedan mencionar usuarios específicos en grupos de WhatsApp, mostrando su nombre en lugar del número de teléfono.

### 🔍 **Problema Actual:**
- Los mensajes con `@18099916662` aparecen como texto plano en lugar de menciones activas
- El backend acepta el campo `mentions` pero no lo procesa correctamente
- El bot no implementa el formato de menciones requerido por WhatsApp.js

### 📚 **Documentación de WhatsApp.js:**
Según la documentación oficial de WhatsApp.js, las menciones se implementan así:

```javascript
// Formato correcto para menciones
await chat.sendMessage(`Hi @${userNumber}`, {
    mentions: [userContact]
});

// Ejemplo específico:
await chat.sendMessage('Hello @12345678901', {
    mentions: ['12345678901@c.us']
});
```

### 🛠️ **Archivos a Modificar:**

#### 1. **Backend - Middleware de Validación:**
- **Archivo:** `backend/src/middleware/jsonValidation.ts`
- **Cambios necesarios:**
  - Agregar validación para el campo `mentions` (array de strings)
  - Validar formato de menciones (`numerotelefono@c.us`)
  - Sincronizar menciones en el mensaje con el array `mentions`

#### 2. **Bot - Función de Envío de Texto:**
- **Archivo:** `bot/src/utils/textMessaging.ts`
- **Función:** `sendTextMessage()`
- **Cambios necesarios:**
  ```typescript
  // Agregar soporte para menciones en la función sendTextMessage
  export async function sendTextMessage(
    chatId: string, 
    message: string,
    mentions?: string[] // NUEVO PARÁMETRO
  ): Promise<any> {
    const client = getClient();
    
    // Si hay menciones, usar el formato correcto
    if (mentions && mentions.length > 0) {
      return await client.sendMessage(chatId, message, {
        mentions: mentions
      });
    }
    
    // Mensaje normal sin menciones
    return await client.sendMessage(chatId, message);
  }
  ```

#### 3. **Bot - Controller de Mensajes:**
- **Archivo:** `bot/src/controllers/MessageHandlerController.ts`
- **Función:** `sendMessageWithErrorHandling()`
- **Cambios necesarios:**
  - Pasar el campo `mentions` desde el request al `sendTextMessage()`
  - Validar que las menciones estén en el grupo antes de enviar

#### 4. **Backend - Documentación API:**
- **Archivo:** `backend/src/routes/botProxyRoutes.ts`
- **Cambios necesarios:**
  - Actualizar la documentación Swagger para incluir el campo `mentions`
  - Agregar ejemplos de uso con menciones

### 📝 **Payload de Ejemplo Esperado:**

```json
{
  "botId": "whatsapp-bot-1755381969910",
  "to": "120363309955564900@g.us",
  "message": "[COMERCIAL] {cardname}\n\n{cardlink}\n\n@18099916662",
  "mentions": ["18099916662@c.us"]
}
```

### ✅ **Criterios de Aceptación:**

1. **Funcionalidad:**
   - [ ] Los mensajes con menciones muestran el nombre del contacto en lugar del número
   - [ ] Las menciones funcionan en grupos de WhatsApp
   - [ ] El campo `mentions` es opcional (no rompe mensajes existentes)

2. **Validación:**
   - [ ] Validar formato de menciones (`numerotelefono@c.us`)
   - [ ] Validar que las menciones en el mensaje coincidan con el array `mentions`
   - [ ] Mostrar warnings si hay inconsistencias

3. **Compatibilidad:**
   - [ ] Los mensajes sin menciones siguen funcionando normalmente
   - [ ] Las integraciones existentes (Trello, etc.) no se rompen

### 🧪 **Casos de Prueba:**

1. **Mensaje con mención válida:**
   ```bash
   curl -X POST http://localhost:3001/api/bots/send-message \
     -H "Content-Type: application/json" \
     -d '{
       "botId": "whatsapp-bot-1755381969910",
       "to": "120363309955564900@g.us",
       "message": "Hola @18099916662, tienes una nueva tarea",
       "mentions": ["18099916662@c.us"]
     }'
   ```

2. **Mensaje con múltiples menciones:**
   ```bash
   curl -X POST http://localhost:3001/api/bots/send-message \
     -H "Content-Type: application/json" \
     -d '{
       "botId": "whatsapp-bot-1755381969910",
       "to": "120363309955564900@g.us",
       "message": "Reunión: @18099916662 @18095551234",
       "mentions": ["18099916662@c.us", "18095551234@c.us"]
     }'
   ```

3. **Mensaje sin menciones (debe funcionar normal):**
   ```bash
   curl -X POST http://localhost:3001/api/bots/send-message \
     -H "Content-Type: application/json" \
     -d '{
       "botId": "whatsapp-bot-1755381969910",
       "to": "120363309955564900@g.us",
       "message": "Mensaje normal sin menciones"
     }'
   ```

### 🔗 **Referencias:**
- [WhatsApp.js Documentation - Mentions](https://wwebjs.dev/guide/features/mentions.html)
- [WhatsApp.js GitHub Examples](https://github.com/pedroslopez/whatsapp-web.js/tree/main/example)

### 📅 **Prioridad:** Media
### ⏱️ **Estimación:** 2-3 horas de desarrollo + testing

---

**Notas adicionales:**
- Probar en un grupo real de WhatsApp para verificar que las menciones aparecen correctamente
- Considerar agregar logging específico para menciones para debugging
- Documentar el comportamiento en el README del proyecto
