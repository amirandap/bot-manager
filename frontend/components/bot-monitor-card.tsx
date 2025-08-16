import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Cpu,
  MemoryStick,
  Timer,
  RefreshCcw,
  CircleAlert,
  Network,
  ScanLine,
  Server,
  Smartphone,
} from "lucide-react";

import type { BotStatus } from "@/lib/types";

/**
 * BotMonitorCard — Minimal, dense, and information-rich monitor card for WhatsApp bots.
 *
 * UI/UX principles used:
 * - Visual hierarchy: single primary signal (Status) on the left, supporting vitals right next to it.
 * - Dense layout under 280–320px width (mobile/sidebars) with readable tap targets.
 * - Color only for status/severity; everything else neutral for minimal noise.
 * - Compact metrics with icons + numbers; microcopy via tooltips to avoid clutter.
 * - Progressive disclosure: details live in a slim bottom row.
 */

// Type alias for cleaner code - now uses dynamic PM2 metrics
export type BotMetrics = BotStatus["pm2"] & {
  // Legacy fallbacks for backward compatibility
  pid?: number;
  cpu?: number;
  memory?: number;
  restarts?: number;
  uptime?: number;
  status?: string;
};

const fmt = {
  time(s: number) {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  },
  num(n: number) {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 1,
    }).format(n);
  },
};

function levelColor(percent: number, reverse = false) {
  // reverse=false: green<=65, yellow<=85, red>85  (for resource usage)
  // reverse=true: green>=65, yellow>=40, red<40   (for uptime health etc.)
  if (!reverse) {
    if (percent <= 65) return "bg-emerald-500";
    if (percent <= 85) return "bg-amber-500";
    return "bg-rose-600";
  }
  if (percent >= 65) return "bg-emerald-500";
  if (percent >= 40) return "bg-amber-500";
  return "bg-rose-600";
}

function StatusDot({ color }: { color: string }) {
  return <span className={`inline-block size-2.5 rounded-full ${color}`} />;
}

function Pill({
  children,
  tone = "default" as "default" | "warn" | "bad" | "good",
}: {
  children: React.ReactNode;
  tone?: "default" | "warn" | "bad" | "good";
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    bad: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
    good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  unit,
  warn,
  bad,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  unit?: string;
  warn?: boolean;
  bad?: boolean;
}) {
  const tone = bad
    ? "text-rose-600"
    : warn
    ? "text-amber-600"
    : "text-foreground";
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className="size-3.5 opacity-70" />
      <span className={`text-[11px] leading-none ${tone}`}>
        {value}
        {unit ? unit : ""}
      </span>
      <span className="text-[10px] text-muted-foreground truncate">
        {label}
      </span>
    </div>
  );
}

