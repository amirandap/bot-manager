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
      case "online":
        return "bg-green-500";
      case "offline":
        return "bg-gray-400";
      case "stopped":
        return "bg-red-400";
      case "stopping":
        return "bg-yellow-500";
      case "errored":
        return "bg-red-500";
      case "launching":
        return "bg-blue-500";
      case "unknown":
        return "bg-gray-300";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
        return "Online";
      case "offline":
        return "Offline";
      case "stopped":
        return "Stopped";
      case "stopping":
        return "Stopping";
      case "errored":
        return "Error";
      case "launching":
        return "Starting";
      case "unknown":
        return "Unknown";
      default:
        return status;
    }
  };

  const shouldAnimate = ["online", "launching", "stopping"].includes(
    status.toLowerCase()
  );

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
