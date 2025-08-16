# 🧪 Bot Monitor Beta - Nuevas Tarjetas

Esta es una versión experimental del dashboard de bots con un diseño de tarjetas completamente nuevo, inspirado en principios de UI/UX modernos.

## 🎯 Acceso

- **Dashboard Principal**: [http://localhost:3000/](http://localhost:3000/)
- **Versión Beta**: [http://localhost:3000/beta](http://localhost:3000/beta)

## ✨ Características del Nuevo Diseño

### 🎨 Principios de Diseño

- **Jerarquía Visual**: Estado principal prominente, métricas vitales de apoyo
- **Diseño Denso**: Optimizado para ancho de 280-320px (móvil/sidebars)
- **Color Mínimo**: Solo para estado/severidad, todo lo demás neutral
- **Métricas Compactas**: Iconos + números, tooltips para evitar ruido
- **Divulgación Progresiva**: Detalles en la fila inferior delgada

### 📊 Métricas Mostradas

#### Fila Principal (Vitales)

- **CPU**: Progreso visual con porcentaje
- **Heap**: Progreso visual con porcentaje de uso de memoria
- **Uptime**: Tiempo formateado (días, horas, minutos)
- **Restarts**: Contador con colores de advertencia

#### Fila Secundaria (Estadísticas)

- **Errores**: Contador con pills de color según severidad
- **Requests**: Número de peticiones HTTP procesadas
- **PID**: ID del proceso PM2

#### Estado WhatsApp

- **QR Status**: Indica si necesita escanear QR o está conectado
- **Bot Status**: Estado textual del proceso

#### Métricas Browser (Si disponibles)

- **Chromium CPU**: Uso de CPU del navegador
- **Chromium Memory**: Uso de memoria del navegador

### 🚨 Alertas Inteligentes

- Alertas automáticas cuando CPU o Heap >= 90%
- Colores de estado basados en errores y conectividad
- Indicadores visuales para QR pendiente vs conectado

## 🔄 Funcionalidad

- **Auto-refresh**: Actualización automática cada 30 segundos
- **Datos en tiempo real**: Integración con API existente
- **Responsive**: Adaptación automática a diferentes tamaños de pantalla
- **Estados de carga**: Manejo elegante de estados de carga y error

## 🛠️ Archivos Creados

```
frontend/
├── app/beta/page.tsx           # Página beta principal
├── components/bot-monitor-card.tsx  # Componente de tarjeta nueva
└── app/page.tsx               # Actualizado con enlace a beta
```

## 🎯 Próximos Pasos

1. **Pruebas de Usuario**: Comparar usabilidad vs tarjetas actuales
2. **Optimizaciones**: Ajustar colores, espaciado, jerarquía
3. **Interacciones**: Agregar acciones como restart, logs, QR display
4. **Responsive**: Optimizar para diferentes breakpoints
5. **Transición**: Decidir si reemplazar completamente las tarjetas actuales

## 🔍 Comparación

| Aspecto         | Tarjetas Actuales | Nuevas Tarjetas (Beta) |
| --------------- | ----------------- | ---------------------- |
| **Ancho**       | Variable          | Fijo (max-w-sm)        |
| **Densidad**    | Media             | Alta                   |
| **Información** | Dispersa          | Jerarquizada           |
| **Estado**      | Badge simple      | Dot + Badge + Contexto |
| **Métricas**    | Grid 2x3          | Layout optimizado      |
| **Alertas**     | Básicas           | Inteligentes           |
| **Acciones**    | Múltiples botones | Enfoque en monitoreo   |

---

**💡 Tip**: Usa ambas versiones lado a lado para comparar la experiencia y decidir qué elementos funcionan mejor para tu flujo de trabajo.
