"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  ChevronDown,
  GitBranch,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Rocket,
  Activity,
  Server,
} from "lucide-react";
import { api } from "@/lib/api";

interface DeploymentStatus {
  deploymentInProgress: boolean;
  queueLength: number;
  queue?: Array<{
    id: string;
    branch: string;
    commit: string;
    status: "queued" | "running" | "success" | "failed";
    timestamp: string;
  }>;
  lastDeployment: {
    timestamp: string;
    status: "success" | "failed";
    branch: string;
    commit: string;
    output?: string[];
    error?: string;
  } | null;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  version: string;
}

export function DeploymentManager() {
  const [status, setStatus] = useState<DeploymentStatus | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showHealth, setShowHealth] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch(api.deployStatus());
      if (!response.ok) throw new Error("Failed to fetch status");

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching deployment status:", err);
      setError("Failed to fetch deployment status");
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await fetch(api.deployHealth());
      if (!response.ok) throw new Error("Failed to fetch health");

      const data = await response.json();
      setHealth(data);
    } catch (err) {
      console.error("Error fetching system health:", err);
    }
  };

  const triggerDeployment = async () => {
    setDeploying(true);
    setError(null);

    try {
      const response = await fetch(api.deployTrigger(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ branch: "main" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Deployment failed");
      }

      const result = await response.json();
      console.log("Deployment triggered:", result);

      // Refresh status
      fetchStatus();
    } catch (err) {
      console.error("Deployment error:", err);
      setError(err instanceof Error ? err.message : "Deployment failed");
    } finally {
      setDeploying(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchHealth();

    // Poll for status updates every 10 seconds
    const interval = setInterval(() => {
      fetchStatus();
      fetchHealth();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes: number) => {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading deployment status...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deployment Manager
          </CardTitle>
          <CardDescription>
            Manage CI/CD deployments and view deployment history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Deployment Status:</span>
                {status?.deploymentInProgress ? (
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    In Progress
                  </Badge>
                ) : (
                  <Badge variant="outline">Idle</Badge>
                )}
              </div>{" "}
              {status && status.queueLength > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {status.queueLength} deployment(s) in queue
                  </p>
                  {status.queue && status.queue.length > 0 && (
                    <div className="text-xs space-y-1">
                      {status.queue.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 text-gray-500"
                        >
                          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                          <span>{item.branch}</span>
                          <span className="font-mono">{item.commit}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={triggerDeployment}
              disabled={deploying || status?.deploymentInProgress}
              className="flex items-center gap-2"
            >
              {deploying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Deploy Now
            </Button>
          </div>

          {status?.lastDeployment && (
            <div className="border-t pt-4">
              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Last Deployment:
                    </span>
                    {getStatusIcon(status.lastDeployment.status)}
                    <Badge
                      variant="outline"
                      className={getStatusColor(status.lastDeployment.status)}
                    >
                      {status.lastDeployment.status}
                    </Badge>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showDetails ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Branch:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <GitBranch className="h-3 w-3" />
                        {status.lastDeployment.branch}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Commit:</span>
                      <div className="mt-1 font-mono text-xs">
                        {status.lastDeployment.commit.substring(0, 8)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Time:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(status.lastDeployment.timestamp)}
                      </div>
                    </div>
                  </div>

                  {status.lastDeployment.error && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {status.lastDeployment.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {status.lastDeployment.output && (
                    <div className="bg-gray-50 rounded-md p-3">
                      <p className="text-sm font-medium mb-2">Deploy Output:</p>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {status.lastDeployment.output.join("\n")}
                      </pre>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health Card */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>Server status and resource usage</CardDescription>
          </CardHeader>
          <CardContent>
            <Collapsible open={showHealth} onOpenChange={setShowHealth}>
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800"
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    {health.status}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Uptime: {formatUptime(health.uptime)}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showHealth ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Node.js Version:</span>
                    <div className="mt-1 font-mono text-xs">
                      {health.version}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Memory Usage:</span>
                    <div className="mt-1 text-xs">
                      {formatMemory(health.memory.heapUsed)} /{" "}
                      {formatMemory(health.memory.heapTotal)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>
                    <div className="mt-1 text-xs">
                      {formatDate(health.timestamp)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">RSS Memory:</span>
                    <div className="mt-1 text-xs">
                      {formatMemory(health.memory.rss)}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
