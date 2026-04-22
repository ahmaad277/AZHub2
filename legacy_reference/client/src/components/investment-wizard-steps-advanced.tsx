import { useFormContext } from 'react-hook-form';
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
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import type { InvestmentFormValues } from './investment-dialog';
import { CustomCashflowEditor, type CustomCashflow } from "@/components/custom-cashflow-editor";
import type { Platform } from "@shared/schema";

interface InvestmentWizardStep4Props {
  customCashflows: CustomCashflow[];
  onCustomCashflowsChange: (cashflows: CustomCashflow[]) => void;
}

export function InvestmentWizardStep4({ customCashflows, onCustomCashflowsChange }: InvestmentWizardStep4Props) {
  const form = useFormContext<InvestmentFormValues>();

  return (
    <div className="space-y-4">
      {/* Distribution Frequency */}
      <FormField
        control={form.control}
        name="distributionFrequency"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormLabel>
                <span className="text-red-500">*</span> تكرار التوزيع / Distribution Frequency
              </FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>كم مرة ستتلقى الأرباح بشكل دوري؟</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={field.value || 'quarterly'} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="monthly">شهري / Monthly</SelectItem>
                <SelectItem value="quarterly">ربع سنوي / Quarterly</SelectItem>
                <SelectItem value="semi_annually">نصف سنوي / Semi-Annually</SelectItem>
                <SelectItem value="annually">سنوي / Annually</SelectItem>
                <SelectItem value="at_maturity">عند الاستحقاق / At Maturity</SelectItem>
                <SelectItem value="custom">مخصص / Custom</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              الفترة الزمنية لاستقبال الأرباح
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Profit Payment Structure */}
      <FormField
        control={form.control}
        name="profitPaymentStructure"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormLabel>
                <span className="text-red-500">*</span> طريقة دفع الأرباح / Profit Payment
              </FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>هل تتلقى الأرباح بشكل دوري أم مع المبلغ الأساسي في النهاية؟</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={field.value || 'periodic'} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="periodic">دوري / Periodic</SelectItem>
                <SelectItem value="at_maturity">عند الاستحقاق / At Maturity</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              متى تتلقى الأرباح؟
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Risk Score */}
      <FormField
        control={form.control}
        name="riskScore"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FormLabel>
                  درجة المخاطرة / Risk Score
                </FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>تصنيف خطورة الاستثمار (0 = آمن جداً، 100 = خطير جداً)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-lg font-bold text-primary">{field.value || 50}</span>
            </div>
            <FormControl>
              <div className="space-y-2">
                <Slider
                  value={[field.value || 50]}
                  onValueChange={(value) => field.onChange(value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>آمن جداً (0)</span>
                  <span>متوسط (50)</span>
                  <span>خطير جداً (100)</span>
                </div>
              </div>
            </FormControl>
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
            <div className="flex items-center gap-2">
              <FormLabel>
                <span className="text-red-500">*</span> الحالة / Status
              </FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>ما هي الحالة الحالية للاستثمار؟</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={field.value || 'active'} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="active">نشط / Active</SelectItem>
                <SelectItem value="late">متأخر / Late</SelectItem>
                <SelectItem value="defaulted">متعثر / Defaulted</SelectItem>
                <SelectItem value="completed">مكتمل / Completed</SelectItem>
                <SelectItem value="pending">معلق / Pending</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              تحديث حالة الاستثمار الحالية
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Exclude Platform Fees */}
      <FormField
        control={form.control}
        name="excludePlatformFees"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel className="text-sm">
                استثناء رسوم المنصة / Exclude Platform Fees
              </FormLabel>
              <FormDescription className="text-xs">
                لا تخصم رسوم المنصة من الأرباح لهذا الاستثمار
              </FormDescription>
            </div>
            <FormControl>
              <Checkbox
                checked={field.value === 1}
                onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Is Reinvestment */}
      <FormField
        control={form.control}
        name="isReinvestment"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel className="text-sm">
                تعويض من الأرباح / Is Reinvestment
              </FormLabel>
              <FormDescription className="text-xs">
                هذا الاستثمار ممول من أرباح استثمارات سابقة
              </FormDescription>
            </div>
            <FormControl>
              <Checkbox
                checked={field.value === 1}
                onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Custom Distributions */}
      {form.watch("distributionFrequency") === "custom" && (
        <div className="border rounded-lg p-4 bg-muted/10">
          <CustomCashflowEditor
            cashflows={customCashflows}
            onChange={onCustomCashflowsChange}
            startDate={form.watch("startDate")}
            endDate={form.watch("endDate")}
            expectedProfit={form.watch("totalExpectedProfit")}
          />
        </div>
      )}
    </div>
  );
}

