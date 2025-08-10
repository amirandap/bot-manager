/**
 * Bot Lifecycle Service - Simplified Version
 * Now uses centralized PM2 utilities for communication
 * Focuses only on WhatsApp lifecycle state management
 */

import { botLogger } from '../utils/loggerWrapper';
import * as fs from "fs";
import * as path from "path";
import { BotLifecycleState, LifecycleEvent } from "../types/types";
import { BOT_ID, LOGS_PATH } from "../config/EnvironmentManager";
import { updatePM2Metrics, markStepSuccess, markStepFailure, markStepInProgress, WHATSAPP_LIFECYCLE_STEPS } from "../utils/pm2Utils";

class BotLifecycleService {
  private currentState: BotLifecycleState = BotLifecycleState.INITIALIZING;
  private stateHistory: LifecycleEvent[] = [];
  private stateFile: string;

  constructor() {
    // Ensure logs directory exists
    if (!fs.existsSync(LOGS_PATH)) {
      fs.mkdirSync(LOGS_PATH, { recursive: true });
    }

    this.stateFile = path.join(LOGS_PATH, "lifecycle-state.json");
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, "utf-8");
        const savedState = JSON.parse(data);
        
        // Only restore stable states - error states and transitional states should start fresh
        const stableStates = [
          BotLifecycleState.READY,
          BotLifecycleState.CONNECTED
        ];
        
