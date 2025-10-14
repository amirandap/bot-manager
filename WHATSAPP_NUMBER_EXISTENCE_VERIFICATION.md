# WhatsApp Number Existence Verification API

## 📋 Descripción General

Este documento describe cómo usar la API de verificación de números de WhatsApp para consultar si un número de teléfono está registrado en WhatsApp. La API utiliza la funcionalidad nativa de WhatsApp Web.js para realizar verificaciones en tiempo real.

## 🚀 Características Principales

- ✅ **Verificación en tiempo real**: Consulta directa a la API de WhatsApp Web
- ✅ **Auto-selección de bot**: No requiere especificar un bot específico
- ✅ **Validación de formato**: Verifica automáticamente el formato del número
- ✅ **Respuesta estructurada**: JSON con información completa del estado
- ✅ **Manejo de errores**: Respuestas claras para todos los casos
- ✅ **Alto rendimiento**: Respuesta rápida (< 2 segundos)

## 🌐 Endpoint Principal

### URL
```
POST /api/bots/verify-number
```

### URL Completa
```
https://wapi.softgrouprd.com/api/bots/verify-number
```

### Headers Requeridos
```
Content-Type: application/json
```

### Parámetros de Entrada

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `phoneNumber` | string | ✅ Sí | Número de teléfono con código de país | `"+1234567890"` |
| `botId` | string | ❌ No | ID del bot específico (opcional) | `"whatsapp-bot-1234567890"` |

### Ejemplos de Solicitud

#### 1. Verificación Básica (Auto-selección de Bot)
```bash
curl -X POST "https://wapi.softgrouprd.com/api/bots/verify-number" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890"
  }'
```

#### 2. Verificación con Bot Específico
```bash
curl -X POST "https://wapi.softgrouprd.com/api/bots/verify-number" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "botId": "whatsapp-bot-1234567890"
  }'
```

## 📊 Respuestas de la API

### Respuesta Exitosa - Número Registrado

```json
{
  "success": true,
  "phoneNumber": "+18298870174",
  "isRegistered": true,
  "numberId": "18298870174@c.us",
  "formatted": "+18298870174",
  "isValid": true,
  "errorDetails": null,
  "timestamp": "2025-10-06T23:49:08.394Z"
}
```

### Respuesta Exitosa - Número No Registrado

```json
{
  "success": true,
  "phoneNumber": "+1234567890",
  "isRegistered": false,
  "numberId": null,
  "formatted": "+1234567890",
  "isValid": true,
  "errorDetails": null,
  "timestamp": "2025-10-06T23:49:01.624Z"
}
```

### Respuesta de Error - Formato Inválido

```json
{
  "success": true,
  "phoneNumber": "123",
  "isRegistered": false,
  "numberId": null,
  "formatted": "+18095551234",
  "isValid": false,
  "errorDetails": null,
  "timestamp": "2025-10-06T23:49:20.735Z"
}
```

### Respuesta de Error - Parámetros Faltantes

```json
{
  "error": "Phone number is required in request body"
}
```

### Respuesta de Error - Sin Bots Disponibles

```json
{
  "error": "No available bots for verification",
  "details": "All bots are offline or disabled"
}
```

## 🔍 Campos de Respuesta Explicados

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | boolean | Indica si la consulta se realizó correctamente |
| `phoneNumber` | string | Número original enviado en la solicitud |
| `isRegistered` | boolean | **CAMPO PRINCIPAL**: `true` si el número existe en WhatsApp |
| `numberId` | string/null | ID interno de WhatsApp (formato: número@c.us) |
| `formatted` | string | Número formateado según estándares internacionales |
| `isValid` | boolean | Indica si el formato del número es válido |
| `errorDetails` | string/null | Detalles del error si la verificación falló |
| `timestamp` | string | Marca de tiempo de la verificación (ISO 8601) |

## 💻 Ejemplos de Integración

### JavaScript/Node.js

```javascript
async function verificarNumeroWhatsApp(numeroTelefono) {
  try {
    const response = await fetch('/api/bots/verify-number', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: numeroTelefono
      })
    });
    
    const resultado = await response.json();
    
    if (resultado.success) {
      return {
        existe: resultado.isRegistered,
        numeroFormateado: resultado.formatted,
        esValido: resultado.isValid,
        whatsappId: resultado.numberId
      };
    } else {
      throw new Error(resultado.error || 'Error en la verificación');
    }
  } catch (error) {
    console.error('Error al verificar número:', error);
    return { existe: false, error: error.message };
  }
}

// Uso
const resultado = await verificarNumeroWhatsApp('+1234567890');
if (resultado.existe) {
  console.log('✅ El número está registrado en WhatsApp');
} else {
  console.log('❌ El número NO está registrado en WhatsApp');
}
```

