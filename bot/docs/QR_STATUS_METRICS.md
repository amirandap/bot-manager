# QR Status Metrics Documentation

## 📊 QR_STATUS Metric Implementation

### Overview
La métrica `QR_STATUS` rastrea el estado completo del ciclo de vida del código QR de WhatsApp, proporcionando visibilidad granular del proceso de autenticación.

### Metric Definition
```typescript
QR_STATUS: {
  name: 'QR Code Status',
  type: 'meter',
  id: 'whatsapp/qr-status',
  unit: 'state'
}
```

### States Tracked

| Estado | Descripción | Trigger Event | Log Message |
|--------|-------------|---------------|-------------|
| `INITIALIZING` | QR system initialization | QR path setup | `📂 QR code path initialized` |
| `GENERATING` | QR code generation starts | QR event received | `🔄 Processing QR code generation...` |
| `SAVED` | QR code saved to file | File write complete | `💾 QR code saved to: {path}` |
| `SCANME` | QR ready for scanning | Generation complete | `✅ QR code generated and ready for scanning` |
| `SCANNED` | QR successfully scanned | Authentication event | `📱 QR Code scanned successfully!` |
| `COMPLETED` | QR process completed | Client ready | `✅ QR authentication completed successfully` |

### Implementation Flow

```
1. QR_STATUS: INITIALIZING  → initializeQRCodePath()
2. QR_STATUS: GENERATING    → handleQRGenerated() start
3. QR_STATUS: SAVED         → saveQRCode() complete
4. QR_STATUS: SCANME        → handleQRGenerated() complete
5. QR_STATUS: SCANNED       → client 'authenticated' event
6. QR_STATUS: COMPLETED     → cleanupQRCodeAfterConnection()
```

### PM2 Monitoring

These metrics are automatically sent to PM2 via TX2 and can be monitored using:

```bash
# View all metrics including QR_STATUS
pm2 describe <app-name>

# Monitor metrics in real-time
pm2 monit

# Get current metrics via PM2 API
pm2 describe <app-name> | grep -A 20 "Code metrics"
```

### Integration Points

#### LoggerService Integration
```typescript
// QR Status updates are handled via logger.info() calls
logger.info("Processing QR code generation...", "🔄", undefined, "QR_STATUS", "GENERATING");
logger.info("QR code saved to: {path}", "💾", undefined, "QR_STATUS", "SAVED");
logger.info("QR code generated and ready for scanning", "✅", undefined, "QR_STATUS", "SCANME");
```

#### WhatsApp Client Events
- `qr` event → GENERATING, SAVED, SCANME
- `authenticated` event → SCANNED  
- `ready` event → Used for final cleanup
- Cleanup function → COMPLETED

### Monitoring Benefits

1. **Operational Visibility**: Track QR generation success/failure rates
2. **Performance Monitoring**: Measure time between states
3. **Debugging Aid**: Identify where QR process fails
4. **User Experience**: Know exactly when QR is ready for scanning
5. **Automation**: Trigger alerts or actions based on QR status

### Example PM2 Output

```
Code metrics:
QR Code Status: SCANME
WhatsApp Status: WAITING_FOR_QR
QR Codes Generated: 1
```

### Error States

In case of errors during QR generation:
- Errors are logged to `ERRORS` metric
- QR_STATUS may remain in previous state
- Error details available in logs

This implementation provides comprehensive tracking of the QR authentication process with full PM2 integration.
