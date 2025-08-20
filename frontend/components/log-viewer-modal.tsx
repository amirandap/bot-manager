"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Download, 
  Trash2, 
  Pause, 
  Play, 
  Terminal,
  AlertCircle,
  Info,
  AlertTriangle
} from "lucide-react";
import { api } from "@/lib/api";
import type { LogEntry, LogsResponse, LogStats } from "@/lib/types";

interface LogViewerModalProps {
  botId: string;
  botName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function LogViewerModal({ botId, botName, isOpen, onClose }: LogViewerModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logType, setLogType] = useState<"combined" | "error" | "out">("combined");
  const [stats, setStats] = useState<LogStats | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async (fresh = false) => {
    if (!isOpen) return;
    
    setLoading(true);
    try {
      const currentOffset = fresh ? 0 : offset;
      const url = api.logs.getBotLogs(botId, {
        lines: 100,
        offset: currentOffset,
        type: logType
      });
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: LogsResponse = await response.json();
      
      if (fresh) {
        setLogs(data.logs);
        setOffset(0);
      } else {
        setLogs(prev => [...prev, ...data.logs]);
      }
      
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, offset, botId, logType]);

  const fetchStats = useCallback(async () => {
    if (!isOpen) return;
    
    try {
      const response = await fetch(api.logs.getLogStats(botId), {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data: LogStats = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching log stats:", error);
    }
  }, [isOpen, botId]);

  const clearLogs = async () => {
    try {
      const response = await fetch(api.logs.clearBotLogs(botId, logType), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        setLogs([]);
        setHasMore(false);
        setOffset(0);
        fetchStats();
      }
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  };

  const loadMoreLogs = () => {
    if (!hasMore || loading) return;
    setOffset(prev => prev + 100);
    fetchLogs(false);
  };

  const downloadLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] ${log.level}: ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${botName}-${logType}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs(true);
      fetchStats();
    }
  }, [isOpen, logType, fetchLogs, fetchStats]);

  useEffect(() => {
    if (autoRefresh && isOpen) {
      intervalRef.current = setInterval(() => {
        fetchLogs(true);
        fetchStats();
      }, 5000); // Refresh every 5 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, isOpen, fetchLogs, fetchStats]);

  const getLogLevelClass = (level: string) => {
    switch (level.toLowerCase()) {
      case "error":
      case "fatal":
        return "text-red-500";
      case "warn":
      case "warning":
        return "text-yellow-500";
      case "info":
        return "text-blue-500";
      case "debug":
        return "text-gray-500";
      case "trace":
        return "text-gray-400";
      default:
        return "text-gray-600";
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case "error":
      case "fatal":
        return <AlertCircle className="w-3 h-3" />;
      case "warn":
      case "warning":
        return <AlertTriangle className="w-3 h-3" />;
      case "info":
        return <Info className="w-3 h-3" />;
      default:
        return <Terminal className="w-3 h-3" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-5/6 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Logs: {botName}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex gap-4 text-sm">
              <Badge variant="outline">
                Total: {stats.totalLines} lines
              </Badge>
              <Badge variant="destructive">
                Errors: {stats.errorCount}
              </Badge>
              <Badge variant="secondary">
                Warnings: {stats.warnCount}
              </Badge>
              <Badge variant="default">
                Info: {stats.infoCount}
              </Badge>
              <span className="text-muted-foreground">
                Last update: {new Date(stats.lastUpdate).toLocaleString()}
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(true)}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pause Auto
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Auto Refresh
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={downloadLogs}
              disabled={logs.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col min-h-0">
          <Tabs value={logType} onValueChange={(value: string) => setLogType(value as "combined" | "error" | "out")} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="combined">Combined</TabsTrigger>
              <TabsTrigger value="error">Errors</TabsTrigger>
              <TabsTrigger value="out">Output</TabsTrigger>
            </TabsList>

            <TabsContent value={logType} className="flex-1 mt-4">
              <ScrollArea 
                ref={scrollAreaRef}
                className="h-full w-full rounded border bg-muted/50 p-4"
              >
                {logs && logs.length > 0 ? (
                  <div className="space-y-1 font-mono text-xs">
                    {hasMore && (
                      <div className="text-center py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadMoreLogs}
                          disabled={loading}
                        >
                          Load older logs...
                        </Button>
                      </div>
                    )}
                    
                    {logs.map((log, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-2 p-1 rounded hover:bg-muted/80 transition-colors group"
                      >
                        <div className="flex-shrink-0 text-muted-foreground text-xs">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                        <div className={`flex-shrink-0 flex items-center gap-1 ${getLogLevelClass(log.level)}`}>
                          {getLogLevelIcon(log.level)}
                          <span className="text-xs font-medium">
                            {log.level.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm break-words">{log.message}</div>
                          {log.raw !== log.message && (
                            <div className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              Raw: {log.raw}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-6 text-muted-foreground">
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Loading logs...
                        </div>
                      ) : (
                        <>
                          <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <div>No logs available</div>
                          <div className="text-xs mt-1">
                            This bot might not have generated any logs yet
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* File sizes info */}
          {stats && stats.fileSizes && Object.keys(stats.fileSizes).length > 0 && (
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              {Object.entries(stats.fileSizes).map(([file, size]) => (
                <span key={file}>
                  {file}: {formatFileSize(size)}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
