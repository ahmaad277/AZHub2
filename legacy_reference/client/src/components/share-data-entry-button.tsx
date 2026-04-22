import { useState } from "react";
import { Share2, Copy, RotateCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/language-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { UserSettings } from "@shared/schema";
import { buildDataEntryShareUrl, getShareBaseUrl } from "@/lib/share-link";

export function ShareDataEntryButton() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "POST",
        "/api/settings/generate-data-entry-token",
        {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: t("shareDataEntry.toastGeneratedTitle"),
        description: t("shareDataEntry.toastGeneratedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("dialog.error"),
        description: error.message || t("shareDataEntry.toastGenerateError"),
        variant: "destructive",
      });
    },
  });

  const shareUrl = buildDataEntryShareUrl(settings?.dataEntryToken);
  const currentShareBaseUrl = getShareBaseUrl();
  const usesLocalhost =
    currentShareBaseUrl.includes("localhost") || currentShareBaseUrl.includes("127.0.0.1");

  const handleCopy = async () => {
    if (!shareUrl) {
      toast({
        title: t("shareDataEntry.copyUnavailableTitle"),
        description: t("shareDataEntry.copyUnavailableDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: t("shareDataEntry.toastCopiedTitle"),
        description: t("shareDataEntry.toastCopiedDesc"),
      });
    } catch (error) {
      // Fallback for older browsers / restricted clipboard permissions
      const hasPrompt = typeof window !== "undefined" && typeof window.prompt === "function";
      if (hasPrompt) {
        window.prompt(
          t("shareDataEntry.promptManual"),
          shareUrl
        );
      }
      toast({
        title: t("shareDataEntry.toastManualTitle"),
        description: t("shareDataEntry.toastManualDesc"),
      });
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        data-testid="button-share-data-entry"
        title={t("shareDataEntry.dialogTitle")}
      >
        <Share2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" dir={language === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {t("shareDataEntry.dialogTitleFull")}
            </DialogTitle>
            <DialogDescription>
              {t("shareDataEntry.dialogDescriptionFull")}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !settings?.dataEntryToken ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("shareDataEntry.noTokenHint")}
              </p>
              <Button
                onClick={() => generateTokenMutation.mutate()}
                disabled={generateTokenMutation.isPending}
                className="w-full"
                data-testid="button-generate-link"
              >
                {generateTokenMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("shareDataEntry.generating")}
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    {t("shareDataEntry.generateButton")}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-link">
                  {t("shareDataEntry.linkLabel")}
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="share-link"
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                    data-testid="input-share-link"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopy}
                    disabled={!shareUrl}
                    data-testid="button-copy-link"
                    className="h-10 w-full shrink-0 sm:h-9 sm:w-9"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => generateTokenMutation.mutate()}
                  disabled={generateTokenMutation.isPending}
                  className="w-full"
                  data-testid="button-regenerate-link"
                >
                  {generateTokenMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("shareDataEntry.regenerating")}
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-4 w-4" />
                      {t("shareDataEntry.regenerateButton")}
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {t("shareDataEntry.regenerateInvalidate")}
              </p>
              {usesLocalhost && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t("shareDataEntry.localhostNote")}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
