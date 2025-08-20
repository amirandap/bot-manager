"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  MessageSquare,
  TrendingUp,
  Activity,
  Trash2
} from 'lucide-react';

// Types
interface MessageLog {
  id: string;
  timestamp: string;
  type: 'received' | 'sent' | 'failed' | 'processing' | 'error';
  level: 'info' | 'warn' | 'error';
  requestId?: string;
  botId?: string;
  recipient?: string;
  message?: string;
  messageType?: string;
  endpoint?: string;
  success?: boolean;
  errorType?: string;
  errorDetails?: string;
  troubleshooting?: string;
  raw: string;
}

interface MessageStats {
  totalMessages: number;
  successCount: number;
  failureCount: number;
  errorCount: number;
  processedCount: number;
  receivedCount: number;
  byBot: { [botId: string]: number };
  byType: { [type: string]: number };
  byErrorType: { [errorType: string]: number };
  lastHour: number;
  last24Hours: number;
}

interface MessageLogsResponse {
  logs: MessageLog[];
  total: number;
  hasMore: boolean;
}

export function MessageMonitoringDashboard() {
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch message statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/monitoring/messages/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to fetch statistics');
    }
  };

  // Fetch message logs
  const fetchLogs = async (type?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const url = new URL('/api/monitoring/messages/tail', window.location.origin);
      url.searchParams.set('lines', '100');
      if (type && type !== 'all') {
        url.searchParams.set('type', type);
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data.logs);
        setLastUpdated(new Date());
      } else {
        setError(data.error || 'Failed to fetch logs');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError('Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear message logs
  const clearLogs = async () => {
    try {
      const response = await fetch('/api/monitoring/messages/clear', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchLogs(activeFilter);
        await fetchStats();
      } else {
        setError(data.error || 'Failed to clear logs');
      }
    } catch (error) {
      console.error('Error clearing logs:', error);
      setError('Failed to clear logs');
    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    await Promise.all([
      fetchStats(),
      fetchLogs(activeFilter)
    ]);
  };

  // Auto-refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStats();
        fetchLogs(activeFilter);
      }, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, activeFilter]);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, []);

  // Filter change
  useEffect(() => {
    fetchLogs(activeFilter);
  }, [activeFilter]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get type badge
  const getTypeBadge = (type: MessageLog['type'], success?: boolean) => {
    const colors = {
      received: 'bg-blue-100 text-blue-800',
      sent: success !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800',
      processing: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };

    const icons = {
      received: <MessageSquare className="h-3 w-3" />,
      sent: <CheckCircle className="h-3 w-3" />,
      failed: <XCircle className="h-3 w-3" />,
      processing: <Clock className="h-3 w-3" />,
      error: <AlertCircle className="h-3 w-3" />
    };

    return (
      <Badge className={`${colors[type]} flex items-center gap-1`}>
        {icons[type]}
        {type.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Clear Logs
          </Button>
        </div>
        
        {lastUpdated && (
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Total Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
              <div className="text-xs text-muted-foreground">
                Last 24h: {stats.last24Hours}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Successful
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.successCount}</div>
              <div className="text-xs text-muted-foreground">
                Rate: {stats.totalMessages > 0 ? Math.round((stats.successCount / stats.totalMessages) * 100) : 0}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failureCount}</div>
              <div className="text-xs text-muted-foreground">
                Rate: {stats.totalMessages > 0 ? Math.round((stats.failureCount / stats.totalMessages) * 100) : 0}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Last Hour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lastHour}</div>
              <div className="text-xs text-muted-foreground">
                Processing: {stats.processedCount}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Processing Logs
          </CardTitle>
          
          {/* Filter Tabs */}
          <Tabs value={activeFilter} onValueChange={setActiveFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="received">Received</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="error">Errors</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isLoading ? 'Loading logs...' : 'No message logs found'}
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeBadge(log.type, log.success)}
                      {log.botId && (
                        <Badge variant="outline" className="text-xs">
                          {log.botId}
                        </Badge>
                      )}
                      {log.requestId && (
                        <Badge variant="outline" className="text-xs">
                          #{log.requestId}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  
                  {log.recipient && (
                    <div className="text-sm">
                      <span className="font-medium">To:</span> {log.recipient}
                    </div>
                  )}
                  
                  {log.message && (
                    <div className="text-sm">
                      <span className="font-medium">Message:</span> {log.message}
                    </div>
                  )}
                  
                  {log.messageType && log.endpoint && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Type:</span> {log.messageType} → {log.endpoint}
                    </div>
                  )}
                  
                  {log.errorType && log.errorDetails && (
                    <div className="text-sm text-red-600">
                      <span className="font-medium">Error:</span> {log.errorType} - {log.errorDetails}
                    </div>
                  )}
                  
                  {log.troubleshooting && (
                    <div className="text-sm text-blue-600">
                      <span className="font-medium">💡 Tip:</span> {log.troubleshooting}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
