# Migración de HTML Estático a Contexto Unificado

## Descripción General

Esta documentación guía la migración del archivo `html/index.html` estático al nuevo sistema de contexto unificado que utiliza una sola llamada API para obtener el estado de todos los bots.

## Problema Actual

El archivo `html/index.html` contiene cards estáticos hardcodeados que no reflejan el estado real de los bots. Este archivo necesita ser convertido a un componente React dinámico que utilice el nuevo contexto unificado.

## Contexto Unificado Implementado

### Endpoint Unificado
- **URL**: `/api/status` (devuelve todos los bots)
- **Ventajas**: 
  - Una sola llamada HTTP en lugar de múltiples
  - Datos consistentes entre todos los componentes
  - Actualización automática con polling
  - Gestión centralizada del estado

### Estructura del Contexto

```typescript
// Ubicación: frontend/lib/contexts/BotsStatusContext.tsx

export interface BotsStatusContextType {
  // Estado global
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Datos unificados
  allBots: UnifiedBotStatus[];
  
  // Funciones de utilidad
  refreshAll: () => Promise<void>;
  getBotStatus: (botId: string) => UnifiedBotStatus | undefined;
}

// Hooks de conveniencia
export const useBotsStatus = () => BotsStatusContextType;
export const useBotStatus = (botId: string) => UnifiedBotStatus | undefined;
export const useBotPM2Metrics = (botId: string) => BotPM2Metrics | undefined;
export const useBotHealth = (botId: string) => BotHealth | undefined;
```

## Plan de Migración

### Paso 1: Crear el Componente Base

Crear un nuevo componente `BotMonitorGrid.tsx` que reemplace el HTML estático:

```typescript
// frontend/components/BotMonitorGrid.tsx
'use client';

import React from 'react';
import { useBotsStatus } from '@/lib/contexts/BotsStatusContext';
import CompactBotCard from './CompactBotCard';

export default function BotMonitorGrid() {
  const { allBots, loading, error } = useBotsStatus();

  if (loading) {
    return <div className="loading-spinner">Cargando bots...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="wrap">
      <div className="grid">
        {allBots.map((bot) => (
          <CompactBotCard key={bot.id} bot={bot} />
        ))}
      </div>
    </div>
  );
}
```

### Paso 2: Crear el Componente CompactBotCard

Este componente reemplaza cada `<article class="card">` del HTML estático:

```typescript
// frontend/components/CompactBotCard.tsx
'use client';

import React from 'react';
import { UnifiedBotStatus } from '@/lib/contexts/BotsStatusContext';

interface CompactBotCardProps {
  bot: UnifiedBotStatus;
}

export default function CompactBotCard({ bot }: CompactBotCardProps) {
  const pm2 = bot.pm2Metrics;
  const health = bot.health;
  
  // Determinar estado visual
  const getStatusClass = () => {
    if (!pm2) return 'unknown';
    switch (pm2.status) {
      case 'online': return health?.status === 'healthy' ? 'ok' : 'warn';
      case 'stopped': return 'bad';
      case 'errored': return 'bad';
      case 'launching': return 'warn';
      default: return 'unknown';
    }
  };

  const getStatusText = () => {
    if (!pm2) return 'Unknown';
    
    // Usar estado personalizado de WhatsApp si está disponible
    if (pm2.whatsappStatus) {
      return pm2.whatsappStatus;
    }
    
    return pm2.status.charAt(0).toUpperCase() + pm2.status.slice(1);
  };

  return (
    <article className={`card ${health?.status === 'critical' ? 'attn-bad' : ''}`} aria-label={bot.name}>
      <header className="p12 row space gap8">
        <div className="row gap8" style={{ minWidth: 0 }}>
          <span className="dot" style={{ background: `var(--${getStatusClass()})` }} />
          <div className="bot-info">
            <div className="title" title={bot.name}>{bot.name}</div>
            <div className="bot-number" title={bot.phoneNumber || 'Sin número'}>
              {bot.phoneNumber || 'Sin número'}
            </div>
            <div className="bot-pushname" title={bot.pushName || 'Sin nombre'}>
              {bot.pushName || 'Sin nombre'}
            </div>
          </div>
        </div>
        <div className="row gap6">
          <span className={`badge ${getStatusClass()}`}>{getStatusText()}</span>
          <BotActions bot={bot} />
        </div>
      </header>

      <div className="px12 py8">
        <BotMetrics bot={bot} />
        <BotFooter bot={bot} />
        <BotAlerts bot={bot} />
      </div>
    </article>
  );
}
```

