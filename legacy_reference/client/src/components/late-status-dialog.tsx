import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, CheckCircle, CheckCircle2 } from "lucide-react";
import type { InvestmentWithPlatform } from "@shared/schema";

const lateStatusSchema = z.object({
  clearLateStatus: z.enum(["clear", "keep", "custom"]),
  customLateDays: z.coerce.number().int().min(1).optional(),
}).superRefine((data, ctx) => {
  // If "custom" is selected, customLateDays is required
  if (data.clearLateStatus === "custom" && !data.customLateDays) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter the number of late days",
      path: ["customLateDays"],
    });
  }
});

type LateStatusFormData = z.infer<typeof lateStatusSchema>;

type SingleModeProps = {
  mode: "single";
  cashflowId: string | null;
  onConfirm: (data: {
    cashflowId: string;
    clearLateStatus?: boolean;
    updateLateInfo?: { lateDays: number };
  }) => void;
};

type BulkModeProps = {
  mode: "bulk";
  pendingCount: number;
  totalAmount: number;
  onConfirm: (data: {
    investmentId: string;
    clearLateStatus?: boolean;
    updateLateInfo?: { lateDays: number };
  }) => void;
};

type LateStatusDialogProps = {
  investment: InvestmentWithPlatform | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
} & (SingleModeProps | BulkModeProps);

export function LateStatusDialog(props: LateStatusDialogProps) {
  const { investment, open, onOpenChange, isPending } = props;
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  
  const form = useForm<LateStatusFormData>({
    resolver: zodResolver(lateStatusSchema),
    defaultValues: {
      clearLateStatus: "clear",
      customLateDays: undefined,
    },
  });

  const clearLateStatusValue = form.watch("clearLateStatus");
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        clearLateStatus: "clear",
        customLateDays: undefined,
      });
    }
  }, [open, form]);

  const onSubmit = (data: LateStatusFormData) => {
    if (props.mode === "single") {
      if (!props.cashflowId) return;

      const payload: {
        cashflowId: string;
        clearLateStatus?: boolean;
        updateLateInfo?: { lateDays: number };
      } = {
        cashflowId: props.cashflowId,
      };

      if (data.clearLateStatus === "clear") {
        payload.clearLateStatus = true;
      } else if (data.clearLateStatus === "custom" && data.customLateDays) {
        payload.updateLateInfo = {
          lateDays: data.customLateDays,
        };
      }

      props.onConfirm(payload);
    } else {
      // Bulk mode
      if (!investment) return;

      const payload: {
        investmentId: string;
        clearLateStatus?: boolean;
        updateLateInfo?: { lateDays: number };
      } = {
        investmentId: investment.id,
      };

      if (data.clearLateStatus === "clear") {
        payload.clearLateStatus = true;
      } else if (data.clearLateStatus === "custom" && data.customLateDays) {
        payload.updateLateInfo = {
          lateDays: data.customLateDays,
        };
      }

      props.onConfirm(payload);
    }
  };

  // Calculate current late days
  const calculateLateDays = () => {
    if (!investment || !investment.lateDate) return 0;
    const now = new Date();
    const lateDate = new Date(investment.lateDate);
    return Math.floor((now.getTime() - lateDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const currentLateDays = calculateLateDays();
  const isDefaulted = investment?.status === "defaulted";
  const isLateOrDefaulted = investment?.status === "late" || investment?.status === "defaulted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {props.mode === "bulk" ? (
              <CheckCircle2 className="h-5 w-5 text-chart-2" />
            ) : isDefaulted ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            {props.mode === "bulk"
              ? t("lateStatus.titleComplete")
              : t("lateStatus.titleLate")}
          </DialogTitle>
          <DialogDescription>
            {props.mode === "bulk"
              ? t("lateStatus.descBulk", {
                  count: String(props.pendingCount),
                  amount: formatCurrency(props.totalAmount, "SAR"),
                })
              : t("lateStatus.descSingle", {
                  status: isDefaulted
                    ? t("lateStatus.stateWordDefaulted")
                    : t("lateStatus.stateWordLate"),
                  days: String(currentLateDays),
                })}
          </DialogDescription>
        </DialogHeader>

        {/* Show late status options only for late/defaulted investments */}
        {(props.mode === "single" || (props.mode === "bulk" && isLateOrDefaulted)) && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {props.mode === "bulk" && isLateOrDefaulted && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-500">
                    {t("lateStatus.bulkLateHint", { days: String(currentLateDays) })}
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="clearLateStatus"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>
                      {t("lateStatus.labelGroup")}
                    </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-3"
                    >
                      <div className="flex items-start space-x-3 space-x-reverse">
                        <RadioGroupItem value="clear" id="clear" data-testid="radio-clear-late-status" />
                        <div className="flex-1">
                          <Label
                            htmlFor="clear"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-chart-2" />
                              {t("lateStatus.clearLate")}
                            </div>
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("lateStatus.clearLateHelp")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 space-x-reverse">
                        <RadioGroupItem value="keep" id="keep" data-testid="radio-keep-late-status" />
                        <div className="flex-1">
                          <Label
                            htmlFor="keep"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {t("lateStatus.keepAsIs")}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("lateStatus.keepHelp")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 space-x-reverse">
                        <RadioGroupItem value="custom" id="custom" data-testid="radio-custom-late-days" />
                        <div className="flex-1">
                          <Label
                            htmlFor="custom"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {t("lateStatus.updateDays")}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1 mb-2">
                            {t("lateStatus.updateDaysHelp")}
                          </p>
                          
                          {clearLateStatusValue === "custom" && (
                            <FormField
                              control={form.control}
                              name="customLateDays"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder={t("lateStatus.daysPlaceholder")}
                                      {...field}
                                      data-testid="input-custom-late-days"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                  data-testid="button-cancel-late-status"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || (clearLateStatusValue === "custom" && !form.watch("customLateDays"))}
                  data-testid="button-confirm-payment"
                >
                  {isPending ? (
                    t("lateStatus.confirming")
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                      {t("lateStatus.confirmPayment")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Bulk mode without late status - simple confirmation */}
        {props.mode === "bulk" && !isLateOrDefaulted && (
            <div className="space-y-4">
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="flex-1"
                data-testid="button-cancel"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (investment) {
                    props.onConfirm({ investmentId: investment.id });
                  }
                }}
                disabled={isPending}
                className="flex-1"
                data-testid="button-confirm-bulk-complete"
              >
                {isPending ? t("lateStatus.confirming") : t("lateStatus.confirmPayment")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
