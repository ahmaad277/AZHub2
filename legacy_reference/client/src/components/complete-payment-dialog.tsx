import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language-provider";
import type { InvestmentWithPlatform } from "@shared/schema";
import { CheckCircle } from "lucide-react";

const completePaymentSchema = z.object({
  actualEndDate: z.string().min(1, "Date is required"),
});

type CompletePaymentFormData = z.infer<typeof completePaymentSchema>;

interface CompletePaymentDialogProps {
  investment: InvestmentWithPlatform | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataEntryToken?: string;
}

export function CompletePaymentDialog({
  investment,
  open,
  onOpenChange,
  dataEntryToken,
}: CompletePaymentDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const form = useForm<CompletePaymentFormData>({
    resolver: zodResolver(completePaymentSchema),
    defaultValues: {
      actualEndDate: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (investment && open) {
      form.reset({
        actualEndDate: investment.actualEndDate 
          ? new Date(investment.actualEndDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
    }
  }, [investment, open, form]);

  const completeMutation = useMutation({
    mutationFn: async (data: CompletePaymentFormData) => {
      if (!investment) throw new Error("No investment selected");
      if (dataEntryToken) {
        const res = await fetch(`/api/investments/${investment.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Data-Entry-Token": dataEntryToken,
          },
          body: JSON.stringify({
            actualEndDate: data.actualEndDate,
            status: "completed",
          }),
          credentials: "include",
        });
        if (!res.ok) {
          const text = (await res.text()) || res.statusText;
          throw new Error(`${res.status}: ${text}`);
        }
        return res;
      }

      return apiRequest("PATCH", `/api/investments/${investment.id}`, {
        actualEndDate: data.actualEndDate,
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      if (dataEntryToken) {
        queryClient.invalidateQueries({ queryKey: ["data-entry", dataEntryToken, "/api/investments"] });
        queryClient.invalidateQueries({ queryKey: ["data-entry", dataEntryToken, "/api/cashflows"] });
      }
      toast({
        title: t("dialog.success") || "Success",
        description: t("dialog.investmentCompleted") || "Investment marked as completed",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: t("dialog.error"),
        description: error.message || "Failed to complete payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompletePaymentFormData) => {
    completeMutation.mutate(data);
  };

  if (!investment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-complete-payment">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-chart-2" />
            {t("dialog.confirmPayment") || "Confirm Payment"}
          </DialogTitle>
          <DialogDescription>
            {t("dialog.confirmPaymentDesc") || `Mark "${investment.name}" as fully paid and completed`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="actualEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dialog.actualPaymentDate") || "Actual Payment Date"}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      data-testid="input-actual-end-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={completeMutation.isPending}
                data-testid="button-cancel"
              >
                {t("dialog.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={completeMutation.isPending}
                data-testid="button-confirm-payment"
              >
                {completeMutation.isPending ? (
                  t("dialog.saving")
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("dialog.confirmPayment") || "Confirm Payment"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