### Paso 3: Implementar Subcomponentes

#### BotMetrics Component
```typescript
// frontend/components/BotMetrics.tsx
export default function BotMetrics({ bot }: { bot: UnifiedBotStatus }) {
  const pm2 = bot.pm2Metrics;
  if (!pm2) return null;

  const getCpuBarClass = () => {
    if (pm2.cpu > 80) return 'bad';
    if (pm2.cpu > 50) return 'warn';
    return 'ok';
  };

  const getMemoryBarClass = () => {
    if (pm2.heapUsage > 90) return 'bad';
    if (pm2.heapUsage > 70) return 'warn';
    return 'ok';
  };

  return (
    <>
      <div className="row space gap8">
        <div>
          <div className="row gap8" title={`Uso de CPU ${pm2.cpu}%`}>
            <div className={`bar ${getCpuBarClass()}`}>
              <i style={{ width: `${pm2.cpu}%` }} />
            </div>
            <span className="mono muted" style={{ fontSize: '11px' }}>{pm2.cpu}%</span>
            <small className="muted">CPU</small>
          </div>
          <div className="row gap8" style={{ marginTop: '6px' }} title={`Uso de Heap ${pm2.heapUsage}%`}>
            <div className={`bar ${getMemoryBarClass()}`}>
              <i style={{ width: `${pm2.heapUsage}%` }} />
            </div>
            <span className="mono muted" style={{ fontSize: '11px' }}>{pm2.heapUsage}%</span>
            <small className="muted">Heap</small>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="kpi" title="Tiempo activo">
            <UptimeIcon />
            <b>{formatUptime(pm2.uptime)}</b>
            <small>uptime</small>
          </div>
          <div className="kpi" title="Reinicios del proceso" style={{ marginTop: '6px', color: 'var(--bad)' }}>
            <RestartIcon />
            <b>{pm2.restarts}</b>
            <small>restarts</small>
          </div>
        </div>
      </div>
      
      <div className="section row space">
        <div className="row gap10">
          <div className="kpi" title="Errores desde el último arranque">
            <ErrorIcon />
            <span className="pill">{pm2.errorCount || 0} errs</span>
          </div>
          <div className="kpi" title="Requests HTTP recientes">
            <RequestIcon />
            <small className="muted">req {pm2.activeRequests || 0}</small>
          </div>
        </div>
        <div className="hint mono" title={`PID ${pm2.pid}`}>pid {pm2.pid || '—'}</div>
      </div>
    </>
  );
}
```

#### BotActions Component
```typescript
// frontend/components/BotActions.tsx
export default function BotActions({ bot }: { bot: UnifiedBotStatus }) {
  const handleRestart = async () => {
    try {
      const response = await fetch(`/api/bots/${bot.id}/pm2/restart`, {
        method: 'POST'
      });
      if (response.ok) {
        // El contexto se actualizará automáticamente
      }
    } catch (error) {
      console.error('Error restarting bot:', error);
    }
  };

  const handleRecreate = async () => {
    try {
      const response = await fetch(`/api/bots/${bot.id}/pm2/recreate`, {
        method: 'POST'
      });
      if (response.ok) {
        // El contexto se actualizará automáticamente
      }
    } catch (error) {
      console.error('Error recreating bot:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm(`¿Eliminar ${bot.name}?`)) {
      try {
        const response = await fetch(`/api/bots/${bot.id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          // El contexto se actualizará automáticamente
        }
      } catch (error) {
        console.error('Error deleting bot:', error);
      }
    }
  };

  return (
    <div className="actions">
      <button className="iconbtn refresh" title="Restart" onClick={handleRestart}>
        <RestartIcon />
      </button>
      <button className="iconbtn warn" title="Recreate" onClick={handleRecreate}>
        <RecreateIcon />
      </button>
      <button className="iconbtn danger" title="Delete" onClick={handleDelete}>
        <DeleteIcon />
      </button>
    </div>
  );
}
```

### Paso 4: Crear la Página Principal

```typescript
// frontend/app/monitor/page.tsx
import React from 'react';
import { BotsStatusProvider } from '@/lib/contexts/BotsStatusContext';
import BotMonitorGrid from '@/components/BotMonitorGrid';

