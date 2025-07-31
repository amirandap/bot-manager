# Formateo de Números de Teléfono - Bot WhatsApp

## Problema Identificado

El bot está fallando al enviar mensajes a números de teléfono dominicanos porque no están correctamente formateados.

### Números que fallan:

- `18298870174` (sin el prefijo +)
- `18093186486` (sin el prefijo +)

## Formato Esperado por WhatsApp Web.js

La librería `whatsapp-web.js` espera números de teléfono en el formato:

```
{número_sin_+}@c.us
```

### Ejemplos:

- ✅ Correcto: `18298870174@c.us`
- ❌ Incorrecto: `+18298870174@c.us`

## Lógica de Formateo Mejorada

### 1. Función `cleanAndFormatPhoneNumber`

- **Limpia** el número removiendo caracteres especiales excepto `+`
- **Detecta** números dominicanos automáticamente
- **Agrega** el código de país `+1` si falta
- **Valida** la longitud y formato del número

### 2. Detección de Números Dominicanos

```typescript
// Números completos: 1809XXXXXXX, 1829XXXXXXX, 1849XXXXXXX
if (/^(1809|1829|1849)\d{7}$/.test(finalNumber)) {
  finalNumber = `+${finalNumber}`;
}

// Números cortos: 809XXXXXXX, 829XXXXXXX, 849XXXXXXX
else if (/^(809|829|849)\d{7}$/.test(finalNumber)) {
  finalNumber = `+1${finalNumber}`;
}
```

### 3. Formateo Final para WhatsApp

```typescript
// Remover + y agregar @c.us
const whatsappNumber = cleanedPhoneNumber.startsWith("+")
  ? cleanedPhoneNumber.slice(1)
  : cleanedPhoneNumber;
const formattedPhoneNumber = `${whatsappNumber.trim()}@c.us`;
```

## Ejemplos de Transformación

| Entrada        | Procesado      | WhatsApp Format    |
| -------------- | -------------- | ------------------ |
| `18298870174`  | `+18298870174` | `18298870174@c.us` |
| `8298870174`   | `+18298870174` | `18298870174@c.us` |
| `+18298870174` | `+18298870174` | `18298870174@c.us` |
| `18093186486`  | `+18093186486` | `18093186486@c.us` |
| `8093186486`   | `+18093186486` | `18093186486@c.us` |

## Número Fallback

- **Antes**: `18298870174`
- **Después**: `+18298870174`

## Funciones Actualizadas

1. ✅ `cleanAndFormatPhoneNumber()` - Lógica mejorada
2. ✅ `sendMessage()` - Usa formateo consistente
3. ✅ `sendImageAndMessage()` - Usa formateo consistente
4. ✅ `sendFileAndMessage()` - Usa formateo consistente
5. ✅ Rutas corregidas para usar las funciones helper

## Logging Mejorado

Ahora todas las funciones incluyen logging detallado:

```
🔍 Processing phone number: "18298870174"
🧹 Cleaned number: "18298870174"
🇩🇴 Dominican number detected, adding +1: "+18298870174"
📞 Final formatted number: "+18298870174"
✅ Number validation: VALID
📱 WhatsApp formatted number: "18298870174@c.us"
✅ Message sent successfully to: "18298870174@c.us"
```

## Validación Mejorada

- **Longitud mínima**: 10 dígitos (antes era > 4)
- **Longitud máxima**: 15 dígitos
- **Debe empezar con**: `+`
- **Fallback automático**: Si número inválido

## Próximos Pasos

1. **Probar** con los números que estaban fallando
2. **Verificar** logs del bot para confirmar el formateo correcto
3. **Actualizar** variable de entorno `FALLBACKNUMBER` a `+18298870174`
