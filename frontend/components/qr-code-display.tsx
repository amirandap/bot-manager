"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  QrCode,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
} from "lucide-react";
import { useQRCode } from "@/lib/hooks/useQRCode";
import type { Bot } from "@/lib/types";

// Simple Progress component
const SimpleProgress = ({ value }: { value: number }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-green-500 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

interface QRCodeDisplayProps {
  bot: Bot;
  onClose?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  autoCloseOnAuth?: boolean; // New prop for auto-close on authentication
}

export default function QRCodeDisplay({
  bot,
  onClose,
  autoRefresh = true,
  refreshInterval = 5000,
  autoCloseOnAuth = true, // Default to auto-close when authenticated
}: QRCodeDisplayProps) {
  const {
    qrStatus,
    qrImageUrl,
    isLoading,
    error,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    isAutoRefreshing,
    isAuthenticated,
    timeRemaining,
  } = useQRCode(bot.id, refreshInterval);

  // Auto-close modal when authenticated
  useEffect(() => {
    if (autoCloseOnAuth && isAuthenticated && onClose) {
      // Add a small delay to show success state before closing
      const closeTimer = setTimeout(() => {
        onClose();
      }, 2000); // 2 seconds delay

      return () => clearTimeout(closeTimer);
    }
  }, [isAuthenticated, onClose, autoCloseOnAuth]);

  // Auto-start refresh if enabled
  useEffect(() => {
    if (autoRefresh && !isAutoRefreshing) {
      startAutoRefresh();
    } else if (!autoRefresh && isAutoRefreshing) {
      stopAutoRefresh();
    }
  }, [autoRefresh, isAutoRefreshing, startAutoRefresh, stopAutoRefresh]);

  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${remainingSeconds}s`;
  };

  const getStatusBadge = () => {
    if (error) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    }

    if (!qrStatus) {
      return <Badge variant="secondary">Loading...</Badge>;
    }

    // Check if authenticated first
    if (isAuthenticated) {
      return (
        <Badge
          variant="default"
          className="flex items-center gap-1 bg-green-100 text-green-800"
        >
          <CheckCircle className="h-3 w-3" />
          Authenticated
        </Badge>
      );
    }

    if (!qrStatus.qrCode.available) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Not Available
        </Badge>
      );
    }

    if (qrStatus.qrCode.expired) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Expired
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Ready
      </Badge>
    );
  };

  const getProgressValue = (): number => {
    if (!qrStatus?.qrCode.available || qrStatus.qrCode.expired) {
      return 0;
    }

    const maxTime = 20 * 1000; // 20 seconds in ms (QR regenerates every 20 seconds)
    return Math.max(0, (timeRemaining / maxTime) * 100);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            <CardTitle className="text-lg">WhatsApp QR Code</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1 h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Bot: <span className="font-medium">{bot.name}</span>
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* QR Code Image */}
        <div className="flex justify-center">
          {qrImageUrl &&
          qrStatus?.qrCode.available &&
          !qrStatus.qrCode.expired ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="WhatsApp QR Code"
                className="w-64 h-64 border-2 border-green-500 rounded-lg shadow-lg"
              />
              {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-green-500" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-64 h-64 border-2 border-gray-300 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
              <div className="text-center">
                {error ? (
                  <>
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-600 font-medium">Error</p>
                    <p className="text-xs text-gray-500 mt-1">{error}</p>
                  </>
                ) : !qrStatus ? (
                  <>
                    <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-gray-600">Loading...</p>
                  </>
                ) : !qrStatus.qrCode.available ? (
                  <>
                    <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-2" />
                    <p className="text-sm text-orange-600 font-medium">
                      QR Not Available
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Bot may be starting up or already connected
                    </p>
                  </>
                ) : qrStatus.qrCode.expired ? (
                  <>
                    <Clock className="h-12 w-12 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-600 font-medium">
                      QR Code Expired
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Please restart the bot to generate a new QR code
                    </p>
                  </>
                ) : (
                  <>
                    <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">QR Code Not Ready</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Timer and Progress */}
        {qrStatus?.qrCode.available && !qrStatus.qrCode.expired && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Time remaining:</span>
              <span className="font-mono font-medium">
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>
            <SimpleProgress value={getProgressValue()} />
          </div>
        )}

        {/* QR Code Info */}
        {qrStatus && (
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium">
                {isAuthenticated
                  ? "Authenticated"
                  : qrStatus.qrCode.available
                  ? qrStatus.qrCode.expired
                    ? "Expired"
                    : "Available"
                  : "Not Available"}
              </span>
            </div>
            {qrStatus.whatsappStatus && (
              <div className="flex justify-between">
                <span>WhatsApp:</span>
                <span className="font-medium">{qrStatus.whatsappStatus}</span>
              </div>
            )}
            {qrStatus.qrCode.createdAt && (
              <div className="flex justify-between">
                <span>Generated:</span>
                <span>
                  {new Date(qrStatus.qrCode.createdAt).toLocaleTimeString()}
                </span>
              </div>
            )}
            {qrStatus.qrCode.ageMinutes !== undefined && (
              <div className="flex justify-between">
                <span>Age:</span>
                <span>{Math.floor(qrStatus.qrCode.ageMinutes)} minute(s)</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Last updated:</span>
              <span>{new Date(qrStatus.timestamp).toLocaleTimeString()}</span>
            </div>
            {isAutoRefreshing && (
              <div className="flex justify-between">
                <span>Auto-refresh:</span>
                <span className="text-green-600 font-medium">Active</span>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            className="flex-1"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={isAutoRefreshing ? stopAutoRefresh : startAutoRefresh}
            className="flex-1"
          >
            {isAutoRefreshing ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop Auto
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Auto
              </>
            )}
          </Button>
        </div>

        {/* Success message when authenticated */}
        {isAuthenticated && (
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-800">
              🎉 WhatsApp Successfully Connected!
            </p>
            <p className="text-xs text-green-600 mt-1">
              {autoCloseOnAuth
                ? "Modal will close automatically in 2 seconds..."
                : "You can now close this modal."}
            </p>
          </div>
        )}

        {/* Instructions */}
        {!isAuthenticated && (
          <div className="text-xs text-center text-muted-foreground p-3 bg-blue-50 rounded-lg">
            <p className="font-medium text-blue-800 mb-1">📱 How to scan:</p>
            <p>
              Open WhatsApp → Settings → Linked Devices → Link a Device → Scan
              QR Code
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
