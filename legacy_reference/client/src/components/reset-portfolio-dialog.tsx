import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Zap, Clock } from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ResetPortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RESET_COUNTDOWN = 30; // 30 seconds countdown

export function ResetPortfolioDialog({ open, onOpenChange }: ResetPortfolioDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [countdown, setCountdown] = useState(RESET_COUNTDOWN);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!open || !hasStartedTyping) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, hasStartedTyping]);

  // Reset countdown when dialog closes
  useEffect(() => {
    if (!open) {
      setCountdown(RESET_COUNTDOWN);
      setHasStartedTyping(false);
      setResetConfirmation("");
    }
  }, [open]);

  const resetPortfolioMutation = useMutation({
    mutationFn: async (confirmation: string) => {
      return apiRequest("POST", "/api/portfolio/reset", {
        confirm: confirmation
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      
      onOpenChange(false);
      setResetConfirmation("");
      
      toast({
        title: t("settings.toast.portfolioResetTitle"),
        description: t("settings.toast.portfolioResetDesc"),
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || error.error || "Failed to reset portfolio";
      toast({
        title: t("dialog.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleReset = () => {
    if (resetConfirmation === "DELETE_ALL_DATA" && countdown > 0) {
      resetPortfolioMutation.mutate(resetConfirmation);
    }
  };

  const handleConfirmationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setResetConfirmation(value);
    
    // Start countdown only when user starts typing the confirmation
    if (value.length > 0 && !hasStartedTyping) {
      setHasStartedTyping(true);
      setCountdown(RESET_COUNTDOWN);
    }
    
    // Reset countdown if user clears the input
    if (value.length === 0) {
      setHasStartedTyping(false);
      setCountdown(RESET_COUNTDOWN);
    }
  };

  const isConfirmationValid = resetConfirmation === "DELETE_ALL_DATA";
  const isButtonDisabled = !isConfirmationValid || countdown <= 0 || resetPortfolioMutation.isPending;
  const countdownPercentage = (countdown / RESET_COUNTDOWN) * 100;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </motion.div>
            <AlertDialogTitle className="text-lg font-bold">
              {t("settings.confirmResetTitle")}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 mt-4">
              {/* Warning Section */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/30"
              >
                <p className="text-sm font-bold text-destructive">
                  ⚠️ {t("settings.confirmResetWarning")}
                </p>
              </motion.div>

              {/* Info Section */}
              <div className="space-y-2">
                <p className="text-sm">{t("settings.confirmResetIntro")}</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>{t("settings.confirmResetListInvestments")}</li>
                  <li>{t("settings.confirmResetListCashflows")}</li>
                  <li>{t("settings.confirmResetListCashTx")}</li>
                  <li>{t("settings.confirmResetListAlerts")}</li>
                  <li>{t("settings.confirmResetListCustom")}</li>
                </ul>
              </div>

              {/* Preserved Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-lg bg-success/5 border border-success/30"
              >
                <p className="text-xs text-muted-foreground">
                  ✓ {t("settings.confirmResetPreserved")}
                </p>
              </motion.div>

              {/* Confirmation Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("settings.confirmResetTypeLabel")}
                </label>
                <Input
                  value={resetConfirmation}
                  onChange={handleConfirmationChange}
                  placeholder="DELETE_ALL_DATA"
                  data-testid="input-reset-confirmation"
                  className={`font-mono text-sm ${
                    isConfirmationValid ? "border-destructive/50" : ""
                  }`}
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.confirmResetHelper") || "Type DELETE_ALL_DATA to confirm"}
                </p>
              </div>

              {/* Countdown Timer */}
              <AnimatePresence>
                {hasStartedTyping && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-3 rounded-lg border ${
                      countdown > 10
                        ? "bg-warning/10 border-warning/30"
                        : "bg-destructive/10 border-destructive/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {countdown > 0
                            ? `${t("settings.countdownExpires") || "Request expires in"}: ${countdown}s`
                            : t("settings.countdownExpired") || "Request expired"}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${
                        countdown > 10 ? "text-warning" : "text-destructive"
                      }`}>
                        {countdown}s
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: "100%" }}
                        animate={{ width: `${countdownPercentage}%` }}
                        className={`h-full ${
                          countdown > 10
                            ? "bg-warning"
                            : "bg-destructive"
                        }`}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Confirmation Status */}
              <AnimatePresence>
                {resetConfirmation && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    {isConfirmationValid ? (
                      <>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center"
                        >
                          <Zap className="h-3 w-3 text-destructive" />
                        </motion.div>
                        <span className="text-destructive font-semibold">
                          {t("settings.confirmationValid") || "Confirmation valid - ready to reset"}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">!</span>
                        </div>
                        <span className="text-muted-foreground">
                          {t("settings.confirmationInvalid") || "Confirmation text must match exactly"}
                        </span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-reset"
          >
            {t("settings.dialogCancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={isButtonDisabled}
            className={`${
              isButtonDisabled
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }`}
            data-testid="button-confirm-reset"
          >
            {resetPortfolioMutation.isPending ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-block mr-2"
                >
                  ⚡
                </motion.span>
                {t("settings.deleting")}
              </>
            ) : countdown <= 0 ? (
              t("settings.countdownExpired") || "Expired"
            ) : (
              t("settings.resetPortfolioFinal")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
