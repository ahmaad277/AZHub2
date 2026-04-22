import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language-provider";
import { Activity, Database, Server, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

type HealthStatus = {
  status: "healthy" | "unhealthy";
  timestamp: string;
  database: "connected" | "disconnected";
  uptime: number;
  version: string;
  error?: string;
};

export function SystemHealthMonitor() {
  const { t } = useLanguage();

  const { data: health, isLoading, error, refetch } = useQuery<HealthStatus>({
    queryKey: ["/health"],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "unhealthy":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  const getDatabaseStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-600 dark:text-green-400";
      case "disconnected":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-yellow-600 dark:text-yellow-400";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>Monitoring system status and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking system health...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            System Health
          </CardTitle>
          <CardDescription>Unable to check system status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-destructive">
              Failed to connect to health check endpoint
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
        <CardDescription>Real-time system monitoring and diagnostics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {health?.status === "healthy" ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <span className="font-medium">System Status</span>
          </div>
          <Badge className={getStatusColor(health?.status || "unknown")}>
            {health?.status || "Unknown"}
          </Badge>
        </div>

        {/* Database Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="text-sm">Database</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                health?.database === "connected"
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            <span className={`text-sm font-medium ${getDatabaseStatusColor(health?.database || "disconnected")}`}>
              {health?.database || "Unknown"}
            </span>
          </div>
        </div>

        {/* Server Uptime */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span className="text-sm">Server Uptime</span>
          </div>
          <span className="text-sm font-mono">
            {health?.uptime ? formatUptime(health.uptime) : "N/A"}
          </span>
        </div>

        {/* Version */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Version</span>
          <span className="text-sm font-mono">{health?.version || "N/A"}</span>
        </div>

        {/* Last Check */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Last Check</span>
          <span className="text-sm text-muted-foreground">
            {health?.timestamp
              ? format(new Date(health.timestamp), "HH:mm:ss")
              : "Never"
            }
          </span>
        </div>

        {/* Error Display */}
        {health?.error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> {health.error}
            </p>
          </div>
        )}

        {/* Manual Refresh */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
}