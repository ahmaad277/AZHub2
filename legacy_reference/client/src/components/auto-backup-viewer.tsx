import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AutoBackup {
  filename: string;
  timestamp: string;
  data: string;
}

export function AutoBackupViewer() {
  const [backups, setBackups] = useState<AutoBackup[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = () => {
    try {
      const savedBackups = localStorage.getItem("autoBackups");
      if (savedBackups) {
        setBackups(JSON.parse(savedBackups));
      }
    } catch (error) {
      console.error("Failed to load auto backups:", error);
    }
  };

  const downloadBackup = (backup: AutoBackup) => {
    try {
      const blob = new Blob([backup.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backup.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "تم تحميل النسخة الاحتياطية",
        description: `تم تحميل ${backup.filename} بنجاح`,
      });
    } catch (error) {
      toast({
        title: "خطأ في التحميل",
        description: "فشل في تحميل النسخة الاحتياطية",
        variant: "destructive",
      });
    }
  };

  const deleteBackup = (index: number) => {
    try {
      const updatedBackups = backups.filter((_, i) => i !== index);
      setBackups(updatedBackups);
      localStorage.setItem("autoBackups", JSON.stringify(updatedBackups));

      toast({
        title: "تم حذف النسخة الاحتياطية",
        description: "تم حذف النسخة الاحتياطية بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في الحذف",
        description: "فشل في حذف النسخة الاحتياطية",
        variant: "destructive",
      });
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (backups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            النسخ الاحتياطية التلقائية
          </CardTitle>
          <CardDescription>
            لم يتم إنشاء أي نسخ احتياطية تلقائية بعد
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          النسخ الاحتياطية التلقائية
        </CardTitle>
        <CardDescription>
          النسخ الاحتياطية التي تم إنشاؤها تلقائياً ({backups.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {backups.map((backup, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium">{backup.filename}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(backup.timestamp)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {(JSON.parse(backup.data).length / 1024).toFixed(1)} KB
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadBackup(backup)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteBackup(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}