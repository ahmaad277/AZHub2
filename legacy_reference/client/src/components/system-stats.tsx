import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database, HardDrive, Clock, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SystemStats {
  database: {
    status: "connected" | "disconnected";
    size?: string;
    tables?: number;
  };
  backups: {
    autoBackups: number;
    manualBackups: number;
    totalSize: string;
  };
  snapshots: {
    count: number;
    totalSize: string;
    oldestDate?: string;
  };
  performance: {
    uptime: number;
    memoryUsage?: string;
    responseTime?: number;
  };
}

export function SystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get health data
      const healthResponse = await fetch("/health");
      const healthData = await healthResponse.json();

      // Get backup data from localStorage
      const autoBackups = JSON.parse(localStorage.getItem("autoBackups") || "[]");
      const manualBackups = JSON.parse(localStorage.getItem("manualBackups") || "[]");

      // Calculate backup sizes
      const calculateTotalSize = (backups: any[]) => {
        return backups.reduce((total, backup) => {
          return total + (JSON.stringify(backup).length / 1024); // KB
        }, 0);
      };

      // Get snapshots data
      const snapshotsResponse = await fetch("/api/snapshots");
      const snapshots = await snapshotsResponse.json();

      const snapshotSize = snapshots.reduce((total: number, snapshot: any) => {
        return total + (snapshot.byteSize || 0);
      }, 0);

      const oldestSnapshot = snapshots.length > 0
        ? snapshots.reduce((oldest: any, current: any) =>
            new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest
          )
        : null;

      setStats({
        database: {
          status: healthData.database === "connected" ? "connected" : "disconnected",
          size: "غير محدد", // Would need database-specific query
          tables: 8, // Approximate number of tables
        },
        backups: {
          autoBackups: autoBackups.length,
          manualBackups: manualBackups.length,
          totalSize: `${(calculateTotalSize([...autoBackups, ...manualBackups]) / 1024).toFixed(2)} MB`,
        },
        snapshots: {
          count: snapshots.length,
          totalSize: `${(snapshotSize / (1024 * 1024)).toFixed(2)} MB`,
          oldestDate: oldestSnapshot ? new Date(oldestSnapshot.createdAt).toLocaleDateString("ar-SA") : undefined,
        },
        performance: {
          uptime: healthData.uptime,
          memoryUsage: "غير محدد", // Would need process monitoring
          responseTime: Date.now() - new Date(healthData.timestamp).getTime(),
        },
      });
    } catch (error) {
      console.error("Failed to load system stats:", error);
      toast({
        title: "خطأ في تحميل الإحصائيات",
        description: "فشل في تحميل إحصائيات النظام",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days} يوم ${hours} ساعة`;
    if (hours > 0) return `${hours} ساعة ${minutes} دقيقة`;
    return `${minutes} دقيقة`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            إحصائيات النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">جاري التحميل...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          إحصائيات النظام
        </CardTitle>
        <CardDescription>
          معلومات حول حالة النظام والأداء
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Database Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="font-medium">قاعدة البيانات</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={stats.database.status === "connected" ? "default" : "destructive"}>
                {stats.database.status === "connected" ? "متصلة" : "غير متصلة"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {stats.database.tables} جداول
              </span>
            </div>
          </div>

          {/* Backups */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="font-medium">النسخ الاحتياطية</span>
            </div>
            <div className="text-sm text-muted-foreground">
              تلقائي: {stats.backups.autoBackups} | يدوي: {stats.backups.manualBackups}
            </div>
            <div className="text-sm text-muted-foreground">
              الحجم الإجمالي: {stats.backups.totalSize}
            </div>
          </div>

          {/* Snapshots */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">اللقطات</span>
            </div>
            <div className="text-sm text-muted-foreground">
              العدد: {stats.snapshots.count} | الحجم: {stats.snapshots.totalSize}
            </div>
            {stats.snapshots.oldestDate && (
              <div className="text-sm text-muted-foreground">
                الأقدم: {stats.snapshots.oldestDate}
              </div>
            )}
          </div>

          {/* Performance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="font-medium">الأداء</span>
            </div>
            <div className="text-sm text-muted-foreground">
              وقت التشغيل: {formatUptime(stats.performance.uptime)}
            </div>
            <div className="text-sm text-muted-foreground">
              زمن الاستجابة: {stats.performance.responseTime}ms
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button onClick={loadStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            تحديث
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}