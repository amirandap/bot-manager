"use client";

import { useEffect, useState } from "react";
import BotCard from "./bot-card";
import { BotSpawner } from "./bot-spawner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Bot } from "@/lib/types";
import { api } from "@/lib/api";

export default function BotDashboard() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showSpawner, setShowSpawner] = useState(false);

  const fetchBots = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(api.getBots());

      if (!response.ok) {
        throw new Error(`Failed to fetch bots: ${response.status}`);
      }

      const data = await response.json();
      setBots(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching bots:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch bots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();

    // Set up polling interval (every 30 seconds)
    const intervalId = setInterval(fetchBots, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const handleUpdateBot = (bot: Bot) => {
    // TODO: Implement bot update modal/form
    console.log("Update bot:", bot);
  };

  const handleDeleteBot = async (botId: string) => {
    try {
      setError(null);
      const response = await fetch(api.deleteBot(botId), {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete bot: ${response.status}`);
      }

      // Refresh bot list after deletion
      fetchBots();
    } catch (err) {
      console.error("Error deleting bot:", err);
      setError(err instanceof Error ? err.message : "Failed to delete bot");
    }
  };

  const handleAddBot = () => {
    setShowSpawner(true);
  };

  const handleBotCreated = (newBot: Bot) => {
    // Add the new bot to the list and refresh
    setBots((prev) => [...prev, newBot]);
    setShowSpawner(false);
    fetchBots(); // Refresh to get latest status
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

          <BotSpawner onBotCreated={handleBotCreated} />
        </div>
      ) : (
        // Main Dashboard View
        <>
          <div className="flex justify-between items-center">
            <div
              className="text-sm text-muted-foreground"
              suppressHydrationWarning
            >
              {lastUpdated && (
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
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
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                onUpdate={handleUpdateBot}
                onDelete={handleDeleteBot}
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
      )}
    </div>
  );
}
