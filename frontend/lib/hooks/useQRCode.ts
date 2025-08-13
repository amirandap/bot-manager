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
  };
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

  const fetchQRStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(api.proxy.getQRCodeStatus(botId));

      if (!response.ok) {
        throw new Error(`Failed to fetch QR status: ${response.status}`);
      }

      const statusData: QRCodeStatus = await response.json();
      setQrStatus(statusData);

      return statusData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching QR status:", err);
      return null;
    }
  }, [botId]);

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
      setQrImageUrl(imageUrl);
    } catch (err) {
      console.error("Error fetching QR image:", err);
      setQrImageUrl(null);
    }
  }, [botId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      // Fetch status first
      const status = await fetchQRStatus();

      // Only fetch image if QR is available and not expired
      if (status?.qrCode.available && !status.qrCode.expired) {
        await fetchQRImage();
      } else {
        setQrImageUrl(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchQRStatus, fetchQRImage]);

  const startAutoRefresh = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }

    const id = setInterval(refresh, autoRefreshInterval);
    setIntervalId(id);
  }, [refresh, autoRefreshInterval, intervalId]);

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
  };
}
