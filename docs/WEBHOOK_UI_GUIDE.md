# Webhook Monitoring UI - Quick Start Guide

## Overview

La nueva interfaz de **Webhook Monitoring** permite gestionar visualmente el reenvío automático de mensajes de grupos de WhatsApp a webhooks externos.

## Acceso a la UI

1. **Inicia el frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Abre el navegador:**
   ```
   http://localhost:7261
   ```

3. **Navega a la pestaña "Webhook Monitoring"** en el dashboard principal

## Características de la UI

### 📋 Vista de Grupos Monitoreados

- **Lista de grupos activos:** Ver todos los grupos que están siendo monitoreados
- **Estado visual:** Badge que indica si está activo (verde) o pausado (gris)
- **Configuración visible:** Ver qué opciones están habilitadas (adjuntos, metadata)
- **Múltiples webhooks:** Cada grupo puede tener varios webhooks configurados

### ➕ Agregar Nuevo Grupo

1. Click en **"Add Monitored Group"**
2. Selecciona el bot (si tienes múltiples bots)
3. Selecciona el grupo de WhatsApp del dropdown
4. Ingresa la URL del webhook
5. Configura opciones:
   - **Include Attachments:** Incluir imágenes, videos, documentos
   - **Include Metadata:** Incluir información del bot y timestamp
6. Click en **"Add Group"**

### ✏️ Editar Configuración

1. Click en el ícono de **editar (lápiz)** en cualquier grupo
2. Puedes modificar:
   - Nombre del grupo
   - Lista de webhooks (agregar/eliminar)
   - Opciones de adjuntos y metadata
   - Estado de monitoreo (activar/desactivar)
3. Click en **"Save Changes"**

### 🔌 Probar Webhook

1. Click en el ícono de **test (probeta)** junto a cualquier webhook
2. El sistema enviará un payload de prueba
3. Verás un mensaje de éxito o error con detalles

### ⏸️ Pausar/Reanudar Monitoreo

- Click en el ícono de **Power** para pausar temporalmente
- Click nuevamente para reanudar
- La configuración se mantiene intacta

### 🗑️ Eliminar Grupo o Webhook

- **Eliminar webhook específico:** Click en el ícono de basura junto al webhook
- **Eliminar grupo completo:** Click en el ícono de basura en la tarjeta del grupo
- Confirma la acción en el diálogo

## Flujo de Trabajo Típico

### Caso 1: Monitorear un Nuevo Grupo

```
1. Bot debe estar conectado (estado "Ready")
2. Click "Add Monitored Group"
3. Seleccionar grupo del dropdown
4. Ingresar webhook URL: https://tu-servidor.com/webhook
5. Activar "Include Attachments" si quieres archivos
6. Click "Add Group"
7. ✅ Los mensajes ahora se reenviarán automáticamente
```

### Caso 2: Agregar Webhook de Backup

```
1. Click "Edit" en un grupo existente
2. En la sección "Webhooks", agregar nueva URL en el input
3. Click "+" o presiona Enter
4. Click "Save Changes"
5. ✅ Ahora los mensajes van a ambos webhooks
```

### Caso 3: Pausar Monitoreo Temporalmente

```
1. Click en el ícono de "Power Off" en el grupo
2. El estado cambia a "Paused"
3. Los mensajes NO se reenviarán
4. Click "Power On" para reanudar cuando quieras
```

## Indicadores Visuales

### Estados del Bot
- ✅ **Bot nombre ✓** - Bot conectado y listo
- ⚠️ **Bot nombre ⚠** - Bot no está listo (esperando conexión)

### Estados del Grupo
- 🟢 **Active** (Badge verde) - Monitoreo activo
- ⚪ **Paused** (Badge gris) - Monitoreo pausado
- Opacidad reducida - Grupo deshabilitado

### Configuraciones
- 📷 **Attachments: Yes/No** - Incluye/excluye archivos adjuntos
- 📄 **Metadata: Yes/No** - Incluye/excluye información del bot

