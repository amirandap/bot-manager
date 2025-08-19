"use client";

import { useState } from "react";
import HeadlessBotCard from "./headless-bot-card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Settings, Activity, ArrowLeft, Plus, RefreshCw, Database } from "lucide-react";
import { DeploymentManager } from "./deployment-manager";
import ApiDocsPage from "../app/api-docs/page";
import { AllBotsDataInspector } from "./bot-data-inspector";
import { useBotsStatus } from "@/lib/contexts/BotsStatusContext";

export default function BotDashboard() {
  const { bots, isLoading, error, lastUpdated, refreshBots } = useBotsStatus();
  const [showSpawner, setShowSpawner] = useState(false);
  const [activeTab, setActiveTab] = useState<"bots" | "deployments" | "api-docs" | "debug">("bots");

  const handleDeleteBot = async (botId: string) => {
    // TODO: Implement delete functionality through context
    // For now, refresh after delete action
    await refreshBots();
  };

  const handleAddBot = () => {
    setShowSpawner(true);
  };

  const handleBotCreated = () => {
    setShowSpawner(false);
    refreshBots();
  };

  return (
    <div className="space-y-6">
      {showSpawner ? (
        // Bot Spawner View
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSpawner(false)}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <h2 className="text-xl font-semibold">Create New Bot</h2>
          </div>
          {/* BotSpawner component here */}
        </div>
      ) : (
        // Main Dashboard with Tabs
        <>
          {/* Tab Navigation */}
          <div className="border-b">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("bots")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "bots"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Bot Management
                </div>
              </button>
              <button
                onClick={() => setActiveTab("deployments")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "deployments"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Deployments
                </div>
              </button>
              <button
                onClick={() => setActiveTab("api-docs")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "api-docs"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  API Docs
                </div>
              </button>
              <button
                onClick={() => setActiveTab("debug")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "debug"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Debug Data
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "bots" ? (
            // Bot Management Tab
            <>
              <div className="flex justify-between items-center">
                <div
                  className="text-sm text-muted-foreground"
                  suppressHydrationWarning
                >
                  {lastUpdated && (
                    <span>
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddBot}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Spawn New Bot
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshBots}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {bots.map((bot) => {
                  // Convert UnifiedBotStatus to Bot format
                  const adaptedBot = {
                    id: bot.id,
                    name: bot.name,
                    type: bot.type,
                    apiHost: 'localhost', // Default values since not in UnifiedBotStatus
                    apiPort: 7200, // Default port
                    phoneNumber: bot.pm2?.clientPhoneNumber || null,
                    pushName: bot.pushName || null,
                    enabled: bot.status === 'online',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };

                  return (
                    <HeadlessBotCard
                      key={bot.id}
                      bot={adaptedBot}
                      onDelete={handleDeleteBot}
                      onRefresh={refreshBots}
                    />
                  );
                })}
                {!isLoading && bots.length === 0 && !error && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <div className="space-y-4">
                      <p>No bots configured yet.</p>
                      <Button
                        onClick={handleAddBot}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Spawn Your First WhatsApp Bot
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === "deployments" ? (
            // CI/CD Platform Tab
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">CI/CD Platform</h2>
              </div>
              <DeploymentManager />
            </div>
          ) : activeTab === "debug" ? (
            // Debug Data Tab
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Debug Data Inspector</h2>
              </div>
              <AllBotsDataInspector />
            </div>
          ) : (
            // API Documentation Tab
            <div className="space-y-6">
              <ApiDocsPage />
            </div>
          )}
        </>
      )}
    </div>
  );
}
