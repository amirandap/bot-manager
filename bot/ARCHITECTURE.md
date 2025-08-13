# 🏗️ Bot Manager - Arquitectura Modular

## 📋 Índice
- [Principios de Modularidad](#principios-de-modularidad)
- [Estructura de Carpetas](#estructura-de-carpetas)
- [Diferencias entre Utils y Services](#diferencias-entre-utils-y-services)
- [Tipos y Interfaces](#tipos-y-interfaces)
- [Reglas de Dependencias](#reglas-de-dependencias)
- [Guías de Desarrollo](#guías-de-desarrollo)

## 🎯 Principios de Modularidad

### 1. **Separación de Responsabilidades**
- Cada módulo tiene una responsabilidad específica y bien definida
- No debe haber funcionalidades duplicadas entre módulos
- Los módulos deben ser cohesivos internamente y débilmente acoplados

### 2. **Jerarquía de Dependencias**
```
config/ (base layer)
  ↓
types/ (definitions)
  ↓
utils/ (pure functions)
  ↓
services/ (stateful operations)
  ↓
controllers/ (business logic)
  ↓
routes/ (HTTP endpoints)
  ↓
middleware/ (cross-cutting concerns)
```

### 3. **Principios SOLID Aplicados**
- **S**ingle Responsibility: Cada clase/función tiene una sola razón para cambiar
- **O**pen/Closed: Abierto para extensión, cerrado para modificación
- **L**iskov Substitution: Las clases derivadas deben ser sustituibles por sus clases base
- **I**nterface Segregation: Interfaces específicas mejor que una interfaz general
- **D**ependency Inversion: Depender de abstracciones, no de concreciones

## 📁 Estructura de Carpetas

### `/src/config/`
**Propósito**: Configuración y constantes del sistema
**Contenido**:
- `EnvironmentManager.ts` - Variables de entorno y configuración
- `PuppeteerConfig.ts` - Configuración específica del browser
- `URL.ts` - URLs y endpoints centralizados
- `clientExporter.ts` - Exportación del cliente WhatsApp

**Reglas**:
- ✅ Solo configuraciones y constantes
- ✅ No lógica de negocio
- ✅ Puede ser importado por cualquier módulo
- ❌ No debe importar services o controllers

### `/src/types/`
**Propósito**: Definiciones de tipos, interfaces y enums
**Contenido**:
- `types.ts` - Tipos específicos del dominio
- `index.ts` - Barrel export de todos los tipos

**Reglas**:
- ✅ Solo definiciones de tipos TypeScript
- ✅ Interfaces y enums
- ✅ Tipos de datos del dominio
- ❌ No implementaciones
- ❌ No lógica de negocio

### `/src/utils/`
**Propósito**: Funciones puras y utilidades sin estado
**Criterios para ser un Utils**:
- ✅ Funciones puras (misma entrada = misma salida)
- ✅ Sin estado interno persistente
- ✅ Reutilizable en múltiples contextos
- ✅ Fácil de testear unitariamente

**Archivos**:
- `loggerWrapper.ts` - Wrapper del sistema de logging
- `cleanAndFormatPhoneNumber.ts` - Formateo de números telefónicos
- `messageFormatter.ts` - Formateo de mensajes
- `recipientFormatting.ts` - Formateo de destinatarios
- `textMessaging.ts` - Utilidades de mensajería de texto
- `mediaUtils.ts` - Utilidades para manejo de media
- `groupUtils.ts` - Utilidades para grupos
- `errorHandler.ts` - Manejo centralizado de errores
- `requestValidator.ts` - Validación de requests
- `pm2Utils.ts` - Utilidades para PM2 y métricas
- `startupUtils.ts` - Utilidades de inicialización
- `browserUtils.ts` - Utilidades del navegador

**Anti-patrones**:
- ❌ No debe manejar estado persistente
- ❌ No debe hacer llamadas directas a APIs externas sin parámetros
- ❌ No debe contener lógica de negocio compleja

### `/src/services/`
**Propósito**: Clases con estado y operaciones complejas
**Criterios para ser un Service**:
- ✅ Maneja estado interno
- ✅ Operaciones complejas que requieren múltiples pasos
- ✅ Interacción con sistemas externos
- ✅ Gestión de recursos

**Archivos**:
- `DirectoryManagerService.ts` - Gestión del sistema de archivos
- `MediaMessagingService.ts` - Envío de mensajes multimedia
- `SMTPService.ts` - Servicio de email
- `UserDataService.ts` - Gestión de datos de usuario

**Responsabilidades**:
- ✅ Gestión de estado
- ✅ Operaciones CRUD
- ✅ Comunicación con APIs externas
- ✅ Gestión de recursos (archivos, conexiones, etc.)

### `/src/controllers/`
**Propósito**: Lógica de negocio y orquestación
**Contenido**:
- `MessageController.ts` - Control de mensajes
- `MessageHandlerController.ts` - Manejo de eventos de mensajes

**Responsabilidades**:
- ✅ Orquestación de services
- ✅ Lógica de negocio específica
- ✅ Validación de entrada
- ✅ Transformación de datos

### `/src/routes/`
**Propósito**: Endpoints HTTP y routing
**Estructura**:
```
routes/
├── unified/
│   └── messageRoutes.ts
├── sendMessage.ts
├── sendBroadcast.ts
├── sendToGroup.ts
└── ...
```

**Responsabilidades**:
- ✅ Definición de endpoints
- ✅ Validación de entrada HTTP
- ✅ Serialización de respuestas
- ✅ Manejo de errores HTTP

### `/src/middleware/`
**Propósito**: Funcionalidades transversales
**Contenido**:
- `botMiddleware.ts` - Middleware específico del bot

**Responsabilidades**:
- ✅ Autenticación y autorización
- ✅ Logging de requests
- ✅ Validación común
- ✅ Manejo de CORS

### `/src/validators/`
**Propósito**: Validaciones específicas del dominio
**Responsabilidades**:
- ✅ Validaciones complejas de negocio
- ✅ Schemas de validación
- ✅ Reglas de negocio para datos

## ⚖️ Diferencias entre Utils y Services

### 🔧 Utils (Funciones Puras)
```typescript
// ✅ CORRECTO - Función pura
export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

// ✅ CORRECTO - Utilidad sin estado
export function validateMessageFormat(message: string): boolean {
  return message.length > 0 && message.length <= 4096;
}
```

### 🏢 Services (Clases con Estado)
```typescript
// ✅ CORRECTO - Service con estado
export class MediaMessagingService {
  private uploadHistory: Map<string, string> = new Map();
  
  async sendImage(client: Client, recipients: string[], file: File): Promise<MediaResult> {
    // Lógica compleja con estado
  }
}

// ✅ CORRECTO - Service para recursos externos
export class DirectoryManagerService {
  ensureDirectoriesExist(): void {
    // Gestión de sistema de archivos
  }
}
```

## 🚫 Anti-Patrones Comunes

### ❌ Utils que NO deben existir
```typescript
// MAL - No es una función pura, tiene efectos secundarios
export function saveQRCode(qr: string): void {
  fs.writeFileSync('./qr.png', qr); // Efecto secundario
}

// MAL - Mezcla responsabilidades
export function initializeWhatsAppAndCreateDirectories(): void {
  // Hace demasiadas cosas
}
```

### ❌ Services mal diseñados
```typescript
// MAL - Es solo una función pura, no necesita ser service
export class PhoneFormatterService {
  formatPhone(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }
}
```

### ❌ Violaciones de arquitectura
```typescript
// MAL - Utils importando services
import { DirectoryManagerService } from '../services/DirectoryManagerService';

// MAL - Config importando controllers
import { MessageController } from '../controllers/MessageController';
```

## 📋 Reglas de Dependencias

### ✅ Dependencias Permitidas
```
config → types (OK)
utils → config, types (OK)
services → config, types, utils (OK)
controllers → config, types, utils, services (OK)
routes → config, types, utils, services, controllers (OK)
middleware → config, types, utils (OK)
```

### ❌ Dependencias Prohibidas
```
config → utils, services, controllers (NO)
types → cualquier implementación (NO)
utils → services, controllers (NO)
services → controllers, routes (NO)
```

## 🎯 Guías de Desarrollo

### 1. **¿Dónde poner nueva funcionalidad?**

**Pregúntate**:
1. ¿Es una función pura sin efectos secundarios? → `utils/`
2. ¿Maneja estado o recursos externos? → `services/`
3. ¿Orquesta múltiples services? → `controllers/`
4. ¿Es un endpoint HTTP? → `routes/`
5. ¿Es configuración? → `config/`
6. ¿Es una definición de tipo? → `types/`

### 2. **Naming Conventions**
- **Utils**: `camelCase` functions (ej: `formatPhoneNumber`)
- **Services**: `PascalCase` classes ending in `Service` (ej: `MediaMessagingService`)
- **Controllers**: `PascalCase` classes ending in `Controller` (ej: `MessageController`)
- **Types**: `PascalCase` interfaces/types (ej: `MessageFormat`, `BotConfig`)

### 3. **Testing Strategy**
- **Utils**: Unit tests (son funciones puras, fáciles de testear)
- **Services**: Unit + Integration tests (mockear dependencias externas)
- **Controllers**: Integration tests (testear orquestación)
- **Routes**: E2E tests (testear endpoints completos)

### 4. **Refactoring Guidelines**
- Si un util necesita estado → mover a service
- Si un service es solo funciones puras → mover a utils
- Si hay duplicación entre modules → crear util compartido
- Si un archivo crece mucho → dividir por responsabilidades

## 🔄 Proceso de Migración

### Cuando refactorices:
1. **Identifica el tipo correcto** según las reglas arriba
2. **Verifica dependencias** - no violes la jerarquía
3. **Actualiza imports** en todos los archivos afectados
4. **Ejecuta tests** para verificar que nada se rompió
5. **Actualiza documentación** si es necesario

### Checklist de validación:
- [ ] ¿El módulo está en la carpeta correcta?
- [ ] ¿Respeta la jerarquía de dependencias?
- [ ] ¿Tiene una sola responsabilidad clara?
- [ ] ¿Los nombres siguen las convenciones?
- [ ] ¿Los tests siguen funcionando?

---

**Recuerda**: La modularidad no es solo organizar archivos, es crear un sistema mantenible, testeable y escalable. Cada decisión de arquitectura debe justificarse en términos de estas metas.
