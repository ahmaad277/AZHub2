import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BackupCleanup() {
  const [daysToKeep, setDaysToKeep] = useState(30);
  const [isCleaning, setIsCleaning] = useState(false);
  const { toast } = useToast();

  const cleanupOldBackups = async () => {
    setIsCleaning(true);
    try {
      // Cleanup auto backups
      const autoBackups = JSON.parse(localStorage.getItem("autoBackups") || "[]");
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const filteredAutoBackups = autoBackups.filter((backup: any) => {
        const backupDate = new Date(backup.timestamp);
        return backupDate >= cutoffDate;
      });

      const autoBackupsRemoved = autoBackups.length - filteredAutoBackups.length;
      localStorage.setItem("autoBackups", JSON.stringify(filteredAutoBackups));

      // Cleanup manual backups (if any)
      const manualBackups = JSON.parse(localStorage.getItem("manualBackups") || "[]");
      const filteredManualBackups = manualBackups.filter((backup: any) => {
        const backupDate = new Date(backup.timestamp);
        return backupDate >= cutoffDate;
      });

      const manualBackupsRemoved = manualBackups.length - filteredManualBackups.length;
      localStorage.setItem("manualBackups", JSON.stringify(filteredManualBackups));

      // Cleanup snapshots
      const response = await fetch("/api/snapshots/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ daysToKeep }),
      });

      if (!response.ok) {
        throw new Error("Failed to cleanup snapshots");
      }

      const snapshotResult = await response.json();

      toast({
        title: "تم التنظيف بنجاح",
        description: `تم حذف ${autoBackupsRemoved} نسخ احتياطية تلقائية، ${manualBackupsRemoved} نسخ يدوية، و ${snapshotResult.deletedCount} لقطات`,
      });

      // Reload the page to refresh all components
      window.location.reload();
    } catch (error) {
      console.error("Cleanup failed:", error);
      toast({
        title: "فشل التنظيف",
        description: "حدث خطأ أثناء تنظيف النسخ الاحتياطية",
        variant: "destructive",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          تنظيف النسخ الاحتياطية القديمة
        </CardTitle>
        <CardDescription>
          حذف النسخ الاحتياطية واللقطات الأقدم من عدد معين من الأيام
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="days">الاحتفاظ بالنسخ لمدة (أيام)</Label>
            <Input
              id="days"
              type="number"
              min="1"
              max="365"
              value={daysToKeep}
              onChange={(e) => setDaysToKeep(parseInt(e.target.value) || 30)}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              سيتم حذف جميع النسخ الاحتياطية واللقطات الأقدم من {daysToKeep} يوماً. هذا الإجراء لا يمكن التراجع عنه.
            </p>
          </div>

          <Button
            onClick={cleanupOldBackups}
            disabled={isCleaning}
            variant="destructive"
            className="w-full"
          >
            {isCleaning ? "جاري التنظيف..." : "تنظيف النسخ القديمة"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}