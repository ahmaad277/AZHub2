import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCashTransactionSchema, type InsertCashTransaction } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { clearFormDraft, loadFormDraft, saveFormDraft } from "@/lib/form-draft";

interface AddCashDialogProps {
  onDialogStateChange?: (open: boolean) => void;
}

export function AddCashDialog({ onDialogStateChange }: AddCashDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const restoredDraftRef = useRef(false);
  const draftKey = "azfinance:draft:add-cash-dialog";

  const form = useForm<InsertCashTransaction>({
    resolver: zodResolver(insertCashTransactionSchema),
    defaultValues: {
      amount: "0",
      type: "deposit",
      source: "transfer",
      notes: "",
      date: new Date(),
    },
  });

  const addCashMutation = useMutation({
    mutationFn: async (data: InsertCashTransaction) => {
      const response = await apiRequest("POST", "/api/cash/transactions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      toast({
        title: t("cash.transactionAdded"),
        description: t("cash.transactionAddedDesc"),
      });
      clearFormDraft(draftKey);
      restoredDraftRef.current = false;
      setOpen(false);
      form.reset();
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
    addCashMutation.mutate(data);
  };

  useEffect(() => {
    if (!open) {
      restoredDraftRef.current = false;
      return;
    }
    if (restoredDraftRef.current) return;
    restoredDraftRef.current = true;
    const draft = loadFormDraft<InsertCashTransaction>(draftKey);
    if (draft) {
      form.reset({
        ...form.getValues(),
        ...draft,
      });
    }
  }, [open, form]);

  useEffect(() => {
    if (!open) return;
    const subscription = form.watch((values) => {
      saveFormDraft(draftKey, values as InsertCashTransaction);
    });
    return () => subscription.unsubscribe();
  }, [open, form]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      restoredDraftRef.current = false;
    }
    setOpen(nextOpen);
    onDialogStateChange?.(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-cash" variant="default" size="sm" className="h-9 whitespace-normal">
          <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2 shrink-0" />
          <span className="break-words text-start leading-snug">{t("cash.addCash")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-cash">
        <DialogHeader>
          <DialogTitle>{t("cash.addCashTransaction")}</DialogTitle>
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cash.transactionType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-cash-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="deposit">{t("cash.deposit")}</SelectItem>
                      <SelectItem value="withdrawal">{t("cash.withdrawal")}</SelectItem>
                      <SelectItem value="transfer">{t("cash.transfer")}</SelectItem>
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
                      <SelectItem value="transfer">{t("cash.sourceTransfer")}</SelectItem>
                      <SelectItem value="profit">{t("cash.sourceProfit")}</SelectItem>
                      <SelectItem value="deposit">{t("cash.sourceDeposit")}</SelectItem>
                      <SelectItem value="investment_return">{t("cash.sourceInvestmentReturn")}</SelectItem>
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
                      value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
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
                  <FormLabel>{t("cash.notes")}</FormLabel>
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

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
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
                data-testid="button-submit-cash"
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
