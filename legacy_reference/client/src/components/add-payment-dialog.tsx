import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArabicNumberInput } from "@/components/ui/arabic-number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-provider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { clearFormDraft, loadFormDraft, saveFormDraft } from "@/lib/form-draft";

const formSchema = z.object({
  dueDate: z.date(),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["profit", "principal"]),
  status: z.enum(["upcoming", "expected"]),
});

type FormData = z.infer<typeof formSchema>;

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investmentId: string;
  onSubmit: (data: FormData & { investmentId: string }) => void | Promise<void>;
  isPending?: boolean;
}

export function AddPaymentDialog({
  open,
  onOpenChange,
  investmentId,
  onSubmit,
  isPending = false,
}: AddPaymentDialogProps) {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  const [calendarOpen, setCalendarOpen] = useState(false);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const restoredDraftRef = useRef(false);
  const draftKey = `azfinance:draft:add-payment:${investmentId || "unknown"}`;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dueDate: new Date(),
      amount: "",
      type: "profit",
      status: "upcoming",
    },
  });

  const watchedDueDate = form.watch("dueDate");

  useEffect(() => {
    if (!watchedDueDate) return;
    const isFutureDate = watchedDueDate.getTime() > Date.now();
    form.setValue("status", isFutureDate ? "upcoming" : "expected");
  }, [watchedDueDate, form]);

  const handleSubmit = async (data: FormData) => {
    await onSubmit({ ...data, investmentId });
    clearFormDraft(draftKey);
    restoredDraftRef.current = false;
    form.reset();
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      restoredDraftRef.current = false;
      return;
    }
    if (restoredDraftRef.current) return;
    restoredDraftRef.current = true;

    const draft = loadFormDraft<FormData>(draftKey);
    if (draft) {
      form.reset({
        ...form.getValues(),
        ...draft,
      });
    }
  }, [open, draftKey, form]);

  useEffect(() => {
    if (!open) return;
    const subscription = form.watch((values) => {
      saveFormDraft(draftKey, values as FormData);
    });
    return () => subscription.unsubscribe();
  }, [open, form, draftKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("addPayment.title")}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Due Date */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("report.dueDateColumn")}</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full ltr:pl-3 rtl:pr-3 text-start font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-select-due-date"
                        >
                          {field.value ? (
                            format(field.value, "PPP", {
                              locale: language === "ar" ? ar : enUS,
                            })
                          ) : (
                            <span>{t("addPayment.pickDate")}</span>
                          )}
                          <CalendarIcon className={cn("ltr:ml-auto rtl:mr-auto h-4 w-4 opacity-50", isRtl && "ltr:ml-0 rtl:mr-0 ltr:mr-auto rtl:ml-auto")} />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setCalendarOpen(false);
                          window.setTimeout(() => amountInputRef.current?.focus(), 0);
                        }}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                        locale={language === "ar" ? ar : enUS}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cashflows.amount")}</FormLabel>
                  <FormControl>
                    <ArabicNumberInput
                      ref={amountInputRef}
                      placeholder={language === "ar" ? "0.00" : "0.00"}
                      data-testid="input-payment-amount"
                      value={field.value}
                      onValueChange={(values) => {
                        field.onChange(values.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("addPayment.paymentType")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-type">
                        <SelectValue placeholder={t("addPayment.selectType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="profit">
                        {t("cashflows.profit")}
                      </SelectItem>
                      <SelectItem value="principal">
                        {t("cashflows.principal")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cashflows.status")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-status">
                        <SelectValue placeholder={t("addPayment.selectStatus")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="upcoming">
                        {t("addPayment.statusUpcoming")}
                      </SelectItem>
                      <SelectItem value="expected">
                        {t("addPayment.statusExpected")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  restoredDraftRef.current = false;
                  onOpenChange(false);
                }}
                disabled={isPending}
                data-testid="button-cancel-add-payment"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-add-payment"
              >
                {isPending
                  ? t("addPayment.adding")
                  : t("paymentSchedule.add")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
