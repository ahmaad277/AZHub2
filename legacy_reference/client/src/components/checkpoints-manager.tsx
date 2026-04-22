import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { RotateCcw, Trash2, Database, Calendar } from "lucide-react";
import { format } from "date-fns";

type PortfolioSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  snapshotData: any; // Full portfolio state
  entityCounts: {
    investments: number;
    cashflows: number;
    cashTransactions: number;
    alerts: number;
    platforms: number;
    customDistributions: number;
    savedScenarios: number;
  } | null;
  byteSize: number | null;
};

export function CheckpointsManager() {
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<PortfolioSnapshot | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: snapshots = [], isLoading } = useQuery<PortfolioSnapshot[]>({
    queryKey: ["/api/snapshots"],
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/snapshots/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ type: "all" });
      queryClient.clear();
      toast({
        title: t("checkpoints.restored"),
        description: t("checkpoints.restoredDesc"),
      });
      setRestoreDialogOpen(false);
      setSelectedSnapshot(null);
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: t("checkpoints.restoreError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/snapshots/${id}`);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/snapshots"], type: "all" });
      toast({
        title: t("checkpoints.deleted"),
        description: t("checkpoints.deletedDesc"),
      });
      setDeleteDialogOpen(false);
      setSelectedSnapshot(null);
    },
    onError: (error: Error) => {
      toast({
        title: t("checkpoints.deleteError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRestore = (snapshot: PortfolioSnapshot) => {
    setSelectedSnapshot(snapshot);
    setRestoreDialogOpen(true);
  };

  const handleDelete = (snapshot: PortfolioSnapshot) => {
    setSelectedSnapshot(snapshot);
    setDeleteDialogOpen(true);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("checkpoints.title")}</CardTitle>
          <CardDescription>{t("checkpoints.titleDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("checkpoints.title")}</CardTitle>
          <CardDescription>{t("checkpoints.titleDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="text-center py-8" data-testid="text-no-checkpoints">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("checkpoints.noCheckpoints")}</h3>
              <p className="text-sm text-muted-foreground">{t("checkpoints.noCheckpointsDesc")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map((snapshot) => (
                <Card key={snapshot.id} data-testid={`card-checkpoint-${snapshot.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-2 break-words leading-snug whitespace-normal" data-testid={`text-checkpoint-name-${snapshot.id}`}>
                          {snapshot.name}
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span data-testid={`text-checkpoint-date-${snapshot.id}`}>
                              {format(new Date(snapshot.createdAt), "MMM d, yyyy HH:mm")}
                            </span>
                          </div>
                          {snapshot.entityCounts && (
                            <>
                              <div>
                                {t("checkpoints.investments")}: {snapshot.entityCounts.investments}
                              </div>
                              <div>
                                {t("checkpoints.cashflows")}: {snapshot.entityCounts.cashflows}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(snapshot)}
                          data-testid={`button-restore-${snapshot.id}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(snapshot)}
                          data-testid={`button-delete-${snapshot.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent data-testid="dialog-restore-checkpoint">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("checkpoints.restoreTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("checkpoints.restoreDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSnapshot && restoreMutation.mutate(selectedSnapshot.id)}
              disabled={restoreMutation.isPending}
              data-testid="button-confirm-restore"
            >
              {restoreMutation.isPending ? t("common.loading") : t("checkpoints.restoreCheckpoint")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-checkpoint">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("checkpoints.deleteCheckpoint")}</AlertDialogTitle>
            <AlertDialogDescription>{t("checkpoints.deleteWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSnapshot && deleteMutation.mutate(selectedSnapshot.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t("common.loading") : t("checkpoints.deleteCheckpoint")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
