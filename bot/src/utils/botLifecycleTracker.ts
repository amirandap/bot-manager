import fs from 'fs';
import path from 'path';
// No importar directamente para evitar dependencias circulares
// import { LOGS_PATH, BOT_ID } from '..';

// Define lifecycle states for better tracking
export enum BotLifecycleState {
  // Startup phases
  INITIALIZING = 'initializing',
  BROWSER_LAUNCHING = 'browser_launching',
  WAITING_FOR_QR = 'waiting_for_qr',
  QR_READY = 'qr_ready',
  QR_SCANNED = 'qr_scanned',
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
  private botId: string;
  private logsPath: string;
  
  constructor() {
    // Obtenemos el BOT_ID y LOGS_PATH del entorno o usamos valores predeterminados
    this.botId = process.env.BOT_ID || `bot-${Date.now()}`;
    
    // Crear rutas de directorio de datos similares a las del index.ts
    const dataRoot = path.join(__dirname, '../../../data');
    this.logsPath = path.join(dataRoot, 'logs', this.botId);
    
    // Crear el directorio de logs si no existe
    if (!fs.existsSync(this.logsPath)) {
      fs.mkdirSync(this.logsPath, { recursive: true });
      console.log(`📁 Created logs directory for lifecycle tracking: ${this.logsPath}`);
    }
    
    this.stateFile = path.join(this.logsPath, 'lifecycle-state.json');
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
        botId: this.botId,
        currentState: this.currentState,
        stateHistory: this.stateHistory.slice(-100) // Keep only last 100 events
      };
      fs.writeFileSync(this.stateFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`❌ Error saving lifecycle state:`, error);
    }
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
}

// Singleton instance
export const botLifecycle = new BotLifecycleTracker();
