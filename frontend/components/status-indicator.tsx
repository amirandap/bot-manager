interface StatusIndicatorProps {
  status: string
}

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
        return "bg-green-500"
      case "offline":
        return "bg-gray-400"
      case "error":
        return "bg-red-500"
      case "starting":
        return "bg-blue-500"
      case "stopping":
        return "bg-yellow-500"
      default:
        return "bg-gray-400"
    }
  }

  return (
    <div className="relative flex h-3 w-3">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getStatusColor(status)}`}
      />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${getStatusColor(status)}`} />
    </div>
  )
}