export default function MonitorPage() {
  return (
    <BotsStatusProvider>
      <BotMonitorGrid />
    </BotsStatusProvider>
  );
}
```

### Paso 5: Migrar los Estilos CSS

Copiar `html/css/styles.css` a `frontend/styles/monitor.css` y adaptarlo:

```css
/* frontend/styles/monitor.css */
.wrap {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* ... resto de estilos ... */
```

## Ventajas de la Migración

### ✅ Datos en Tiempo Real
- **Antes**: Datos estáticos hardcodeados
- **Después**: Datos reales actualizados automáticamente cada 30 segundos

### ✅ Una Sola Llamada API
- **Antes**: Cada componente hacía su propia llamada
- **Después**: Una sola llamada `/api/status` para todos los bots

### ✅ Consistencia de Datos
- **Antes**: Posibles inconsistencias entre componentes
- **Después**: Todos los componentes usan los mismos datos del contexto

### ✅ Mejor Performance
- **Antes**: Múltiples requests simultáneos
- **Después**: Un solo request con cache automático

### ✅ Estado Centralizado
- **Antes**: Estado disperso en múltiples componentes
- **Después**: Estado global bien definido

## Funciones de Utilidad Requeridas

```typescript
// frontend/lib/utils/botHelpers.ts

export function formatUptime(uptimeMs: number): string {
  const minutes = Math.floor(uptimeMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function getStatusColor(status: string, health?: BotHealth): string {
  switch (status) {
    case 'online':
      return health?.status === 'healthy' ? 'var(--ok)' : 'var(--warn)';
    case 'stopped':
    case 'errored':
      return 'var(--bad)';
    case 'launching':
      return 'var(--warn)';
    default:
      return 'var(--border)';
  }
}

export function getMetricBarClass(value: number, thresholds: { warn: number; bad: number }): string {
  if (value > thresholds.bad) return 'bad';
  if (value > thresholds.warn) return 'warn';
  return 'ok';
}
```

## Implementación de QR Codes Dinámicos

Para los bots que requieren QR:

```typescript
// frontend/components/QRSection.tsx
export default function QRSection({ bot }: { bot: UnifiedBotStatus }) {
  const [qrData, setQrData] = useState(null);
  
  useEffect(() => {
    if (bot.type === 'whatsapp' && bot.pm2Metrics?.qrCodeStatus === 'available') {
      fetchQRCode();
    }
  }, [bot.pm2Metrics?.qrCodeStatus]);

  const fetchQRCode = async () => {
    try {
      const response = await fetch(`/api/proxy/${bot.id}/qr-status`);
      const data = await response.json();
      setQrData(data);
    } catch (error) {
      console.error('Error fetching QR:', error);
    }
  };

  if (bot.pm2Metrics?.qrCodeStatus === 'available' && qrData?.available) {
    return (
      <div className="qr" aria-label="Código QR para escanear" style={{ marginBottom: '10px' }}>
        <img src={`/api/proxy/${bot.id}/qr-code`} alt="QR Code" />
      </div>
    );
  }

  return null;
}
```

## Testing de la Migración

### Verificar Funcionalidad
1. **Estado en tiempo real**: Los cards deben mostrar datos reales de los bots
2. **Actualización automática**: Los datos deben actualizarse cada 30 segundos
3. **Acciones funcionales**: Restart, recreate y delete deben funcionar
4. **QR codes dinámicos**: Mostrar QR cuando esté disponible
5. **Performance**: Una sola llamada API al cargar

### Comandos de Testing
```bash
# Verificar que el endpoint devuelve datos
curl -s "http://localhost:3001/api/status" | jq

# Probar acciones de bot
curl -X POST "http://localhost:3001/api/bots/BOTID/pm2/restart"

# Verificar métricas PM2
curl -s "http://localhost:3001/api/bots/BOTID/metrics" | jq
```

## Cronograma de Implementación

1. **Día 1**: Crear componentes base y estructura
2. **Día 2**: Implementar lógica de datos y acciones
3. **Día 3**: Migrar estilos CSS y pulir UI
4. **Día 4**: Testing y ajustes finales
5. **Día 5**: Deploy y monitoreo

## Conclusión

Esta migración transforma el HTML estático en un dashboard dinámico y funcional que:
- Muestra datos reales en tiempo real
- Utiliza una arquitectura eficiente con una sola llamada API
- Mantiene el diseño visual existente
- Añade funcionalidad real para gestionar bots
- Proporciona una base sólida para futuras mejoras

El resultado será un dashboard profesional que reemplaza completamente el HTML estático con funcionalidad real y datos en tiempo real.