function TinyProgress({
  value,
  ariaLabel,
}: {
  value: number;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-1" aria-label={ariaLabel}>
      <div className="h-1 w-16 bg-muted rounded">
        <div
          className={`h-1 rounded ${levelColor(value)}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">
        {Math.round(value)}%
      </span>
    </div>
  );
}

export default function BotMonitorCard({
  title = "Bot",
  metrics,
}: {
  title?: string;
  metrics: BotMetrics;
}) {
  const online =
    /online|ready|connected/i.test(metrics.status || '') ||
    (typeof metrics.apiServerStatus === 'number' ? metrics.apiServerStatus === 1 : false);
  const hasErrors = (metrics.errorCount ?? 0) > 0;
  const statusTone = hasErrors
    ? "destructive"
    : online
    ? "success"
    : "secondary";

  const statusBadgeMap: Record<string, { label: string; className: string }> = {
    success: { label: "Online", className: "bg-emerald-600" },
    secondary: {
      label: "Offline",
      className: "bg-muted text-muted-foreground",
    },
    destructive: { label: "Errors", className: "bg-rose-600" },
  };

  const statusBadge = statusBadgeMap[statusTone];

  const cpu = Math.max(0, Math.min(100, metrics.cpu ?? 0));
  const heap = Math.max(0, Math.min(100, metrics.heapUsage ?? 0));
  const browserCpu = Math.max(0, Math.min(100, metrics.browserCpuUsage ?? 0));
  const browserMem = metrics.browserMemoryUsage ?? 0;
  const uptime = metrics.uptime ?? 0;
  const restarts = metrics.restarts ?? 0;
  const errorCount = metrics.errorCount ?? 0;
  const httpRequests = metrics.httpRequests ?? 0;
  const pid = metrics.pid ?? 0;

  const qrNeeded = /scan|qr_ready/i.test(
    `${metrics.qrCodeStatus || ''} ${metrics.whatsappStatus || ''}`
  );

  return (
    <Card className="w-full max-w-sm rounded-2xl shadow-sm border-muted/60">
      <CardHeader className="py-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot
              color={
                hasErrors
                  ? "bg-rose-600"
                  : online
                  ? "bg-emerald-500"
                  : "bg-muted-foreground"
              }
            />
            <CardTitle className="text-sm font-semibold truncate">
              {title}
            </CardTitle>
          </div>
          <Badge className={`h-5 px-2 text-[10px] ${statusBadge.className}`}>
            {statusBadge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-0 px-3 pb-3">
        {/* Primary vitals row */}
        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="col-span-2 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <TinyProgress value={cpu} ariaLabel="CPU usage" />
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Cpu className="size-3.5" /> CPU
              </div>
            </div>
            <div className="flex items-center justify-between">
              <TinyProgress value={heap} ariaLabel="Heap usage" />
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MemoryStick className="size-3.5" /> Heap
              </div>
            </div>
          </div>
          <div className="col-span-1 flex flex-col items-end gap-1">
            <Metric
              icon={Timer}
              label="uptime"
              value={fmt.time(uptime)}
            />
            <Metric
              icon={RefreshCcw}
              label="restarts"
              value={restarts}
              warn={restarts > 0 && restarts < 5}
              bad={restarts >= 5}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="my-2 border-t border-muted" />

        {/* Secondary compact facts */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5">
            <Activity className="size-3.5 opacity-70" />
            <Pill
              tone={hasErrors ? "bad" : errorCount ? "warn" : "default"}
            >
              {errorCount} errs
            </Pill>
          </div>

          <div className="flex items-center gap-1.5">
            <Network className="size-3.5 opacity-70" />
            <span className="text-[11px] text-muted-foreground">
              req {httpRequests}
            </span>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <Server className="size-3.5 opacity-70" />
            <span className="text-[11px] text-muted-foreground">
              pid {pid}
            </span>
          </div>
        </div>

        {/* Bottom line: states & environment */}
        <div className="mt-2 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {qrNeeded ? (
              <ScanLine className="size-3.5 text-amber-600" />
            ) : (
              <Smartphone className="size-3.5 text-emerald-600" />
            )}
            <span className="text-[11px] truncate">
              {qrNeeded
                ? "QR listo para escanear"
                : metrics.whatsappStatus || "WhatsApp OK"}
            </span>
          </div>
          <span
            className="text-[10px] text-muted-foreground truncate max-w-[50%]"
            title={metrics.botStatus || metrics.status}
          >
            {metrics.botStatus || metrics.status}
          </span>
        </div>

        {/* Optional browser footprint if present */}
        {(browserCpu > 0 || browserMem > 0) && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Chromium CPU
              </span>
              <TinyProgress value={browserCpu} ariaLabel="Browser CPU" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Chromium MEM
              </span>
              <span className="text-[10px] tabular-nums">
                {fmt.num(browserMem)} MB
              </span>
            </div>
          </div>
        )}

        {/* Alerts (micro) */}
        {(heap >= 90 || cpu >= 90) && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-600">
            <CircleAlert className="size-3.5" />
            <span>{heap >= 90 ? "Heap alto" : "CPU alta"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Example usage:
// <BotMonitorCard title="Bot A" metrics={dataFromYourProcess} />