### Python

```python
import requests
import json

def verificar_numero_whatsapp(numero_telefono):
    """
    Verifica si un número de teléfono está registrado en WhatsApp
    """
    url = 'https://wapi.softgrouprd.com/api/bots/verify-number'
    
    payload = {
        'phoneNumber': numero_telefono
    }
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        resultado = response.json()
        
        if resultado.get('success'):
            return {
                'existe': resultado.get('isRegistered', False),
                'numero_formateado': resultado.get('formatted'),
                'es_valido': resultado.get('isValid', False),
                'whatsapp_id': resultado.get('numberId'),
                'timestamp': resultado.get('timestamp')
            }
        else:
            return {
                'existe': False,
                'error': resultado.get('error', 'Error desconocido')
            }
            
    except requests.exceptions.RequestException as e:
        return {
            'existe': False,
            'error': f'Error de conexión: {str(e)}'
        }

# Uso
resultado = verificar_numero_whatsapp('+1234567890')
if resultado['existe']:
    print(f"✅ El número {resultado['numero_formateado']} está en WhatsApp")
else:
    print(f"❌ El número NO está en WhatsApp: {resultado.get('error', '')}")
```

### PHP

```php
<?php
function verificarNumeroWhatsApp($numeroTelefono) {
    $url = 'https://wapi.softgrouprd.com/api/bots/verify-number';
    
    $data = array(
        'phoneNumber' => $numeroTelefono
    );
    
    $options = array(
        'http' => array(
            'header'  => "Content-type: application/json\r\n",
            'method'  => 'POST',
            'content' => json_encode($data)
        )
    );
    
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    
    if ($result === FALSE) {
        return array('existe' => false, 'error' => 'Error de conexión');
    }
    
    $response = json_decode($result, true);
    
    if ($response['success']) {
        return array(
            'existe' => $response['isRegistered'],
            'numeroFormateado' => $response['formatted'],
            'esValido' => $response['isValid'],
            'whatsappId' => $response['numberId'],
            'timestamp' => $response['timestamp']
        );
    } else {
        return array(
            'existe' => false,
            'error' => $response['error'] ?? 'Error desconocido'
        );
    }
}

// Uso
$resultado = verificarNumeroWhatsApp('+1234567890');
if ($resultado['existe']) {
    echo "✅ El número {$resultado['numeroFormateado']} está en WhatsApp\n";
} else {
    echo "❌ El número NO está en WhatsApp: {$resultado['error']}\n";
}
?>
```

### cURL

```bash
#!/bin/bash

# Función para verificar número
verificar_numero() {
    local numero=$1
    
    curl -s -X POST "https://wapi.softgrouprd.com/api/bots/verify-number" \
        -H "Content-Type: application/json" \
        -d "{\"phoneNumber\": \"$numero\"}" | jq
}

# Uso
verificar_numero "+1234567890"
```

## 🔄 Verificación en Lote

Para verificar múltiples números, realiza solicitudes individuales (recomendado para evitar sobrecarga):

### JavaScript - Verificación en Lote

```javascript
async function verificarNumerosEnLote(numeros) {
  const resultados = [];
  
  // Procesar de 5 en 5 para evitar sobrecarga
  for (let i = 0; i < numeros.length; i += 5) {
    const lote = numeros.slice(i, i + 5);
    
    const promesas = lote.map(numero => 
      verificarNumeroWhatsApp(numero)
        .then(resultado => ({ numero, ...resultado }))
        .catch(error => ({ numero, existe: false, error: error.message }))
    );
    
    const resultadosLote = await Promise.all(promesas);
    resultados.push(...resultadosLote);
    
    // Pausa entre lotes para evitar rate limiting
    if (i + 5 < numeros.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return resultados;
}

// Uso
const numeros = ['+1234567890', '+18298870174', '+1122334455'];
const resultados = await verificarNumerosEnLote(numeros);

resultados.forEach(resultado => {
  console.log(`${resultado.numero}: ${resultado.existe ? '✅' : '❌'}`);
});
```

