/**
 * Bot State Manager
 * Handles bot lifecycle state management and PM2 communication
 */

import { Logger } from "./Logger";
import { BotLifecycleState } from "../types/types";
import { 
  updatePM2Metrics, 
  markStepSuccess, 
  markStepFailure, 
  markStepInProgress 
} from "../utils/pm2Utils";

export class BotStateManager {
  private currentState: BotLifecycleState = BotLifecycleState.INITIALIZING;

  constructor(
    private botId: string,
    private logger: Logger
  ) {}

  /**
   * Update lifecycle state and notify PM2
   */
  public updateState(state: BotLifecycleState, details?: string, error?: Error): void {
    const previousState = this.currentState;
    this.currentState = state;

    // Calculate progress percentage
    const lifecycleStages = [
      BotLifecycleState.INITIALIZING,
      BotLifecycleState.BROWSER_LAUNCHING,
      BotLifecycleState.WAITING_FOR_QR,
      BotLifecycleState.QR_READY,
      BotLifecycleState.QR_SCANNED,
      BotLifecycleState.AUTHENTICATING,
      BotLifecycleState.CONNECTED,
      BotLifecycleState.READY,
    ];

    const currentIndex = lifecycleStages.indexOf(state);
    const progress = currentIndex !== -1 
      ? Math.round((currentIndex / (lifecycleStages.length - 1)) * 100)
      : 0;

    // Use PM2 utilities for communication
    const stepName = `whatsapp_${state.toLowerCase()}`;
    
    if (error || state.toString().startsWith('ERROR_')) {
      if (error) {
        markStepFailure(stepName, error, { 
          lifecycle_state: state,
          details,
          progress,
          bot_id: this.botId
        });
      } else {
        updatePM2Metrics(stepName, 'failure', details || `State: ${state}`, progress, {
          lifecycle_state: state,
          bot_id: this.botId
        });
      }
    } else {
      // Critical states that should be marked as success
      const criticalStates = [
        BotLifecycleState.QR_READY,
        BotLifecycleState.CONNECTED,
        BotLifecycleState.READY,
        BotLifecycleState.AUTHENTICATING
      ];

      if (criticalStates.includes(state)) {
        markStepSuccess(stepName, details || this.getStateDescription(state), {
          lifecycle_state: state,
          progress,
          bot_id: this.botId
        });
      } else {
        markStepInProgress(stepName, details || this.getStateDescription(state), progress);
      }
    }

    // Log state change
    this.logger.info(
      `📊 WhatsApp state: ${previousState} -> ${state}${details ? ` (${details})` : ""}${error ? ` [ERROR: ${error.message}]` : ""}`
    );
  }

  /**
   * Get human-readable state description
   */
  public getStateDescription(state?: BotLifecycleState): string {
    const targetState = state || this.currentState;
    
    switch (targetState) {
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
      case BotLifecycleState.STOPPING:
        return "Deteniendo el bot";
      case BotLifecycleState.STOPPED:
        return "Bot detenido";
      default:
        return "Estado desconocido";
    }
  }

  public getCurrentState(): BotLifecycleState {
    return this.currentState;
  }

  public getStateDetails() {
    return {
      currentState: this.currentState,
      stateDescription: this.getStateDescription(),
      timestamp: new Date().toISOString()
    };
  }

  public isReady(): boolean {
    return this.currentState === BotLifecycleState.READY;
  }

  public isError(): boolean {
    return this.currentState.toString().startsWith('ERROR_');
  }

  public isStopping(): boolean {
    return this.currentState === BotLifecycleState.STOPPING || 
           this.currentState === BotLifecycleState.STOPPED;
  }
}
