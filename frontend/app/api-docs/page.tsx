"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ExternalLink,
  FileText,
  MessageSquare,
  Settings,
  Zap,
  Info,
  RefreshCw,
} from "lucide-react";

export default function ApiDocsPage() {
  const [backendUrl, setBackendUrl] = useState<string>("");
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
    setBackendUrl(apiBaseUrl);

    // Check if backend is available
    const checkBackend = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/bots`);
        setIsBackendAvailable(response.ok);
      } catch {
        setIsBackendAvailable(false);
      }
    };

    checkBackend();
  }, []);

  const openSwaggerDocs = () => {
    window.open(`${backendUrl}/api-docs`, "_blank");
  };

  const openJsonSpec = () => {
    window.open(`${backendUrl}/api-docs.json`, "_blank");
  };

  const apiEndpoints = [
    {
      category: "Bot Management",
      icon: <Settings className="h-5 w-5" />,
      endpoints: [
        { method: "GET", path: "/api/bots", description: "Get all bots" },
        { method: "GET", path: "/api/bots/{id}", description: "Get bot by ID" },
        { method: "POST", path: "/api/bots", description: "Create new bot" },
        { method: "PUT", path: "/api/bots/{id}", description: "Update bot" },
        { method: "DELETE", path: "/api/bots/{id}", description: "Delete bot" },
      ],
    },
    {
      category: "Bot Proxy - Core Operations",
      icon: <Settings className="h-5 w-5" />,
      endpoints: [
        {
          method: "POST",
          path: "/api/bots/status",
          description: "Get bot status (botId in request body)",
        },
        {
          method: "POST",
          path: "/api/bots/qr-code",
          description: "Get QR code for WhatsApp authentication (botId in request body)",
        },
        {
          method: "POST",
          path: "/api/bots/qr-code/update",
          description: "Update QR code (botId in request body)",
        },
        {
          method: "POST",
          path: "/api/bots/restart",
          description: "Restart bot (botId in request body)",
        },
        {
          method: "POST",
          path: "/api/bots/change-fallback-number",
          description: "Change fallback number (botId in request body)",
        },
        {
          method: "POST",
          path: "/api/bots/change-port",
          description: "Change bot port (botId in request body)",
        },
      ],
    },
    {
      category: "Bot Proxy - Messaging Operations",
      icon: <MessageSquare className="h-5 w-5" />,
      endpoints: [
        {
          method: "POST",
          path: "/api/bots/send-message",
          description: "Send WhatsApp message with optional file (botId in request body)",
        },
        {
          method: "POST",
          path: "/api/bots/get-groups",
          description: "Get WhatsApp groups (botId in request body)",
        },
        {
          method: "POST",
          path: "/api/bots/pending",
          description: "Send pending message (botId in request body)",
        },
        {
          method: "POST",
          path: "/api/bots/followup",
          description: "Send followup message (botId in request body)",
        },
        {
          method: "POST",
          path: "/api/bots/receive-image-and-json",
          description: "Send image with JSON data (botId in request body)",
        },
        {
          method: "POST",
          path: "/api/bots/confirmation",
          description: "Send confirmation message (botId in request body)",
        },
      ],
    },
    {
      category: "Bot Messaging (Legacy)",
      icon: <MessageSquare className="h-5 w-5" />,
      endpoints: [
        {
          method: "POST",
          path: "/api/bots/{id}/send",
          description: "Send WhatsApp message with optional file attachment (Legacy)",
        },
      ],
    },
    {
      category: "Bot Spawning",
      icon: <Zap className="h-5 w-5" />,
      endpoints: [
        {
          method: "POST",
          path: "/api/bots/spawn/whatsapp",
          description: "Spawn new WhatsApp bot",
        },
        {
          method: "DELETE",
          path: "/api/bots/{id}/terminate",
          description: "Terminate bot completely",
        },
        {
          method: "POST",
          path: "/api/bots/{id}/start",
          description: "Start existing bot",
        },
        {
          method: "POST",
          path: "/api/bots/{id}/stop",
          description: "Stop existing bot",
        },
        {
          method: "POST",
          path: "/api/bots/{id}/restart",
          description: "Restart existing bot",
        },
      ],
    },
    {
      category: "PM2 Management",
      icon: <RefreshCw className="h-5 w-5" />,
      endpoints: [
        {
          method: "POST",
          path: "/api/bots/{id}/pm2/restart",
          description: "Restart PM2 service",
        },
        {
          method: "POST",
          path: "/api/bots/{id}/pm2/recreate",
          description: "Recreate PM2 service",
        },
        {
          method: "GET",
          path: "/api/bots/{id}/pm2/status",
          description: "Get PM2 status",
        },
      ],
    },
  ];

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-green-100 text-green-800";
      case "POST":
        return "bg-blue-100 text-blue-800";
      case "PUT":
        return "bg-yellow-100 text-yellow-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground">
            WhatsApp Bot Manager API endpoints and documentation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isBackendAvailable ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isBackendAvailable ? "bg-green-500" : "bg-red-500"
              }`}
            />
            {isBackendAvailable ? "Backend Online" : "Backend Offline"}
          </Badge>
        </div>
      </div>

      {!isBackendAvailable && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Backend server is not available. Make sure the backend is running on{" "}
            {backendUrl}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Access Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={openSwaggerDocs}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <CardTitle className="text-lg">Interactive Swagger UI</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Full interactive API documentation with try-it-out functionality
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Swagger Docs
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={openJsonSpec}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-green-600" />
              <CardTitle className="text-lg">OpenAPI JSON Spec</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Raw OpenAPI 3.0 specification in JSON format
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              View JSON Spec
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-6 w-6 text-purple-600" />
              <CardTitle className="text-lg">Base URL</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              API base URL for all endpoints
            </p>
            <div className="bg-gray-100 p-2 rounded text-sm font-mono break-all">
              {backendUrl}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Endpoints Overview */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">API Endpoints Overview</h2>

        {apiEndpoints.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {category.icon}
                <CardTitle>{category.category}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {category.endpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <Badge
                      className={`${getMethodColor(
                        endpoint.method
                      )} font-mono text-xs`}
                    >
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono flex-1">
                      {endpoint.path}
                    </code>
                    <p className="text-sm text-muted-foreground">
                      {endpoint.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
          <p className="text-sm text-muted-foreground">
            Note: Bot proxy endpoints now use botId in the request body instead of URL parameters
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Get Bot Status (New Proxy API)</h4>
            <div className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                {`curl -X POST "${backendUrl}/api/bots/status" \\
  -H "Content-Type: application/json" \\
  -d '{
    "botId": "whatsapp-bot-1234567890"
  }'`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Send WhatsApp Message (New Proxy API)</h4>
            <div className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                {`curl -X POST "${backendUrl}/api/bots/send-message" \\
  -H "Content-Type: application/json" \\
  -d '{
    "botId": "whatsapp-bot-1234567890",
    "phoneNumber": "+1234567890",
    "message": "Hello from the API!"
  }'`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Get WhatsApp Groups (New Proxy API)</h4>
            <div className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                {`curl -X POST "${backendUrl}/api/bots/get-groups" \\
  -H "Content-Type: application/json" \\
  -d '{
    "botId": "whatsapp-bot-1234567890"
  }'`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Restart Bot (New Proxy API)</h4>
            <div className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                {`curl -X POST "${backendUrl}/api/bots/restart" \\
  -H "Content-Type: application/json" \\
  -d '{
    "botId": "whatsapp-bot-1234567890"
  }'`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Get All Bots</h4>
            <div className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                {`curl -X GET "${backendUrl}/api/bots" \\
  -H "Accept: application/json"`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Spawn New WhatsApp Bot</h4>
            <div className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                {`curl -X POST "${backendUrl}/api/bots/spawn/whatsapp" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My WhatsApp Bot",
    "apiPort": 3000,
    "apiHost": "localhost"
  }'`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Legacy Send Message (Old API)</h4>
            <div className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                {`curl -X POST "${backendUrl}/api/bots/{bot-id}/send" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phoneNumber": "+1234567890",
    "message": "Hello from the API!"
  }'`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Migration Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-800">API Migration Notice</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              <strong>New Unified Bot Proxy API:</strong> All bot operations now use a unified proxy API 
              where the bot ID is passed in the request body instead of URL parameters.
            </p>
            <div className="bg-white p-3 rounded border">
              <p className="font-medium mb-2">Key Changes:</p>
              <ul className="space-y-1 text-gray-600">
                <li>• Bot ID is now passed in the request body as <code className="bg-gray-100 px-1 rounded">botId</code></li>
                <li>• All bot proxy endpoints use POST method (for consistency)</li>
                <li>• Endpoints are now at <code className="bg-gray-100 px-1 rounded">/api/bots/operation</code> instead of <code className="bg-gray-100 px-1 rounded">/api/bots/{"{id}"}/operation</code></li>
                <li>• Better error handling with validation for required botId</li>
                <li>• Unified documentation and Swagger specs</li>
              </ul>
            </div>
            <p>
              <strong>Benefits:</strong> This new structure provides better consistency, 
              easier payload management, and improved error handling across all bot operations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
