"use client";

import { useState, useEffect } from "react";
import { Bot } from "@/lib/types";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

interface BotEditModalProps {
  bot: Bot | null;
  isOpen: boolean;
  onClose: () => void;
  onBotUpdated: (updatedBot: Bot) => void;
}

export default function BotEditModal({
  bot,
  isOpen,
  onClose,
  onBotUpdated,
}: BotEditModalProps) {
  const [formData, setFormData] = useState({
    name: bot?.name || "",
    apiHost: bot?.apiHost || "",
    apiPort: bot?.apiPort?.toString() || "",
    phoneNumber: bot?.phoneNumber || "",
    pushName: bot?.pushName || "",
    enabled: bot?.enabled ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when bot changes
  useEffect(() => {
    if (bot) {
      setFormData({
        name: bot.name,
        apiHost: bot.apiHost,
        apiPort: bot.apiPort.toString(),
        phoneNumber: bot.phoneNumber || "",
        pushName: bot.pushName || "",
        enabled: bot.enabled,
      });
    }
  }, [bot]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bot) return;

    setLoading(true);
    setError(null);

    try {
      // Prepare update payload
      const updatePayload = {
        name: formData.name.trim(),
        apiHost: formData.apiHost.trim(),
        apiPort: parseInt(formData.apiPort),
        phoneNumber: formData.phoneNumber.trim() || null,
        pushName: formData.pushName.trim() || null,
        enabled: formData.enabled,
      };

      // Validate required fields
      if (!updatePayload.name) {
        throw new Error("Bot name is required");
      }
      if (!updatePayload.apiHost) {
        throw new Error("API host is required");
      }
      if (isNaN(updatePayload.apiPort) || updatePayload.apiPort <= 0) {
        throw new Error("API port must be a valid positive number");
      }

      const response = await fetch(api.updateBot(bot.id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to update bot: ${response.status}`
        );
      }

      const updatedBot: Bot = await response.json();
      onBotUpdated(updatedBot);
      onClose();
    } catch (err) {
      console.error("Error updating bot:", err);
      setError(err instanceof Error ? err.message : "Failed to update bot");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  if (!bot) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Bot Configuration</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bot Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter bot name"
              disabled={loading}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="apiHost">API Host *</Label>
              <Input
                id="apiHost"
                value={formData.apiHost}
                onChange={(e) => handleInputChange("apiHost", e.target.value)}
                placeholder="localhost"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiPort">API Port *</Label>
              <Input
                id="apiPort"
                type="number"
                value={formData.apiPort}
                onChange={(e) => handleInputChange("apiPort", e.target.value)}
                placeholder="3000"
                disabled={loading}
                required
                min="1"
                max="65535"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
              placeholder="Optional: Bot's phone number"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pushName">Push Name</Label>
            <Input
              id="pushName"
              value={formData.pushName}
              onChange={(e) => handleInputChange("pushName", e.target.value)}
              placeholder="Optional: Bot's display name"
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => handleInputChange("enabled", e.target.checked)}
              disabled={loading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Label htmlFor="enabled">Bot Enabled</Label>
          </div>

          {/* Read-only information */}
          <div className="pt-4 border-t space-y-2">
            <div className="text-sm text-muted-foreground">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <strong>Type:</strong> {bot.type}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  {bot.isExternal ? "External" : "Internal"}
                </div>
                {bot.pm2ServiceId && (
                  <div className="col-span-2">
                    <strong>PM2 Service:</strong> {bot.pm2ServiceId}
                  </div>
                )}
                <div className="col-span-2">
                  <strong>Created:</strong>{" "}
                  {new Date(bot.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Bot"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