        if (stableStates.includes(savedState.currentState)) {
          this.currentState = savedState.currentState;
          this.stateHistory = savedState.stateHistory || [];
          botLogger.info(`📊 Loaded previous stable lifecycle state: ${this.currentState}`);
        } else {
          // For error states, transitional states, or unstable states - start fresh
          botLogger.info(`📊 Previous state was ${savedState.currentState} - starting fresh with INITIALIZING`);
          this.currentState = BotLifecycleState.INITIALIZING;
          this.stateHistory = [];
        }
      } else {
        botLogger.info(`📊 No previous lifecycle state found, starting fresh`);
      }
    } catch (error) {
      botLogger.error(`❌ Error loading lifecycle state: ${error}`);
      // Continue with default state (INITIALIZING)
    }
  }

  private saveState() {
    try {
      const data = {
        botId: BOT_ID,
        currentState: this.currentState,
        stateHistory: this.stateHistory.slice(-50), // Keep only last 50 events (reduced from 100)
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.stateFile, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      botLogger.error(`❌ Error saving lifecycle state: ${error}`);
    }
  }

  public setState(state: BotLifecycleState, details?: string, error?: Error) {
    const previousState = this.currentState;
    this.currentState = state;

    const event: LifecycleEvent = {
      timestamp: new Date().toISOString(),
      state: state,
      details: details,
    };

    if (error) {
      event.error = `${error.name}: ${error.message}`;
    }

    this.stateHistory.push(event);
    this.saveState();

    // Use centralized PM2 utilities for communication
    this.updatePM2WithState(state, details, error);

    // Log state change
    console.log(
      `📊 Bot state changed: ${previousState} -> ${state}${
        details ? ` (${details})` : ""
      }${error ? ` [ERROR: ${error.message}]` : ""}`
    );
  }

  /**
   * Use centralized PM2 utilities instead of custom PM2 communication
   */
  private updatePM2WithState(state: BotLifecycleState, details?: string, error?: Error) {
    const stateMetrics = this.calculateStateMetrics(state);
    
    // Map lifecycle state to predefined step name
    const stepName = this.getStepNameForState(state);
    
    if (error || state.toString().startsWith('ERROR_')) {
      // Use centralized failure reporting
      if (error) {
        markStepFailure(stepName, error, { 
          lifecycle_state: state,
          details,
          ...stateMetrics 
        });
      } else {
        markStepFailure(stepName, new Error(details || `State: ${state}`), { 
          lifecycle_state: state,
          ...stateMetrics 
        });
      }
    } else {
      // Use centralized success/progress reporting
      const criticalStates = [
        BotLifecycleState.QR_READY,
        BotLifecycleState.CONNECTED,
        BotLifecycleState.READY,
        BotLifecycleState.AUTHENTICATING
      ];

      if (criticalStates.includes(state)) {
        markStepSuccess(stepName, details || this.getStateDescription(), stateMetrics);
      } else {
        markStepInProgress(stepName, details || this.getStateDescription(), stateMetrics.progress);
      }
    }
  }

  /**
   * Map BotLifecycleState to predefined step names for consistent PM2 tracking
   */
  private getStepNameForState(state: BotLifecycleState): string {
    const stateToStepMap: Record<BotLifecycleState, string> = {
      [BotLifecycleState.INITIALIZING]: WHATSAPP_LIFECYCLE_STEPS.INITIALIZING,
      [BotLifecycleState.BROWSER_LAUNCHING]: WHATSAPP_LIFECYCLE_STEPS.BROWSER_LAUNCHING,
      [BotLifecycleState.WAITING_FOR_QR]: WHATSAPP_LIFECYCLE_STEPS.WAITING_FOR_QR,
      [BotLifecycleState.QR_READY]: WHATSAPP_LIFECYCLE_STEPS.QR_READY,
      [BotLifecycleState.QR_SCANNED]: WHATSAPP_LIFECYCLE_STEPS.QR_SCANNED,
      [BotLifecycleState.AUTHENTICATING]: WHATSAPP_LIFECYCLE_STEPS.AUTHENTICATING,
      [BotLifecycleState.CONNECTED]: WHATSAPP_LIFECYCLE_STEPS.CONNECTED,
      [BotLifecycleState.READY]: WHATSAPP_LIFECYCLE_STEPS.READY,
      [BotLifecycleState.DISCONNECTED]: WHATSAPP_LIFECYCLE_STEPS.DISCONNECTED,
      [BotLifecycleState.RECONNECTING]: WHATSAPP_LIFECYCLE_STEPS.RECONNECTING,
      [BotLifecycleState.LOADING]: WHATSAPP_LIFECYCLE_STEPS.LOADING,
      [BotLifecycleState.ERROR_BROWSER]: WHATSAPP_LIFECYCLE_STEPS.ERROR_BROWSER,
      [BotLifecycleState.ERROR_CHROME]: WHATSAPP_LIFECYCLE_STEPS.ERROR_CHROME,
      [BotLifecycleState.ERROR_VALIDATION]: WHATSAPP_LIFECYCLE_STEPS.ERROR_VALIDATION,
      [BotLifecycleState.ERROR_CONNECTION]: WHATSAPP_LIFECYCLE_STEPS.ERROR_CONNECTION,
      [BotLifecycleState.ERROR_AUTHENTICATION]: WHATSAPP_LIFECYCLE_STEPS.ERROR_AUTHENTICATION,
      [BotLifecycleState.ERROR_UNKNOWN]: WHATSAPP_LIFECYCLE_STEPS.ERROR_UNKNOWN,
      [BotLifecycleState.QR_ERROR]: WHATSAPP_LIFECYCLE_STEPS.QR_ERROR,
      [BotLifecycleState.STOPPING]: WHATSAPP_LIFECYCLE_STEPS.STOPPING,
      [BotLifecycleState.STOPPED]: WHATSAPP_LIFECYCLE_STEPS.STOPPED,
    };

    return stateToStepMap[state] || `whatsapp_${state.toLowerCase()}`;
  }

  /**
   * Calculate simplified metrics for the current state
   */
  private calculateStateMetrics(state: BotLifecycleState) {
    const lifecycleStages = [
      BotLifecycleState.INITIALIZING,
      BotLifecycleState.BROWSER_LAUNCHING,
      BotLifecycleState.WAITING_FOR_QR,
      BotLifecycleState.QR_READY,
      BotLifecycleState.QR_SCANNED,
      BotLifecycleState.AUTHENTICATING,
      BotLifecycleState.LOADING,
      BotLifecycleState.CONNECTED,
      BotLifecycleState.READY,
    ];

    const currentIndex = lifecycleStages.indexOf(state);
    const progress = currentIndex !== -1 
      ? Math.round((currentIndex / (lifecycleStages.length - 1)) * 100)
      : 0;

    return {
      progress,
      botState: state,
      isReady: state === BotLifecycleState.READY,
      isConnected: state === BotLifecycleState.CONNECTED || state === BotLifecycleState.READY,
      hasQRCode: state === BotLifecycleState.QR_READY,
      isError: state.toString().startsWith('ERROR_') || state === BotLifecycleState.QR_ERROR,
      isLoading: state === BotLifecycleState.LOADING,
      timestamp: new Date().toISOString()
    };
  }

  public getState(): BotLifecycleState {
    return this.currentState;
  }

  public getStateDetails() {
    return {
      currentState: this.currentState,
      lastStateChange:
        this.stateHistory.length > 0
          ? this.stateHistory[this.stateHistory.length - 1]
          : null,
      stateHistory: this.stateHistory.slice(-10), // Return only last 10 events
    };
  }

  // Simplified helper methods for common state transitions
  public markBrowserLaunching() {
    this.setState(BotLifecycleState.BROWSER_LAUNCHING, "Starting WhatsApp Web browser");
  }

  public markWaitingForQR() {
    this.setState(BotLifecycleState.WAITING_FOR_QR, "Waiting for QR code generation");
  }

  public markQRReady() {
    this.setState(BotLifecycleState.QR_READY, "QR code is ready for scanning");
  }

  public markQRScanned() {
    this.setState(BotLifecycleState.QR_SCANNED, "QR code has been scanned");
  }

  public markAuthenticating() {
    this.setState(BotLifecycleState.AUTHENTICATING, "Authenticating with WhatsApp servers");
  }

  public markConnected() {
    this.setState(BotLifecycleState.CONNECTED, "Connected to WhatsApp");
  }

  public markReady() {
    this.setState(BotLifecycleState.READY, "Bot is fully initialized and ready");
  }

  public markLoading(details?: string) {
    this.setState(BotLifecycleState.LOADING, details || "Loading WhatsApp resources");
  }

  public markDisconnected(reason?: string) {
    this.setState(BotLifecycleState.DISCONNECTED, `Disconnected from WhatsApp${reason ? `: ${reason}` : ""}`);
  }

  public markReconnecting() {
    this.setState(BotLifecycleState.RECONNECTING, "Attempting to reconnect to WhatsApp");
  }

  public markBrowserError(error: Error) {
    this.setState(BotLifecycleState.ERROR_BROWSER, "Browser initialization failed", error);
  }

  public markChromeError(error: Error) {
    this.setState(BotLifecycleState.ERROR_CHROME, "Chrome executable validation failed", error);
  }

  public markValidationError(error: Error, details?: string) {
    this.setState(BotLifecycleState.ERROR_VALIDATION, details || "Startup validation failed", error);
  }

  public markConnectionError(error: Error) {
    this.setState(BotLifecycleState.ERROR_CONNECTION, "WhatsApp connection error", error);
  }

  public markAuthenticationError(error: Error) {
    this.setState(BotLifecycleState.ERROR_AUTHENTICATION, "WhatsApp authentication failed", error);
  }

  public markError(error: Error) {
    this.setState(BotLifecycleState.ERROR_UNKNOWN, "Unknown error occurred", error);
  }

  public markStopping(reason?: string) {
    this.setState(BotLifecycleState.STOPPING, reason || "Bot is shutting down");
  }

  public markStopped() {
    this.setState(BotLifecycleState.STOPPED, "Bot has been stopped");
  }

  public markQRError(error: Error) {
    this.setState(BotLifecycleState.QR_ERROR, "Error generating or sending QR code", error);
  }

  // Simple check methods
  public hasQRCode(): boolean {
    return this.currentState === BotLifecycleState.QR_READY;
  }

  public getQRCodeTimestamp(): string | null {
    const qrEvent = [...this.stateHistory]
      .reverse()
      .find((event) => event.state === BotLifecycleState.QR_READY);
    return qrEvent ? qrEvent.timestamp : null;
  }

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
      case BotLifecycleState.LOADING:
        return "Cargando recursos";
      case BotLifecycleState.READY:
        return "Completamente operativo";
      case BotLifecycleState.DISCONNECTED:
        return "Desconectado de WhatsApp";
      case BotLifecycleState.RECONNECTING:
        return "Reconectando a WhatsApp";
      case BotLifecycleState.ERROR_VALIDATION:
        return "Error de validación inicial";
      case BotLifecycleState.ERROR_CHROME:
        return "Error configuración Chrome";
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

  public isHealthy(): boolean {
    return (
      this.currentState === BotLifecycleState.CONNECTED ||
      this.currentState === BotLifecycleState.READY
    );
  }
}

// Singleton instance
export const botLifecycle = new BotLifecycleService();