## ⚡ Mejores Prácticas

### 1. **Rate Limiting**
- Máximo 10 consultas por segundo
- Implementa pausas entre lotes grandes
- Usa timeouts adecuados (5-10 segundos)

### 2. **Manejo de Errores**
```javascript
// Siempre verifica el campo 'success' primero
if (response.success) {
  // Luego verifica 'isRegistered'
  if (response.isRegistered) {
    console.log('Número existe en WhatsApp');
  }
} else {
  console.error('Error en la API:', response.error);
}
```

### 3. **Cache de Resultados**
```javascript
// Implementa cache local para evitar consultas repetidas
const cache = new Map();

async function verificarConCache(numero) {
  if (cache.has(numero)) {
    return cache.get(numero);
  }
  
  const resultado = await verificarNumeroWhatsApp(numero);
  
  // Cache por 24 horas
  cache.set(numero, resultado);
  setTimeout(() => cache.delete(numero), 24 * 60 * 60 * 1000);
  
  return resultado;
}
```

### 4. **Validación Previa**
```javascript
function esNumeroValido(numero) {
  // Validación básica antes de consultar la API
  const regex = /^\+[1-9]\d{1,14}$/;
  return regex.test(numero);
}

if (!esNumeroValido(numero)) {
  console.error('Formato de número inválido');
  return;
}
```

## 🔒 Autenticación y Seguridad

### Variables de Entorno (Opcional)
```bash
# Si tu instancia requiere autenticación
WHATSAPP_API_KEY=tu_api_key_aqui
WHATSAPP_API_URL=https://wapi.softgrouprd.com
```

### Usando API Keys (Si está habilitado)
```bash
curl -X POST "https://wapi.softgrouprd.com/api/bots/verify-number" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tu_api_key_aqui" \
  -d '{"phoneNumber": "+1234567890"}'
```

## 📈 Monitoreo y Logs

### Métricas Disponibles
- Tiempo de respuesta promedio
- Tasa de éxito de verificaciones
- Números únicos verificados por día
- Errores por tipo

### Logs de Ejemplo
```
2025-10-06T23:49:08.394Z: Number verification: +18298870174 -> REGISTERED
2025-10-06T23:49:01.624Z: Number verification: +1234567890 -> NOT REGISTERED
2025-10-06T23:49:20.735Z: Number verification failed: Invalid format
```

## 🆘 Solución de Problemas

### Códigos de Error Comunes

| Error | Causa | Solución |
|-------|--------|----------|
| `Phone number is required` | Parámetro faltante | Agregar `phoneNumber` al body |
| `No available bots` | Todos los bots están offline | Verificar estado de los bots |
| `500 Internal Server Error` | Error del servidor | Verificar logs del servidor |
| `Connection timeout` | Red lenta | Aumentar timeout, reintentar |

### Verificación de Estado del Sistema

```bash
# Verificar estado de los bots
curl -s "https://wapi.softgrouprd.com/api/bots" | jq

# Test de conectividad
curl -s "https://wapi.softgrouprd.com/api/health" | jq
```

## 📞 Casos de Uso Comunes

### 1. **Validación de Formularios Web**
Verificar números antes de enviar mensajes de marketing.

### 2. **Limpieza de Bases de Datos**
Filtrar contactos válidos de WhatsApp en listas existentes.

### 3. **Verificación de Usuarios**
Confirmar que usuarios tienen WhatsApp durante el registro.

### 4. **Sistemas CRM**
Validar contactos antes de campañas de WhatsApp Business.

## 🔗 Enlaces Útiles

- **Documentación Swagger**: `https://wapi.softgrouprd.com/api-docs`
- **Health Check**: `https://wapi.softgrouprd.com/api/health`
- **Estado de Bots**: `https://wapi.softgrouprd.com/api/bots`

---

**Última actualización**: Octubre 6, 2025  
**Versión API**: v2.1.0  
**Estado**: ✅ Totalmente funcional y probado

## 📋 Resumen Rápido

```bash
# Comando básico para verificar un número
curl -X POST "https://wapi.softgrouprd.com/api/bots/verify-number" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}' | jq .isRegistered

# Resultado: true (existe) o false (no existe)
```

**¿El número existe en WhatsApp?** → Consulta `isRegistered` en la respuesta 🎯