interface InvestmentWizardStep5Props {
  investment?: unknown;
  calculatedMetrics?: unknown;
  language?: string;
  platforms?: Platform[];
}

export function InvestmentWizardStep5({ platforms = [] }: InvestmentWizardStep5Props) {
  const form = useFormContext<InvestmentFormValues>();
  const formValues = form.getValues();

  const calculatedProfit = formValues.faceValue && formValues.expectedIrr && formValues.durationMonths
    ? (formValues.faceValue * (formValues.expectedIrr / 100) * (formValues.durationMonths / 12))
    : formValues.totalExpectedProfit || 0;

  const endDate = formValues.endDate
    ? new Date(formValues.endDate).toLocaleDateString("ar-SA")
    : "غير محدد";

  const platformName =
    platforms.find((p) => p.id === formValues.platformId)?.name ?? formValues.platformId ?? "غير محدد";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 تلخيص الاستثمار / Investment Summary</CardTitle>
          <CardDescription>
            تحقق من المعلومات أدناه وتأكد من صحتها قبل الحفظ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b">
            <div>
              <p className="text-xs text-muted-foreground">المنصة</p>
              <p className="font-semibold">{platformName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الاسم</p>
              <p className="font-semibold">{formValues.name || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">تاريخ البدء</p>
              <p className="font-semibold">{formValues.startDate ? new Date(formValues.startDate).toLocaleDateString('ar-SA') : 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">تاريخ الاستحقاق</p>
              <p className="font-semibold">{endDate}</p>
            </div>
          </div>

          {/* Financial Information */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">القيمة الاسمية</p>
              <p className="font-semibold text-lg">{formValues.faceValue?.toLocaleString('ar-SA') || '0'} ر.س</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">العائد السنوي</p>
              <p className="font-semibold text-lg">{formValues.expectedIrr}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الأرباح المتوقعة</p>
              <p className="font-semibold text-green-600">{Math.round(calculatedProfit).toLocaleString('ar-SA')} ر.س</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الإجمالي عند الاستحقاق</p>
              <p className="font-semibold text-green-600">{Math.round((formValues.faceValue || 0) + calculatedProfit).toLocaleString('ar-SA')} ر.س</p>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">تكرار التوزيع:</span>
              <span className="font-medium">{getDistributionLabel(formValues.distributionFrequency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">طريقة الدفع:</span>
              <span className="font-medium">{formValues.profitPaymentStructure === 'periodic' ? 'دوري' : 'عند الاستحقاق'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">درجة المخاطرة:</span>
              <span className="font-medium">{formValues.riskScore || 50}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الحالة:</span>
              <span className="font-medium">{getStatusLabel(formValues.status)}</span>
            </div>
          </div>

          {/* Warning if needed */}
          {(formValues.riskScore || 50) > 75 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠️ <strong>تنبيه:</strong> درجة مخاطرة عالية جداً لهذا الاستثمار. تأكد من أنك مرتاح لهذا المستوى من الخطورة.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getDistributionLabel(freq?: string): string {
  const labels: Record<string, string> = {
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    semi_annually: 'نصف سنوي',
    annually: 'سنوي',
    at_maturity: 'عند الاستحقاق',
    custom: 'مخصص',
  };
  return labels[freq || 'quarterly'] || freq || 'غير محدد';
}

function getStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    active: 'نشط',
    late: 'متأخر',
    defaulted: 'متعثر',
    completed: 'مكتمل',
    pending: 'معلق',
  };
  return labels[status || 'active'] || status || 'غير محدد';
}
