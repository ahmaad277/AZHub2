import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { Save } from "lucide-react";

export function SaveCheckpointButton() {
  const [open, setOpen] = useState(false);
  const [checkpointName, setCheckpointName] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/snapshots", { name });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/snapshots"], type: "all" });
      toast({
        title: t("checkpoints.saved"),
        description: t("checkpoints.savedDesc"),
      });
      setOpen(false);
      setCheckpointName("");
    },
    onError: (error: Error) => {
      toast({
        title: t("checkpoints.saveError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!checkpointName.trim()) return;
    createMutation.mutate(checkpointName.trim());
  };

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setOpen(true)}
        data-testid="button-save-checkpoint"
        title={t("checkpoints.saveCheckpoint")}
      >
        <Save className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="dialog-save-checkpoint">
          <DialogHeader>
            <DialogTitle>{t("checkpoints.createTitle")}</DialogTitle>
            <DialogDescription>{t("checkpoints.createDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="checkpoint-name">{t("checkpoints.checkpointName")}</Label>
              <Input
                id="checkpoint-name"
                data-testid="input-checkpoint-name"
                placeholder={t("checkpoints.checkpointNamePlaceholder")}
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
                maxLength={120}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && checkpointName.trim()) {
                    handleSave();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel-checkpoint"
              className="w-full sm:w-auto"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!checkpointName.trim() || createMutation.isPending}
              data-testid="button-confirm-save-checkpoint"
              className="w-full sm:w-auto"
            >
              {createMutation.isPending ? t("common.saving") : t("checkpoints.saveCheckpoint")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
