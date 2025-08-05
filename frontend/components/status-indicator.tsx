import { BotStatus } from "@/lib/types";

interface StatusIndicatorProps {
  status: string;
  botStatus?: BotStatus;
  showDetails?: boolean;
}

export default function StatusIndicator({
  status,
  botStatus,
  showDetails = false,
}: StatusIndicatorProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      // Connected states
      case "online":
      case "ready":
      case "connected":
        return "bg-green-500";
        
      // Initialization states
      case "initializing":
      case "browser_launching":
      case "launching":
        return "bg-blue-500";
        
      // QR code states  
      case "waiting_for_qr":
      case "qr_ready":
        return "bg-purple-500";
      case "qr_scanned":
      case "authenticating":
        return "bg-indigo-400";
        
      // Disconnected states
      case "offline":
      case "disconnected":
        return "bg-gray-400";
        
      // Stopping states
      case "stopped":
        return "bg-red-400";
      case "stopping":
        return "bg-yellow-500";
        
      // Error states  
      case "errored":
      case "error_browser":
      case "error_connection":
      case "error_authentication":
      case "error_unknown":
        return "bg-red-500";
        
      case "reconnecting":
        return "bg-yellow-400";
      case "unknown":
        return "bg-gray-300";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      // Connected states
      case "online":
      case "ready":
      case "connected":
        return "Online";
        
      // Initialization states
      case "initializing":
        return "Initializing";
      case "browser_launching":
        return "Launching Browser";
      case "launching":
        return "Starting";
        
      // QR code states
      case "waiting_for_qr":
        return "Waiting for QR";
      case "qr_ready":
        return "QR Ready";
      case "qr_scanned":
        return "QR Scanned";
      case "authenticating":
        return "Authenticating";
        
      // Disconnected states
      case "offline":
      case "disconnected":
        return "Offline";
        
      // Stopping states
      case "stopped":
        return "Stopped";
      case "stopping":
        return "Stopping";
        
      // Error states
      case "errored":
        return "Error";
      case "error_browser":
        return "Browser Error";
      case "error_connection":
        return "Connection Error";
      case "error_authentication":
        return "Auth Error";
      case "error_unknown":
        return "Unknown Error";
        
      case "reconnecting":
        return "Reconnecting";
      case "unknown":
        return "Unknown";
      default:
        return status;
    }
  };

  const shouldAnimate = [
    // Connected/active states
    "online", "ready", "connected",
    // Initialization states
    "initializing", "browser_launching", "launching", 
    // Transition states
    "waiting_for_qr", "qr_ready", "qr_scanned", "authenticating",
    "stopping", "reconnecting"
  ].includes(status.toLowerCase());

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-3 w-3">
        {shouldAnimate && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getStatusColor(
              status
            )}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-3 w-3 ${getStatusColor(
            status
          )}`}
        />
      </div>

      {showDetails && (
        <div className="flex flex-col text-xs">
          <span className="font-medium">{getStatusText(status)}</span>
          {botStatus?.pm2 && (
            <div className="text-gray-500 space-y-0.5">
              {botStatus.pm2.pid && <div>PID: {botStatus.pm2.pid}</div>}
              {botStatus.pm2.cpu !== undefined && (
                <div>CPU: {botStatus.pm2.cpu}%</div>
              )}
              {botStatus.pm2.memory !== undefined && (
                <div>RAM: {botStatus.pm2.memory}MB</div>
              )}
              {botStatus.pm2.restarts !== undefined && (
                <div>Restarts: {botStatus.pm2.restarts}</div>
              )}
              {botStatus.apiResponseTime && (
                <div>API: {botStatus.apiResponseTime}ms</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
