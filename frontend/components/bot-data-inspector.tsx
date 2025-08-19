"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Database, Settings, Activity } from "lucide-react";
import { useBotDebugInfo, useBotsStatus } from "@/lib/contexts/BotsStatusContext";

interface BotDataInspectorProps {
  botId: string;
}

export function BotDataInspector({ botId }: BotDataInspectorProps) {
  const { bot, availableFields, pm2Fields, rawData } = useBotDebugInfo(botId);

  if (!bot) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Bot Data Inspector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Bot not found: {botId}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Bot Data Inspector: {bot.name}
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline">{availableFields.length} root fields</Badge>
          <Badge variant="outline">{pm2Fields.length} PM2 fields</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Core Bot Fields */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted">
            <ChevronDown className="h-4 w-4" />
            <Settings className="h-4 w-4" />
            <span className="font-medium">Core Bot Fields ({availableFields.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 ml-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {availableFields.map((field) => {
                const value = bot[field];
                const displayValue = typeof value === 'object' ? '[Object]' : String(value);
                return (
                  <div key={field} className="flex justify-between p-2 border rounded">
                    <span className="font-mono text-blue-600">{field}:</span>
                    <span className="text-gray-700 truncate ml-2 max-w-40">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* PM2 Fields */}
        {bot.pm2 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted">
              <ChevronDown className="h-4 w-4" />
              <Activity className="h-4 w-4" />
              <span className="font-medium">PM2 Metrics ({pm2Fields.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 ml-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {pm2Fields.map((field) => {
                  const value = bot.pm2![field];
                  const displayValue = typeof value === 'object' ? '[Object]' : String(value);
                  return (
                    <div key={field} className="flex justify-between p-2 border rounded">
                      <span className="font-mono text-green-600">{field}:</span>
                      <span className="text-gray-700 truncate ml-2 max-w-40">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Raw JSON Data */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted">
            <ChevronDown className="h-4 w-4" />
            <Database className="h-4 w-4" />
            <span className="font-medium">Raw JSON Data</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 ml-6">
            <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto max-h-96">
              {rawData}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// Component to show ALL bots data
export function AllBotsDataInspector() {
  const { bots } = useBotsStatus();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            All Bots Data Inspector
          </CardTitle>
          <p className="text-muted-foreground">
            Complete data inspection for all bots - shows every field from backend
          </p>
        </CardHeader>
      </Card>
      
      {bots.map((bot) => (
        <BotDataInspector key={bot.id} botId={bot.id} />
      ))}
    </div>
  );
}
