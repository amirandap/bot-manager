import * as fs from 'fs';
import * as path from 'path';

// Get paths from environment or create them
const BOT_ID = process.env.BOT_ID || `bot-${Date.now()}`;
const DATA_ROOT = path.join(__dirname, '../../../../data');
const LOGS_PATH = path.join(DATA_ROOT, 'logs', BOT_ID);

// Define lifecycle states for better tracking
export enum BotLifecycleState {
  // Startup phases
  INITIALIZING = 'initializing',
  BROWSER_LAUNCHING = 'browser_launching',
  WAITING_FOR_QR = 'waiting_for_qr',
  QR_READY = 'qr_ready',
  QR_SCANNED = 'qr_scanned',
  QR_ERROR = 'qr_error',      // New state for QR code errors
  AUTHENTICATING = 'authenticating',
  
  // Runtime states
  READY = 'ready',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  
  // Error states
  ERROR_BROWSER = 'error_browser',
  ERROR_CONNECTION = 'error_connection',
  ERROR_AUTHENTICATION = 'error_authentication',
  ERROR_UNKNOWN = 'error_unknown',
  
  // Shutdown states
  STOPPING = 'stopping',
  STOPPED = 'stopped'
}

interface LifecycleEvent {
  timestamp: string;
  state: BotLifecycleState;
  details?: string;
  error?: string;
}

class BotLifecycleTracker {
  private currentState: BotLifecycleState = BotLifecycleState.INITIALIZING;
  private stateHistory: LifecycleEvent[] = [];
  private stateFile: string;
  
  constructor() {
    // Ensure logs directory exists
    if (!fs.existsSync(LOGS_PATH)) {
      fs.mkdirSync(LOGS_PATH, { recursive: true });
    }
    
    this.stateFile = path.join(LOGS_PATH, 'lifecycle-state.json');
    this.loadState();
  }
  
