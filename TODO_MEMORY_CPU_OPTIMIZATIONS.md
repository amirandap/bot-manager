# TODO: Memory & CPU Optimizations

## Objetivo
Optimizar el uso de recursos eliminando límites de memoria y usando solo límites de CPU para restart en PM2.

## Tareas Pendientes



### 2. Eliminar límites de memoria en PM2 🔄 PENDIENTE
- **Archivos a modificar**:
  - `/home/linuxuser/bot-manager/bot/ecosystem.wabot-7202.config.js`
  - `/home/linuxuser/bot-manager/backend/ecosystem.config.js`
  - `/home/linuxuser/bot-manager/frontend/ecosystem.config.cjs`

#### 2.1 Bot Config (ecosystem.wabot-7202.config.js)
```javascript
// ELIMINAR:
max_memory_restart: '450M',
node_args: '--max-old-space-size=384 --gc-interval=100',

// AGREGAR límites de CPU:
max_cpu_percent: 80, // Restart si CPU > 80% por tiempo sostenido
```

#### 2.2 Backend Config (ecosystem.config.js)
```javascript
// ELIMINAR:
max_memory_restart: "1G",

// AGREGAR límites de CPU:
max_cpu_percent: 70, // Backend menos tolerante a CPU alto
```

#### 2.3 Frontend Config (ecosystem.config.cjs)
```javascript
// AGREGAR límites de CPU (actualmente no tiene límites):
max_cpu_percent: 60, // Frontend debería ser menos intensivo
```

### 3. Eliminar límites de memoria en Puppeteer 🔄 PENDIENTE
- **Archivo**: `/home/linuxuser/bot-manager/config/puppeteer.json`

#### 3.1 Sección performance - ELIMINAR
```json
// ELIMINAR estas líneas de args.performance:
"--max_old_space_size=128",
"--js-flags=--max-old-space-size=128",
"--memory-pressure-off",
"--aggressive-cache-discard",
"--purge-memory-button"
```

#### 3.2 Mantener optimizaciones de CPU
```json
// MANTENER (relacionadas con CPU, no memoria):
"--disable-background-timer-throttling",
"--disable-renderer-backgrounding", 
"--disable-backgrounding-occluded-windows",
"--enable-tcp-fast-open"
```

### 4. Actualizar método de sync monitoring 🔄 PENDIENTE
- **Archivo**: `/home/linuxuser/bot-manager/bot/src/services/WhatsAppSyncMonitorService.ts`

#### 4.1 Mantener porcentaje real de WhatsApp
```typescript
// MANTENER el porcentaje del evento loading_screen
// NO eliminar - es dato real de WhatsApp Web

// PERO actualizar métricas usando estados descriptivos:
const syncStates = {
  'CONNECTING': 'Connecting to WhatsApp',
  'AUTHENTICATING': 'Authenticating device', 
  'SYNCING_CHATS': 'Synchronizing chats',
  'FINALIZING_SYNC': 'Finalizing synchronization',
  'READY': 'Ready'
};
```

#### 4.2 Usar estados para métricas en lugar de porcentajes
```typescript
// En lugar de mostrar solo "67%", mostrar:
// "Synchronizing chats (67%)"
// "Finalizing synchronization (95%)"
```

### 5. Actualizar template de configuración 🔄 PENDIENTE
- **Archivo**: Template system para configuraciones de memoria/CPU

#### 5.1 Crear variables de template
```javascript
// config/templates/pm2-limits.template.js
{
  "cpu_limits": {
    "bot": 80,
    "backend": 70, 
    "frontend": 60
  },
  "memory_limits": {
    "enabled": false, // Deshabilitado
    "bot": null,
    "backend": null,
    "frontend": null
  }
}
```

### 6. Testing y validación 🔄 PENDIENTE

#### 6.1 Testear sin límites de memoria
- Monitorear uso de memoria real del sistema
- Verificar que no hay memory leaks
- Comprobar estabilidad a largo plazo

#### 6.2 Testear límites de CPU
- Verificar que PM2 reinicia correctamente con CPU alto
- Ajustar límites según rendimiento real
- Monitorear false positives de restart

#### 6.3 Validar sync monitoring mejorado
- Verificar que los estados descriptivos son más informativos
- Mantener el porcentaje real de WhatsApp pero con contexto
- Confirmar que las métricas son más claras para el usuario

## Notas importantes

### ⚠️ Hallazgo Crítico
**El porcentaje de sync NO debe eliminarse** - viene directamente de WhatsApp Web y es información valiosa para diagnóstico.

### 🎯 Enfoque Correcto
1. **MANTENER** el porcentaje real de WhatsApp 
2. **MEJORAR** la presentación con estados descriptivos
3. **ELIMINAR** solo las limitaciones artificiales de memoria
4. **IMPLEMENTAR** límites inteligentes de CPU

### 🔧 Orden de implementación
1. Primero: Eliminar límites de memoria en PM2 y Puppeteer
2. Segundo: Implementar límites de CPU en PM2 
3. Tercero: Mejorar presentación de estados de sync (mantener %)
4. Cuarto: Testing exhaustivo
5. Quinto: Documentar cambios y monitoreo

### 📝 Resultado esperado
- Sistema más estable sin limitaciones artificiales de memoria
- Restart inteligente basado en CPU real en lugar de memoria
- Información de sync más descriptiva pero manteniendo datos reales
- Mejor experiencia de usuario con estados contextualizados
