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
import { api } from "@/lib/api";
import { Bot } from "@/lib/types";

interface SpawnBotFormData {
  name: string;
  apiPort: number;
  phoneNumber?: string;
  pushName?: string;
  apiHost: string;
}

interface BotSpawnerProps {
  onBotCreated?: (bot: Bot) => void;
  existingBots?: Bot[];
}

export function BotSpawner({
  onBotCreated,
  existingBots = [],
}: BotSpawnerProps) {
  const [isSpawning, setIsSpawning] = useState(false);

  // Calculate next available port
  const getNextAvailablePort = () => {
    if (existingBots.length === 0) {
      return 7201; // Start from 7201 if no bots exist
    }

    const usedPorts = existingBots
      .map((bot) => bot.apiPort)
      .sort((a, b) => a - b);
    const highestPort = Math.max(...usedPorts);
    return highestPort + 1;
  };

  const [formData, setFormData] = useState<SpawnBotFormData>({
    name: "",
    apiPort: getNextAvailablePort(),
    phoneNumber: "",
    pushName: "",
    apiHost: process.env.NEXT_PUBLIC_API_BASE_URL?.replace(":3001", "") || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastCreatedBot, setLastCreatedBot] = useState<Bot | null>(null);

  // Update port when existing bots change
  useEffect(() => {
    const getNextAvailablePort = () => {
      if (existingBots.length === 0) {
        return 7201; // Start from 7201 if no bots exist
      }

      const usedPorts = existingBots
        .map((bot) => bot.apiPort)
        .sort((a, b) => a - b);
      const highestPort = Math.max(...usedPorts);
      return highestPort + 1;
    };

    setFormData((prev) => ({
      ...prev,
      apiPort: getNextAvailablePort(),
    }));
  }, [existingBots]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Bot name is required";
    }

    if (
      !formData.apiPort ||
      formData.apiPort < 1000 ||
      formData.apiPort > 65535
    ) {
      newErrors.apiPort = "API port must be between 1000 and 65535";
    } else {
      // Check for port conflicts
      const usedPorts = existingBots.map((bot) => bot.apiPort);
      if (usedPorts.includes(formData.apiPort)) {
        newErrors.apiPort = "This port is already in use by another bot";
      }
    }

    if (!formData.apiHost.trim()) {
      newErrors.apiHost = "API host is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateRandomPort = () => {
    const usedPorts = existingBots.map((bot) => bot.apiPort);
    let port;
    do {
      port = Math.floor(Math.random() * (8000 - 7200) + 7200);
    } while (usedPorts.includes(port));

    setFormData((prev) => ({ ...prev, apiPort: port }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSpawning(true);
    setErrors({});

    try {
      const botConfig = {
        name: formData.name,
        type: "whatsapp" as const,
        apiPort: formData.apiPort,
        apiHost: formData.apiHost,
        phoneNumber: formData.phoneNumber || undefined,
        pushName: formData.pushName || formData.name,
        enabled: true,
      };

      const response = await fetch(api.spawnWhatsAppBot(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(botConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || errorData.error || "Failed to spawn bot"
        );
      }

      const result = await response.json();
      const createdBot = result.bot;

      setLastCreatedBot(createdBot);
      setFormData({
        name: "",
        apiPort: 7260,
        phoneNumber: "",
        pushName: "",
        apiHost:
          process.env.NEXT_PUBLIC_API_BASE_URL?.replace(":3001", "") || "",
      });

      // Call the callback if provided
      if (onBotCreated) {
        onBotCreated(createdBot);
      }
    } catch (error) {
      console.error("Error spawning bot:", error);
      setErrors({
        submit: error instanceof Error ? error.message : "Failed to spawn bot",
      });
    } finally {
      setIsSpawning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 Spawn New WhatsApp Bot
          </CardTitle>
          <CardDescription>
            Create and start a new WhatsApp bot instance with PM2. The bot will
            be configured using environment variables from the bot folder and
            automatically added to your bot configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-1"
                >
                  Bot Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="My WhatsApp Bot"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="apiPort"
                  className="block text-sm font-medium mb-1"
                >
                  API Port *
                  <span className="text-sm text-gray-500 font-normal ml-2">
                    (Auto-selected next available port)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="apiPort"
                    type="number"
                    value={formData.apiPort}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        apiPort: parseInt(e.target.value) || 0,
                      }))
                    }
                    min="1000"
                    max="65535"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateRandomPort}
                  >
                    Random
                  </Button>
                </div>
                {errors.apiPort && (
                  <p className="text-red-500 text-sm mt-1">{errors.apiPort}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="apiHost"
                  className="block text-sm font-medium mb-1"
                >
                  API Host *
                </label>
                <input
                  id="apiHost"
                  type="text"
                  value={formData.apiHost}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      apiHost: e.target.value,
                    }))
                  }
                  placeholder="e.g., http://your-server.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.apiHost && (
                  <p className="text-red-500 text-sm mt-1">{errors.apiHost}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="pushName"
                  className="block text-sm font-medium mb-1"
                >
                  Push Name (Display Name)
                </label>
                <input
                  id="pushName"
                  type="text"
                  value={formData.pushName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pushName: e.target.value,
                    }))
                  }
                  placeholder="Bot Display Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="phoneNumber"
                  className="block text-sm font-medium mb-1"
                >
                  Phone Number (Optional)
                </label>
                <input
                  id="phoneNumber"
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phoneNumber: e.target.value,
                    }))
                  }
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{errors.submit}</p>
              </div>
            )}

            <Button type="submit" disabled={isSpawning} className="w-full">
              {isSpawning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Spawning Bot...
                </>
              ) : (
                "🚀 Spawn WhatsApp Bot"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {lastCreatedBot && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              ✅ Bot Created Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{lastCreatedBot.type}</Badge>
                <span className="font-medium">{lastCreatedBot.name}</span>
              </div>
              <div className="text-sm text-gray-600">
                <p>
                  <strong>ID:</strong> {lastCreatedBot.id}
                </p>
                <p>
                  <strong>Port:</strong> {lastCreatedBot.apiPort}
                </p>
                <p>
                  <strong>PM2 Service:</strong> {lastCreatedBot.pm2ServiceId}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {lastCreatedBot.enabled ? "Enabled" : "Disabled"}
                </p>
              </div>
              <div className="pt-2">
                <p className="text-sm text-green-700">
                  The bot has been created and started with PM2. It should
                  appear in your bot dashboard shortly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
