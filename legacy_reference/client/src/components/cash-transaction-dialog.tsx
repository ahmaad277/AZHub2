import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, createIdempotencyKey, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCashTransactionSchema, type InsertCashTransaction, type Platform } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface CashTransactionDialogProps {
  type: "deposit" | "withdrawal";
  onDialogStateChange?: (open: boolean) => void;
}

function toLocalDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateInput(value: string): Date | null {
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  const day = Number.parseInt(dayRaw ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function CashTransactionDialog({ type, onDialogStateChange }: CashTransactionDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isDeposit = type === "deposit";
  const Icon = isDeposit ? ArrowDown : ArrowUp;

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  const form = useForm<InsertCashTransaction>({
    resolver: zodResolver(insertCashTransactionSchema),
    defaultValues: {
      amount: "0",
      type: type,
      source: "transfer",
      notes: "",
      date: new Date(),
      platformId: undefined,
    },
  });

  const addCashMutation = useMutation({
    mutationFn: async ({
      data,
      idempotencyKey,
    }: {
      data: InsertCashTransaction;
      idempotencyKey: string;
    }) => {
      const response = await apiRequest("POST", "/api/cash/transactions", data, {
        headers: {
          "X-Idempotency-Key": idempotencyKey,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      toast({
        title: isDeposit ? t("cash.depositAdded") : t("cash.withdrawalAdded"),
        description: isDeposit ? t("cash.depositAddedDesc") : t("cash.withdrawalAddedDesc"),
      });
      setOpen(false);
      // Reset form with fresh date
      form.reset({
        amount: "0",
        type: type,
        source: "transfer",
        notes: "",
        date: new Date(),
        platformId: undefined,
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("cash.failedToAdd"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCashTransaction) => {
    addCashMutation.mutate({
      data,
      idempotencyKey: createIdempotencyKey("cash-transaction-create"),
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onDialogStateChange?.(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant={isDeposit ? "success" : "destructive"}
          className="h-7 sm:h-6 px-1.5 gap-0.5"
          data-testid={`button-${type}-cash`}
          title={isDeposit ? t("cash.addCash") : t("cash.withdrawCash")}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium leading-tight break-words text-center max-w-[5rem] sm:max-w-none">
            {isDeposit ? t("cash.deposit") : t("cash.withdrawal")}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid={`dialog-${type}-cash`}>
        <DialogHeader>
          <DialogTitle>
            {isDeposit ? t("cash.addCashTransaction") : t("cash.withdrawCashTransaction")}
          </DialogTitle>
          <DialogDescription>
            {isDeposit ? t("cash.depositDescription") : t("cash.withdrawalDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cash.amount")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="1000.00"
                      data-testid="input-cash-amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="platformId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cash.platform")} ({t("common.optional")})</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-cash-platform">
                        <SelectValue placeholder={t("cash.selectPlatform")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t("cash.noPlatform")}</SelectItem>
                      {platforms?.map((platform) => (
                        <SelectItem key={platform.id} value={platform.id}>
                          {platform.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cash.source")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "transfer"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-cash-source">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bank">{t("cash.bank")}</SelectItem>
                      <SelectItem value="transfer">{t("cash.transfer")}</SelectItem>
                      <SelectItem value="profit">{t("cash.profit")}</SelectItem>
                      <SelectItem value="other">{t("cash.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cash.date")}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      data-testid="input-cash-date"
                      value={toLocalDateInputValue(field.value)}
                      onChange={(e) => {
                        const parsed = parseLocalDateInput(e.target.value);
                        field.onChange(parsed ?? new Date());
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cash.notes")} ({t("common.optional")})</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("cash.notesPlaceholder")}
                      data-testid="input-cash-notes"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                data-testid="button-cancel-cash"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={addCashMutation.isPending}
                data-testid="button-save-cash"
              >
                {addCashMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
