import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export interface QRCodeStatus {
  botId: string;
  botName: string;
  qrCode: {
    available: boolean;
    expired?: boolean;
    ageMinutes?: number;
    createdAt?: string;
    expiresAt?: string;
    timeRemaining?: number; // in milliseconds
  };
  whatsappStatus?: string; // e.g., "QR_READY", "READY", "AUTHENTICATING"
  botStatus?: string;
  timestamp: string;
}

export interface UseQRCodeResult {
  qrStatus: QRCodeStatus | null;
  qrImageUrl: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  isAutoRefreshing: boolean;
  isAuthenticated: boolean;
  timeRemaining: number; // milliseconds remaining until expiry
}

export function useQRCode(
  botId: string,
  autoRefreshInterval: number = 5000
): UseQRCodeResult {
  const [qrStatus, setQrStatus] = useState<QRCodeStatus | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [lastQrTimestamp, setLastQrTimestamp] = useState<string | null>(null);

  // Calculate if the bot is authenticated (QR was successfully scanned)
  const isAuthenticated =
    qrStatus?.whatsappStatus === "READY" ||
    qrStatus?.whatsappStatus === "AUTHENTICATING" ||
    qrStatus?.botStatus === "ready";

  // Calculate time remaining until QR expiry
  const calculateTimeRemaining = useCallback(
    (status: QRCodeStatus | null): number => {
      if (
        !status?.qrCode.available ||
        status.qrCode.expired ||
        !status.qrCode.createdAt
      ) {
        return 0;
      }

      const createdAt = new Date(status.qrCode.createdAt).getTime();
      const now = Date.now();
      const expiryTime = createdAt + 20 * 1000; // 20 seconds expiry (QR regenerates every 20 seconds)
      const remaining = Math.max(0, expiryTime - now);

      return remaining;
    },
    []
  );

  // Check if we need to fetch a new QR image based on timestamp changes
  const shouldRefreshImage = useCallback(
    (newStatus: QRCodeStatus | null): boolean => {
      if (!newStatus?.qrCode.available || newStatus.qrCode.expired) {
        return false;
      }

      // If this is the first QR or timestamp changed, we need new image
      const newTimestamp = newStatus.qrCode.createdAt;
      if (!lastQrTimestamp || lastQrTimestamp !== newTimestamp) {
        return true;
      }

      return false;
    },
    [lastQrTimestamp]
  );

  const fetchQRImage = useCallback(async () => {
    try {
      const response = await fetch(api.proxy.getQRCodeImage(botId));

      if (!response.ok) {
        if (response.status === 404) {
          setQrImageUrl(null);
          return;
        }
        throw new Error(`Failed to fetch QR image: ${response.status}`);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      // Clean up previous image URL to prevent memory leaks
      if (qrImageUrl) {
        URL.revokeObjectURL(qrImageUrl);
      }

      setQrImageUrl(imageUrl);
    } catch (err) {
      console.error("Error fetching QR image:", err);
      setQrImageUrl(null);
    }
  }, [botId, qrImageUrl]);

  const fetchQRStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(api.proxy.getQRCodeStatus(botId));

      if (!response.ok) {
        throw new Error(`Failed to fetch QR status: ${response.status}`);
      }

      const statusData: QRCodeStatus = await response.json();
      setQrStatus(statusData);

      // Calculate and update time remaining
      const remaining = calculateTimeRemaining(statusData);
      setTimeRemaining(remaining);

      // Check if we need to refresh the QR image
      if (shouldRefreshImage(statusData)) {
        console.log("🔄 QR timestamp changed, fetching new image...");
        await fetchQRImage();
        setLastQrTimestamp(statusData.qrCode.createdAt || null);
      } else if (!statusData.qrCode.available || statusData.qrCode.expired) {
        // Clear image if QR is not available or expired
        if (qrImageUrl) {
          URL.revokeObjectURL(qrImageUrl);
          setQrImageUrl(null);
        }
      }

      return statusData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching QR status:", err);
      return null;
    }
  }, [
    botId,
    calculateTimeRemaining,
    shouldRefreshImage,
    fetchQRImage,
    qrImageUrl,
  ]);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      // Always fetch status first - the status fetch will handle image updates intelligently
      await fetchQRStatus();
    } finally {
      setIsLoading(false);
    }
  }, [fetchQRStatus]);

  const startAutoRefresh = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }

    // Adjust refresh interval based on bot state
    let adjustedInterval = autoRefreshInterval;

    if (qrStatus?.qrCode.available && !qrStatus.qrCode.expired) {
      // If QR is available, check more frequently (every 3 seconds) for authentication
      adjustedInterval = Math.min(autoRefreshInterval, 3000);
    } else if (isAuthenticated) {
      // If already authenticated, check less frequently (every 10 seconds)
      adjustedInterval = Math.max(autoRefreshInterval, 10000);
    }

    console.log(`🔄 Starting auto-refresh with ${adjustedInterval}ms interval`);

    const id = setInterval(refresh, adjustedInterval);
    setIntervalId(id);
  }, [
    refresh,
    autoRefreshInterval,
    intervalId,
    qrStatus?.qrCode.available,
    qrStatus?.qrCode.expired,
    isAuthenticated,
  ]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }, [intervalId]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Update time remaining every second
  useEffect(() => {
    if (!qrStatus?.qrCode.available || qrStatus.qrCode.expired) {
      setTimeRemaining(0);
      return;
    }

    const timeInterval = setInterval(() => {
      const remaining = calculateTimeRemaining(qrStatus);
      setTimeRemaining(remaining);

      // If time expired, refresh status to get updated state
      if (remaining <= 0) {
        refresh();
      }
    }, 1000);

    return () => clearInterval(timeInterval);
  }, [qrStatus, calculateTimeRemaining, refresh]);

  // Restart auto-refresh when QR state changes significantly
  useEffect(() => {
    if (intervalId) {
      // Restart with potentially adjusted interval
      startAutoRefresh();
    }
  }, [
    qrStatus?.qrCode.available,
    qrStatus?.qrCode.expired,
    isAuthenticated,
    intervalId,
    startAutoRefresh,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      // Clean up object URLs to prevent memory leaks
      if (qrImageUrl) {
        URL.revokeObjectURL(qrImageUrl);
      }
    };
  }, [intervalId, qrImageUrl]);

  return {
    qrStatus,
    qrImageUrl,
    isLoading,
    error,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    isAutoRefreshing: intervalId !== null,
    isAuthenticated,
    timeRemaining,
  };
}