  private loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf-8');
        const savedState = JSON.parse(data);
        this.currentState = savedState.currentState;
        this.stateHistory = savedState.stateHistory || [];
        console.log(`📊 Loaded previous lifecycle state: ${this.currentState}`);
      } else {
        console.log(`📊 No previous lifecycle state found, starting fresh`);
      }
    } catch (error) {
      console.error(`❌ Error loading lifecycle state:`, error);
      // Continue with default state
    }
  }
  
  private saveState() {
    try {
      const data = {
        botId: BOT_ID,
        currentState: this.currentState,
        stateHistory: this.stateHistory.slice(-100) // Keep only last 100 events
      };
      fs.writeFileSync(this.stateFile, JSON.stringify(data, null, 2), 'utf-8');
      
      // Also update PM2 metrics to expose state information
      this.updatePM2Metrics();
    } catch (error) {
      console.error(`❌ Error saving lifecycle state:`, error);
    }
  }
  
  // Update PM2 metrics to expose state information for monitoring
  private updatePM2Metrics() {
    try {
      if (process.send) {
        // Get detailed information about the current state
        const lastEvent = this.stateHistory.length > 0 ? 
          this.stateHistory[this.stateHistory.length - 1] : null;
        
        // Calculate startup metrics
        const startupComplete = this.currentState === BotLifecycleState.READY || 
                               this.currentState === BotLifecycleState.CONNECTED;
        
        // Calculate browser metrics
        const browserStarted = this.currentState !== BotLifecycleState.INITIALIZING && 
                               this.currentState !== BotLifecycleState.BROWSER_LAUNCHING &&
                               this.currentState !== BotLifecycleState.ERROR_BROWSER;
        
        // Calculate session metrics
        const sessionActive = this.currentState === BotLifecycleState.CONNECTED || 
                              this.currentState === BotLifecycleState.READY;
        const waitingForQR = this.currentState === BotLifecycleState.WAITING_FOR_QR || 
                             this.currentState === BotLifecycleState.QR_READY;
        
        // Calculate API readiness
        const apiReady = this.currentState === BotLifecycleState.READY;
        
        // Calculate error metrics
        const hasError = this.currentState.toString().startsWith('ERROR_') || 
                         this.currentState === BotLifecycleState.QR_ERROR;
        
        // Find the last error event
        const lastErrorEvent = [...this.stateHistory]
          .reverse()
          .find(event => event.error);
        
        // Calculate lifecycle progression (0-100%)
        const lifecycleStages = [
          BotLifecycleState.INITIALIZING,
          BotLifecycleState.BROWSER_LAUNCHING,
          BotLifecycleState.WAITING_FOR_QR,
          BotLifecycleState.QR_READY,
          BotLifecycleState.QR_SCANNED,
          BotLifecycleState.AUTHENTICATING,
          BotLifecycleState.CONNECTED,
          BotLifecycleState.READY
        ];
        
        const currentIndex = lifecycleStages.indexOf(this.currentState);
        // If in an error state, find the last non-error state
        const lifecycleProgress = currentIndex !== -1 ? 
          Math.round((currentIndex / (lifecycleStages.length - 1)) * 100) : 
          this.calculateProgressFromHistory();
        
        // Send metrics to PM2
        process.send({
          type: 'process:msg',
          data: {
            // Basic state information
            botState: this.currentState,
            botStateTimestamp: lastEvent ? lastEvent.timestamp : new Date().toISOString(),
            botId: BOT_ID,
            
            // QR code metrics
            hasQRCode: this.currentState === BotLifecycleState.QR_READY,
            qrCodeTimestamp: this.getQRCodeTimestamp(),
            qrCodeExpired: this.isQRCodeExpired(),
            
            // Startup and browser metrics
            startupComplete: startupComplete,
            browserStarted: browserStarted,
            browserError: this.currentState === BotLifecycleState.ERROR_BROWSER,
            
            // Session metrics
            sessionActive: sessionActive,
            waitingForQR: waitingForQR,
            authenticating: this.currentState === BotLifecycleState.AUTHENTICATING,
            
            // API metrics
            apiReady: apiReady,
            
            // Connection metrics
            isConnected: sessionActive,
            reconnecting: this.currentState === BotLifecycleState.RECONNECTING,
            
            // Error metrics
            isError: hasError,
            lastError: lastErrorEvent ? {
              timestamp: lastErrorEvent.timestamp,
              message: lastErrorEvent.error,
              state: lastErrorEvent.state
            } : null,
            
            // Progress metrics
            lifecycleProgress: lifecycleProgress,
            
            // Detailed state information for dashboard
            stateDetails: lastEvent ? {
              details: lastEvent.details,
              error: lastEvent.error
            } : null
          }
        });
      }
    } catch (error) {
      console.error(`❌ Error updating PM2 metrics:`, error);
    }
  }
  
  // Calculate progress based on history if we're in an error state
  private calculateProgressFromHistory(): number {
    const lifecycleStages = [
      BotLifecycleState.INITIALIZING,
      BotLifecycleState.BROWSER_LAUNCHING,
      BotLifecycleState.WAITING_FOR_QR,
      BotLifecycleState.QR_READY,
      BotLifecycleState.QR_SCANNED,
      BotLifecycleState.AUTHENTICATING,
      BotLifecycleState.CONNECTED,
      BotLifecycleState.READY
    ];
    
    // Find the last non-error state in history
    for (let i = this.stateHistory.length - 1; i >= 0; i--) {
      const event = this.stateHistory[i];
      const index = lifecycleStages.indexOf(event.state);
      if (index !== -1) {
        return Math.round((index / (lifecycleStages.length - 1)) * 100);
      }
    }
    
    return 0; // Default to 0% if no valid state found
  }
  
  // Check if the QR code is expired (2 minutes)
  private isQRCodeExpired(): boolean {
    const qrTimestamp = this.getQRCodeTimestamp();
    if (!qrTimestamp) return false;
    
    const qrTime = new Date(qrTimestamp).getTime();
    const now = new Date().getTime();
    const twoMinutesMs = 2 * 60 * 1000;
    
    return (now - qrTime) > twoMinutesMs;
  }
  
  public setState(state: BotLifecycleState, details?: string, error?: Error) {
    const previousState = this.currentState;
    this.currentState = state;
    
    const event: LifecycleEvent = {
      timestamp: new Date().toISOString(),
      state: state,
      details: details
    };
    
    if (error) {
      event.error = `${error.name}: ${error.message}`;
    }
    
    this.stateHistory.push(event);
    this.saveState();
    
    // Update metrics immediately for key state transitions
    const criticalStateChanges = [
      BotLifecycleState.BROWSER_LAUNCHING,
      BotLifecycleState.QR_READY,
      BotLifecycleState.CONNECTED,
      BotLifecycleState.READY,
      BotLifecycleState.DISCONNECTED
    ];
    
    // Always update metrics immediately for error states or critical transitions
    if (state.toString().startsWith('ERROR_') || 
        criticalStateChanges.includes(state) ||
        state === BotLifecycleState.QR_ERROR) {
      this.updatePM2Metrics();
    }
    
    // Log state change
    console.log(`📊 Bot state changed: ${previousState} -> ${state}${details ? ` (${details})` : ''}${error ? ` [ERROR: ${error.message}]` : ''}`);
  }
  
  public getState(): BotLifecycleState {
    return this.currentState;
  }
  
  public getStateDetails() {
    return {
      currentState: this.currentState,
      lastStateChange: this.stateHistory.length > 0 ? this.stateHistory[this.stateHistory.length - 1] : null,
      stateHistory: this.stateHistory.slice(-10) // Return only last 10 events
    };
  }
  
  // Helper methods for common state transitions
  public markBrowserLaunching() {
    this.setState(BotLifecycleState.BROWSER_LAUNCHING, 'Starting WhatsApp Web browser');
  }
  
  public markWaitingForQR() {
    this.setState(BotLifecycleState.WAITING_FOR_QR, 'Waiting for QR code generation');
  }
  
  public markQRReady() {
    this.setState(BotLifecycleState.QR_READY, 'QR code is ready for scanning');
  }
  
  public markQRScanned() {
    this.setState(BotLifecycleState.QR_SCANNED, 'QR code has been scanned');
  }
  
  public markAuthenticating() {
    this.setState(BotLifecycleState.AUTHENTICATING, 'Authenticating with WhatsApp servers');
  }
  
  public markConnected() {
    this.setState(BotLifecycleState.CONNECTED, 'Connected to WhatsApp');
  }
  
  public markReady() {
    this.setState(BotLifecycleState.READY, 'Bot is fully initialized and ready');
  }
  
  public markDisconnected(reason?: string) {
    this.setState(BotLifecycleState.DISCONNECTED, `Disconnected from WhatsApp${reason ? `: ${reason}` : ''}`);
  }
  
  public markReconnecting() {
    this.setState(BotLifecycleState.RECONNECTING, 'Attempting to reconnect to WhatsApp');
  }
  
  public markBrowserError(error: Error) {
    this.setState(BotLifecycleState.ERROR_BROWSER, 'Browser initialization failed', error);
  }
  
  public markConnectionError(error: Error) {
    this.setState(BotLifecycleState.ERROR_CONNECTION, 'WhatsApp connection error', error);
  }
  
  public markAuthenticationError(error: Error) {
    this.setState(BotLifecycleState.ERROR_AUTHENTICATION, 'WhatsApp authentication failed', error);
  }
  
  public markError(error: Error) {
    this.setState(BotLifecycleState.ERROR_UNKNOWN, 'Unknown error occurred', error);
  }
  
  public markStopping(reason?: string) {
    this.setState(BotLifecycleState.STOPPING, reason || 'Bot is shutting down');
  }
  
  public markStopped() {
    this.setState(BotLifecycleState.STOPPED, 'Bot has been stopped');
  }
  
  // Track QR code related errors
  public markQRError(error: Error) {
    this.setState(BotLifecycleState.QR_ERROR, 'Error generating or sending QR code', error);
  }
  
  // Methods to check current QR code availability
  public hasQRCode(): boolean {
    return this.currentState === BotLifecycleState.QR_READY;
  }
  
  // Method to get last QR code generation time
  public getQRCodeTimestamp(): string | null {
    // Find the most recent QR_READY event
    const qrEvent = [...this.stateHistory]
      .reverse()
      .find(event => event.state === BotLifecycleState.QR_READY);
    
    return qrEvent ? qrEvent.timestamp : null;
  }
  
  // Manually update PM2 metrics (can be called from outside)
  public updateMetrics() {
    this.updatePM2Metrics();
  }
  
  // Get a human-readable description of the current state
  public getStateDescription(): string {
    switch (this.currentState) {
      case BotLifecycleState.INITIALIZING:
        return "Iniciando el bot";
      case BotLifecycleState.BROWSER_LAUNCHING:
        return "Iniciando el navegador";
      case BotLifecycleState.WAITING_FOR_QR:
        return "Esperando código QR";
      case BotLifecycleState.QR_READY:
        return "Código QR listo para escanear";
      case BotLifecycleState.QR_SCANNED:
        return "Código QR escaneado";
      case BotLifecycleState.QR_ERROR:
        return "Error generando código QR";
      case BotLifecycleState.AUTHENTICATING:
        return "Autenticando con WhatsApp";
      case BotLifecycleState.CONNECTED:
        return "Conectado a WhatsApp";
      case BotLifecycleState.READY:
        return "Completamente operativo";
      case BotLifecycleState.DISCONNECTED:
        return "Desconectado de WhatsApp";
      case BotLifecycleState.RECONNECTING:
        return "Reconectando a WhatsApp";
      case BotLifecycleState.ERROR_BROWSER:
        return "Error iniciando navegador";
      case BotLifecycleState.ERROR_CONNECTION:
        return "Error de conexión";
      case BotLifecycleState.ERROR_AUTHENTICATION:
        return "Error de autenticación";
      case BotLifecycleState.ERROR_UNKNOWN:
        return "Error desconocido";
      case BotLifecycleState.STOPPING:
        return "Deteniendo el bot";
      case BotLifecycleState.STOPPED:
        return "Bot detenido";
      default:
        return "Estado desconocido";
    }
  }
  
  // Check health status
  public isHealthy(): boolean {
    return this.currentState === BotLifecycleState.CONNECTED || 
           this.currentState === BotLifecycleState.READY;
  }
}

// Singleton instance
export const botLifecycle = new BotLifecycleTracker();

// Export BOT_ID for use in other modules
export { BOT_ID };