## Troubleshooting UI

### No veo grupos en el dropdown
**Solución:**
- Verifica que el bot esté conectado (estado "Ready")
- Asegúrate de que el bot sea miembro de grupos de WhatsApp
- Click en "Refresh" para recargar la lista

### El webhook falla al probar
**Solución:**
- Verifica que la URL sea accesible desde el servidor
- Usa HTTPS en producción
- Revisa que el servidor responda con status 200-299
- Verifica los logs del servidor webhook

### Los mensajes no se reenvían
**Solución:**
- Verifica que el grupo esté en estado "Active"
- Confirma que el webhook URL sea correcto
- Revisa los logs del bot: `pm2 logs wabot-PORT`
- Prueba el webhook con el botón de test

### Error al agregar grupo
**Solución:**
- El bot debe estar "Ready" (conectado a WhatsApp)
- La URL del webhook debe ser válida (http:// o https://)
- Verifica que seleccionaste un grupo del dropdown

## Componentes Creados

### Nuevos Archivos
- `/frontend/components/webhook-monitoring-dashboard.tsx` - Componente principal
- `/frontend/components/ui/switch.tsx` - Componente Switch de Radix UI

### Archivos Modificados
- `/frontend/components/bot-dashboard.tsx` - Agregada nueva pestaña "Webhook Monitoring"

## Estructura de Datos

### MonitoredGroup
```typescript
{
  groupId: string;          // ID del grupo (ej: "123-456@g.us")
  groupName?: string;       // Nombre descriptivo
  webhooks: string[];       // Array de URLs
  enabled: boolean;         // Si está activo
  includeAttachments: boolean;  // Incluir adjuntos
  includeMetadata: boolean;     // Incluir metadata
}
```

## API Endpoints Utilizados

La UI consume los siguientes endpoints del bot:

- `GET /api/monitored-groups/` - Listar grupos
- `POST /api/monitored-groups/add` - Agregar grupo
- `DELETE /api/monitored-groups/remove` - Eliminar grupo/webhook
- `POST /api/monitored-groups/toggle` - Activar/desactivar
- `POST /api/monitored-groups/update` - Actualizar configuración
- `POST /api/monitored-groups/test` - Probar webhook
- `GET /get-groups/` - Obtener grupos de WhatsApp disponibles

## Ejemplo de Uso Completo

### Escenario: Integrar grupo de soporte con CRM

1. **Preparación:**
   - Servidor CRM con endpoint: `https://crm.empresa.com/whatsapp-webhook`
   - Bot conectado y miembro del grupo "Soporte Técnico"

2. **Configuración en UI:**
   ```
   - Navegar a "Webhook Monitoring"
   - Click "Add Monitored Group"
   - Seleccionar "Soporte Técnico" del dropdown
   - Webhook URL: https://crm.empresa.com/whatsapp-webhook
   - Activar "Include Attachments" ✓
   - Activar "Include Metadata" ✓
   - Click "Add Group"
   ```

3. **Verificación:**
   ```
   - Click en ícono de "test" junto al webhook
   - Verificar respuesta exitosa
   - Enviar mensaje de prueba al grupo
   - Confirmar recepción en el CRM
   ```

4. **Resultado:**
   - ✅ Todos los mensajes del grupo llegan automáticamente al CRM
   - ✅ Imágenes y documentos incluidos en base64
   - ✅ Información de quién envió cada mensaje

## Próximos Pasos

- ✅ UI completamente funcional
- ⏳ Agregar tests automatizados
- 💡 Sugerencias de mejora:
  - Logs de mensajes reenviados
  - Estadísticas de uso
  - Filtros por tipo de mensaje
  - Webhooks condicionales (regex, palabras clave)

## Soporte

Para más detalles sobre el payload del webhook y casos de uso avanzados, consulta:
- `/docs/WEBHOOK_FORWARDING.md` - Documentación completa
- `/api-docs` - Swagger API Reference
- GitHub Issues para reportar problemas
