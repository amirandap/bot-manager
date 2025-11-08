"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Edit, 
  RefreshCw, 
  TestTube, 
  AlertCircle, 
  CheckCircle2,
  Users,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  Power,
  PowerOff
} from "lucide-react";

interface MonitoredGroup {
  groupId: string;
  groupName?: string;
  webhooks: string[];
  enabled: boolean;
  includeAttachments: boolean;
  includeMetadata: boolean;
}

interface WhatsAppGroup {
  id: {
    _serialized: string;
  };
  name: string;
  isGroup: boolean;
}

interface Bot {
  BOT_ID: string;
  BOT_NAME: string;
  BOT_PORT: number;
  isReady?: boolean;
}

export function WebhookMonitoringDashboard({ bots }: { bots: Bot[] }) {
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [monitoredGroups, setMonitoredGroups] = useState<MonitoredGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<WhatsAppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MonitoredGroup | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    groupId: "",
    groupName: "",
    webhookUrl: "",
    includeAttachments: true,
    includeMetadata: true,
  });

  // Select first ready bot by default
  useEffect(() => {
    if (bots.length > 0 && !selectedBot) {
      const readyBot = bots.find(bot => bot.isReady) || bots[0];
      setSelectedBot(readyBot);
    }
  }, [bots, selectedBot]);

  // Load monitored groups when bot changes
  useEffect(() => {
    if (selectedBot) {
      loadMonitoredGroups();
      loadAvailableGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBot]);

  const getApiUrl = (endpoint: string) => {
    if (!selectedBot) return "";
    return `http://localhost:${selectedBot.BOT_PORT}${endpoint}`;
  };

  const loadMonitoredGroups = async () => {
    if (!selectedBot) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(getApiUrl("/api/monitored-groups/"));
      const data = await response.json();
      
      if (data.success) {
        setMonitoredGroups(data.groups || []);
      } else {
        setError(data.error || "Failed to load monitored groups");
      }
    } catch (err) {
      setError(`Error loading monitored groups: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableGroups = async () => {
    if (!selectedBot) return;
    
    try {
      const response = await fetch(getApiUrl("/get-groups/"));
      const data = await response.json();
      
      if (data.groups) {
        const groups = data.groups.filter((g: WhatsAppGroup) => g.isGroup);
        setAvailableGroups(groups);
      }
    } catch (err) {
      console.error("Error loading available groups:", err);
    }
  };

  const handleAddMonitoredGroup = async () => {
    if (!selectedBot || !formData.groupId || !formData.webhookUrl) {
      setError("Group and webhook URL are required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(getApiUrl("/api/monitored-groups/add"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: formData.groupId,
          webhookUrl: formData.webhookUrl,
          groupName: formData.groupName || undefined,
          includeAttachments: formData.includeAttachments,
          includeMetadata: formData.includeMetadata,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Monitored group added successfully");
        setIsAddDialogOpen(false);
        setFormData({
          groupId: "",
          groupName: "",
          webhookUrl: "",
          includeAttachments: true,
          includeMetadata: true,
        });
        await loadMonitoredGroups();
      } else {
        setError(data.error || "Failed to add monitored group");
      }
    } catch (err) {
      setError(`Error adding monitored group: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMonitoredGroup = async () => {
    if (!selectedBot || !editingGroup) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(getApiUrl("/api/monitored-groups/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: editingGroup.groupId,
          updates: {
            groupName: editingGroup.groupName,
            webhooks: editingGroup.webhooks,
            includeAttachments: editingGroup.includeAttachments,
            includeMetadata: editingGroup.includeMetadata,
            enabled: editingGroup.enabled,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Configuration updated successfully");
        setIsEditDialogOpen(false);
        setEditingGroup(null);
        await loadMonitoredGroups();
      } else {
        setError(data.error || "Failed to update configuration");
      }
    } catch (err) {
      setError(`Error updating configuration: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleGroup = async (groupId: string, enabled: boolean) => {
    if (!selectedBot) return;

    try {
      const response = await fetch(getApiUrl("/api/monitored-groups/toggle"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, enabled }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Monitoring ${enabled ? "enabled" : "disabled"} successfully`);
        await loadMonitoredGroups();
      } else {
        setError(data.error || "Failed to toggle monitoring");
      }
    } catch (err) {
      setError(`Error toggling monitoring: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleRemoveGroup = async (groupId: string, webhookUrl?: string) => {
    if (!selectedBot) return;

    if (!confirm(`Are you sure you want to remove this ${webhookUrl ? "webhook" : "group"}?`)) {
      return;
    }

    try {
      const response = await fetch(getApiUrl("/api/monitored-groups/remove"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, webhookUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(webhookUrl ? "Webhook removed successfully" : "Group removed successfully");
        await loadMonitoredGroups();
      } else {
        setError(data.error || "Failed to remove");
      }
    } catch (err) {
      setError(`Error removing: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleTestWebhook = async (webhookUrl: string) => {
    if (!selectedBot) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(getApiUrl("/api/monitored-groups/test"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Webhook test successful: ${data.message}`);
      } else {
        setError(`Webhook test failed: ${data.message}`);
      }
    } catch (err) {
      setError(`Error testing webhook: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditGroup = (group: MonitoredGroup) => {
    setEditingGroup({ ...group });
    setIsEditDialogOpen(true);
  };

  const handleAddWebhookToGroup = (group: MonitoredGroup, newWebhook: string) => {
    if (!newWebhook || group.webhooks.includes(newWebhook)) return;
    
    const updated = { ...group, webhooks: [...group.webhooks, newWebhook] };
    setEditingGroup(updated);
  };

  const handleRemoveWebhookFromGroup = (group: MonitoredGroup, webhookUrl: string) => {
    const updated = { ...group, webhooks: group.webhooks.filter(w => w !== webhookUrl) };
    setEditingGroup(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="h-6 w-6" />
            Webhook Monitoring
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Forward messages from WhatsApp groups to external webhooks
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedBot && (
            <Select
              value={selectedBot.BOT_ID}
              onValueChange={(value) => {
                const bot = bots.find(b => b.BOT_ID === value);
                if (bot) setSelectedBot(bot);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select bot" />
              </SelectTrigger>
              <SelectContent>
                {bots.map((bot) => (
                  <SelectItem key={bot.BOT_ID} value={bot.BOT_ID}>
                    {bot.BOT_NAME} {bot.isReady ? "✓" : "⚠"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadMonitoredGroups}
            disabled={isLoading || !selectedBot}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            disabled={!selectedBot?.isReady}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Monitored Group
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {!selectedBot?.isReady && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Bot Not Ready</AlertTitle>
          <AlertDescription>
            Please wait for the bot to connect to WhatsApp before managing monitored groups.
          </AlertDescription>
        </Alert>
      )}

      {/* Monitored Groups List */}
      {monitoredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Monitored Groups</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start monitoring WhatsApp groups by adding them above
            </p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              disabled={!selectedBot?.isReady}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {monitoredGroups.map((group) => (
            <Card key={group.groupId} className={!group.enabled ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {group.groupName || "Unknown Group"}
                      {group.enabled ? (
                        <Badge variant="default" className="ml-2">
                          <Power className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2">
                          <PowerOff className="h-3 w-3 mr-1" />
                          Paused
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 font-mono text-xs">
                      {group.groupId}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleGroup(group.groupId, !group.enabled)}
                    >
                      {group.enabled ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditGroup(group)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveGroup(group.groupId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Settings */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    Attachments: {group.includeAttachments ? "Yes" : "No"}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Metadata: {group.includeMetadata ? "Yes" : "No"}
                  </Badge>
                </div>

                {/* Webhooks */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    Webhooks ({group.webhooks.length})
                  </Label>
                  <div className="space-y-2">
                    {group.webhooks.map((webhook, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                      >
                        <code className="flex-1 truncate">{webhook}</code>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestWebhook(webhook)}
                          >
                            <TestTube className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveGroup(group.groupId, webhook)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Group Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Monitored Group</DialogTitle>
            <DialogDescription>
              Select a WhatsApp group and configure the webhook to receive messages
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Group Selection */}
            <div className="space-y-2">
              <Label htmlFor="group-select">WhatsApp Group</Label>
              <Select
                value={formData.groupId}
                onValueChange={(value) => {
                  const group = availableGroups.find(g => g.id._serialized === value);
                  setFormData({
                    ...formData,
                    groupId: value,
                    groupName: group?.name || "",
                  });
                }}
              >
                <SelectTrigger id="group-select">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => (
                    <SelectItem key={group.id._serialized} value={group.id._serialized}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableGroups.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No groups found. Make sure the bot is connected and part of WhatsApp groups.
                </p>
              )}
            </div>

            {/* Group Name Override */}
            <div className="space-y-2">
              <Label htmlFor="group-name">Custom Name (Optional)</Label>
              <Input
                id="group-name"
                placeholder="e.g., Marketing Team"
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
              />
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL *</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-server.com/webhook"
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The endpoint where messages will be forwarded (must be HTTPS recommended)
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-attachments">Include Attachments</Label>
                  <p className="text-xs text-muted-foreground">
                    Forward images, videos, documents, and audio files
                  </p>
                </div>
                <Switch
                  id="include-attachments"
                  checked={formData.includeAttachments}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, includeAttachments: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-metadata">Include Metadata</Label>
                  <p className="text-xs text-muted-foreground">
                    Add bot information and forwarding timestamp
                  </p>
                </div>
                <Switch
                  id="include-metadata"
                  checked={formData.includeMetadata}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, includeMetadata: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMonitoredGroup} disabled={isLoading || !formData.groupId || !formData.webhookUrl}>
              {isLoading ? "Adding..." : "Add Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Monitored Group</DialogTitle>
            <DialogDescription>
              Update configuration for {editingGroup?.groupName || "this group"}
            </DialogDescription>
          </DialogHeader>

          {editingGroup && (
            <div className="space-y-4 py-4">
              {/* Group Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-group-name">Group Name</Label>
                <Input
                  id="edit-group-name"
                  value={editingGroup.groupName || ""}
                  onChange={(e) =>
                    setEditingGroup({ ...editingGroup, groupName: e.target.value })
                  }
                />
              </div>

              {/* Webhooks */}
              <div className="space-y-2">
                <Label>Webhooks</Label>
                <div className="space-y-2">
                  {editingGroup.webhooks.map((webhook, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input value={webhook} readOnly className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveWebhookFromGroup(editingGroup, webhook)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="https://new-webhook.com/endpoint"
                      id="new-webhook-input"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const input = e.currentTarget;
                          handleAddWebhookToGroup(editingGroup, input.value);
                          input.value = "";
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("new-webhook-input") as HTMLInputElement;
                        if (input?.value) {
                          handleAddWebhookToGroup(editingGroup, input.value);
                          input.value = "";
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-include-attachments">Include Attachments</Label>
                  <Switch
                    id="edit-include-attachments"
                    checked={editingGroup.includeAttachments}
                    onCheckedChange={(checked: boolean) =>
                      setEditingGroup({ ...editingGroup, includeAttachments: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-include-metadata">Include Metadata</Label>
                  <Switch
                    id="edit-include-metadata"
                    checked={editingGroup.includeMetadata}
                    onCheckedChange={(checked: boolean) =>
                      setEditingGroup({ ...editingGroup, includeMetadata: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-enabled">Monitoring Enabled</Label>
                  <Switch
                    id="edit-enabled"
                    checked={editingGroup.enabled}
                    onCheckedChange={(checked: boolean) =>
                      setEditingGroup({ ...editingGroup, enabled: checked })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMonitoredGroup} disabled={isLoading}>
              {isLoading ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
