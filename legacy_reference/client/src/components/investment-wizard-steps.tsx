import { useFormContext } from "react-hook-form";
import { useQuery } from '@tanstack/react-query';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import type { Platform } from '@shared/schema';
import type { InvestmentFormValues } from './investment-dialog';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Calculator } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoneyAmount } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";

type DurationMode = "months" | "dates";

interface WizardStep1Props {
  onError?: (hasError: boolean, message?: string) => void;
}

export function InvestmentWizardStep1({ onError }: WizardStep1Props) {
  const form = useFormContext<InvestmentFormValues>();

  const { data: platforms = [] } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
    refetchOnMount: true,
  });

  const platformId = form.watch('platformId');
  const name = form.watch('name');

  // Validate this step
  const isValid = platformId && name.trim().length > 0;
  
  if (onError) {
    onError(!isValid, isValid ? undefined : 'يرجى اختيار منصة والقيام بإدخال اسم الاستثمار');
  }

  return (
    <div className="space-y-4">
      {/* Platform Selection */}
      <FormField
        control={form.control}
        name="platformId"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormLabel>
                <span className="text-red-500">*</span> المنصة / Platform
              </FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>اختر المنصة التي تستثمر فيها (Sukuk, Manfa'a, Lendo, إلخ)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنصة" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {platforms?.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              المنصة التي ستتلقى منها الأرباح بشكل دوري
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Investment Name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormLabel>
                <span className="text-red-500">*</span> اسم الاستثمار / Investment Name
              </FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>مثال: "صكوك 2025" أو "عقد مرابحة أبريل"</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <FormControl>
              <Input
                placeholder="مثال: صكوك 2025-A"
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormDescription>
              اسم وصفي للاستثمار لتمييزه عن الاستثمارات الأخرى
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

interface InvestmentWizardStep2Props {
  durationMode: DurationMode;
  onDurationModeChange: (mode: DurationMode) => void;
  durationMonthsInput: number;
  onDurationMonthsChange: (value: number) => void;
}

export function InvestmentWizardStep2({
  durationMode,
  onDurationModeChange,
  durationMonthsInput,
  onDurationMonthsChange,
}: InvestmentWizardStep2Props) {
  const form = useFormContext<InvestmentFormValues>();
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  return (
    <div className="space-y-4">
      {/* Face Value */}
      <FormField
        control={form.control}
        name="faceValue"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormLabel>
                <span className="text-red-500">*</span> القيمة الاسمية / Face Value
              </FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>المبلغ الذي تستثمره بالريال السعودي (بدون فاصلة أو رموز)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <FormControl>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="100000"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  className="flex-1"
                />
                <span className="text-sm font-medium">ر.س</span>
              </div>
            </FormControl>
            <FormDescription>
              المبلغ الرئيسي الذي ستستثمره
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Duration mode */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <FormLabel>
            <span className="text-red-500">*</span> المدة / Duration
          </FormLabel>
          <Tabs value={durationMode} onValueChange={(value) => onDurationModeChange(value as DurationMode)}>
            <TabsList>
              <TabsTrigger value="months" data-testid="tab-duration-months">بالأشهر</TabsTrigger>
              <TabsTrigger value="dates" data-testid="tab-duration-dates">بالتواريخ</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="text-red-500">*</span> تاريخ البدء / Start Date
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} data-testid="input-start-date-wizard" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {durationMode === "dates" ? (
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span className="text-red-500">*</span> تاريخ الاستحقاق / End Date
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ""} data-testid="input-end-date-wizard" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="space-y-2">
              <FormLabel>
                <span className="text-red-500">*</span> عدد الأشهر / Months
              </FormLabel>
              <Input
                type="number"
                min={1}
                placeholder="12"
                value={durationMonthsInput || ""}
                onChange={(e) => onDurationMonthsChange(Number.parseInt(e.target.value || "0", 10) || 0)}
                data-testid="input-duration-months-wizard"
              />
              <FormDescription>سيتم حساب تاريخ الاستحقاق تلقائيًا</FormDescription>
            </div>
          )}
        </div>

        {durationMode === "months" && startDate && durationMonthsInput > 0 ? (
          <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
              سيتم حفظ تاريخ الاستحقاق بناءً على تاريخ البدء + عدد الأشهر.
            </AlertDescription>
          </Alert>
        ) : null}

        {durationMode === "dates" && startDate && endDate ? (
          <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
              سيتم حساب مدة الاستثمار تلقائيًا من التواريخ عند الحفظ.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}

interface InvestmentWizardStep3Props {
  autoCalculatedGrossProfit: number;
  onCalculateProfit: () => void;
  displayDurationMonths: number;
  selectedPlatformCashBalance: number;
}

export function InvestmentWizardStep3({
  autoCalculatedGrossProfit,
  onCalculateProfit,
  displayDurationMonths,
  selectedPlatformCashBalance,
}: InvestmentWizardStep3Props) {
  const form = useFormContext<InvestmentFormValues>();
  const { language, t } = useLanguage();
  const faceValue = form.watch('faceValue');
  const expectedIrr = form.watch('expectedIrr');
  const durationMonths = form.watch('durationMonths');
  const totalExpectedProfit = form.watch('totalExpectedProfit');

  // Calculate profit preview
  const calculatedProfit = faceValue && expectedIrr && durationMonths
    ? (faceValue * (expectedIrr / 100) * (durationMonths / 12))
    : 0;

  return (
    <div className="space-y-4">
      {/* Expected IRR */}
      <FormField
        control={form.control}
        name="expectedIrr"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormLabel>
                <span className="text-red-500">*</span> العائد السنوي / Annual Return (%)
              </FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>النسبة المئوية للعائد السنوي (مثال: 12.5% تكتب 12.5)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <FormControl>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="12.5"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  className="flex-1"
                />
                <span className="text-sm font-medium">%</span>
              </div>
            </FormControl>
            <FormDescription>
              النسبة المئوية للعائد على أساس سنوي
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Total Expected Profit */}
      <FormField
        control={form.control}
        name="totalExpectedProfit"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormLabel>
                الأرباح المتوقعة الكلية / Total Expected Profit
              </FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>إجمالي الأرباح المتوقعة حتى تاريخ الاستحقاق (محسوبة تلقائياً)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <FormControl>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="المبلغ المحسوب تلقائياً"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  className="flex-1"
                />
                <span className="text-sm font-medium">ر.س</span>
              </div>
            </FormControl>
            <FormDescription>
              يتم حسابها تلقائياً بناءً على القيمة الاسمية والعائد ومدة الاستثمار
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Calculate button */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={onCalculateProfit} data-testid="button-calc-profit-wizard">
          <Calculator className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          حساب الأرباح تلقائياً
        </Button>
        {autoCalculatedGrossProfit > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.round(autoCalculatedGrossProfit).toLocaleString("ar-SA")} ر.س
          </span>
        ) : null}
      </div>

      {/* Exclude fees + funded from cash (classic parity) */}
      <FormField
        control={form.control}
        name="excludePlatformFees"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel className="text-sm">استثناء رسوم المنصة</FormLabel>
              <FormDescription className="text-xs">لا تخصم رسوم المنصة من الأرباح لهذا الاستثمار</FormDescription>
            </div>
            <FormControl>
              <Checkbox checked={field.value === 1} onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="fundedFromCash"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel className="text-sm">تمويل من رصيد الكاش</FormLabel>
              <FormDescription className="text-xs tabular-nums">
                المتاح للمنصة: {formatMoneyAmount(selectedPlatformCashBalance, language, { minFractionDigits: 0, maxFractionDigits: 0 })} {t("common.sar")}
              </FormDescription>
            </div>
            <FormControl>
              <Checkbox checked={field.value === 1} onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)} />
            </FormControl>
          </FormItem>
        )}
      />

      {form.watch("fundedFromCash") === 1 && Number(form.watch("faceValue") || 0) > selectedPlatformCashBalance ? (
        <Alert className="bg-destructive/10 border-destructive/40">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm text-destructive">
            رصيد الكاش غير كافٍ لتمويل هذا الاستثمار من هذه المنصة.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Profit Preview */}
      {faceValue && expectedIrr && displayDurationMonths > 0 && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 space-y-2">
          <p className="text-sm font-medium">📊 معاينة الأرباح</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">القيمة الاسمية:</span>
              <p className="font-bold">{faceValue.toLocaleString('ar-SA')} ر.س</p>
            </div>
            <div>
              <span className="text-muted-foreground">الأرباح المتوقعة:</span>
              <p className="font-bold text-green-600">{Math.round(calculatedProfit).toLocaleString('ar-SA')} ر.س</p>
            </div>
            <div>
              <span className="text-muted-foreground">المدة:</span>
              <p className="font-bold">{displayDurationMonths} شهر</p>
            </div>
            <div>
              <span className="text-muted-foreground">الإجمالي عند الاستحقاق:</span>
              <p className="font-bold">{Math.round(faceValue + calculatedProfit).toLocaleString('ar-SA')} ر.س</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
