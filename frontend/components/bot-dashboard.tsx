"use client";

import { useEffect, useState } from "react";
import HeadlessBotCard from "./headless-bot-card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Settings, Activity, ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { DeploymentManager } from "./deployment-manager";
import ApiDocsPage from "../app/api-docs/page";
import { api } from "@/lib/api";

export default function BotDashboard() {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showSpawner, setShowSpawner] = useState(false);
  const [activeTab, setActiveTab] = useState<"bots" | "deployments" | "api-docs">("bots");

  // Fetch bots from API
  const fetchBots = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(api.getBots(), { method: "GET" });
      if (!res.ok) throw new Error("Error fetching bots");
      const data = await res.json();
      setBots(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleDeleteBot = async (botId: string) => {
    try {
      await fetch(api.deleteBot(botId), { method: "DELETE" });
      fetchBots();
    } catch (err) {
      setError("Error deleting bot");
    }
  };

  const handleAddBot = () => {
    setShowSpawner(true);
  };

  const handleBotCreated = () => {
    setShowSpawner(false);
    fetchBots();
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
                    onClick={fetchBots}
                    disabled={loading}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
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
                {bots.map((bot) => (
                  <HeadlessBotCard
                    key={bot.id}
                    bot={bot}
                    onDelete={handleDeleteBot}
                    onRefresh={fetchBots}
                  />
                ))}
                {!loading && bots.length === 0 && !error && (
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
