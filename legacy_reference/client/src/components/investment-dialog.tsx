import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { clearFormDraft, loadFormDraft, saveFormDraft, getFormDraftMetadata } from "@/lib/form-draft";
import { insertInvestmentSchema } from "@shared/schema";
import { queryClient, apiRequest, createIdempotencyKey } from "@/lib/queryClient";
import type { InvestmentWithPlatform, Platform } from "@shared/schema";
import { AlertCircle, Calculator, Zap, RotateCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { CustomCashflow } from "@/components/custom-cashflow-editor";
import { useOfflineMode } from "@/hooks/use-offline-mode";
import { debugSessionLog } from "@/lib/debug-session-log";
import { InvestmentWizard, type WizardStep } from "@/components/investment-wizard";
import { 
  InvestmentWizardStep1, 
  InvestmentWizardStep2, 
  InvestmentWizardStep3 
} from "@/components/investment-wizard-steps";
import { 
  InvestmentWizardStep4, 
  InvestmentWizardStep5 
} from "@/components/investment-wizard-steps-advanced";
import { 
  calculateExpectedProfit, 
  calculateDurationMonths, 
  calculateEndDate,
  applyPlatformFeeToProfit,
  estimateGrossProfitFromNet,
} from "@shared/profit-calculator";

function createInvestmentFormSchema(translate: (key: string) => string) {
  return insertInvestmentSchema
    .extend({
      platformId: z.string().min(1, translate("dialog.validation.platformRequired")),
      startDate: z.string(),
      endDate: z.string(),
      actualEndDate: z.string().optional(),
      durationMonths: z.number().int().nonnegative().optional(),
    })
    .refine((data) => data.faceValue > 0, {
      message: translate("dialog.validation.faceValuePositive"),
      path: ["faceValue"],
    })
    .refine((data) => data.expectedIrr > 0, {
      message: translate("dialog.validation.annualReturnPositive"),
      path: ["expectedIrr"],
    });
}

export type InvestmentFormValues = z.infer<ReturnType<typeof createInvestmentFormSchema>>;

type DurationMode = "months" | "dates";

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: InvestmentWithPlatform | null;
  dataEntryToken?: string | null;
}

interface InvestmentDialogDraft {
  values: Partial<InvestmentFormValues>;
  durationMode: DurationMode;
  durationMonthsInput: number;
  userEditedProfit: boolean;
  customCashflows: CustomCashflow[];
}

interface WizardFormState {
  currentStep: number;
  errors: { [key: number]: string };
}

export function InvestmentDialog({ open, onOpenChange, investment, dataEntryToken }: InvestmentDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { isOnline, markSyncPending, syncOfflineChanges } = useOfflineMode();
  const formSchemaResolved = useMemo(() => createInvestmentFormSchema(t), [language]);
  
  // Wizard State (wizard is the only mode)
  const [wizardState, setWizardState] = useState<WizardFormState>({
    currentStep: 0,
    errors: {},
  });
  useEffect(() => {
    if (!open) return;
    setWizardState((prev) => ({
      ...prev,
      currentStep: 0,
      errors: {},
    }));
  }, [open, investment?.id]);

  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
    refetchOnMount: true, // Ensure fresh platforms on dialog open
  });

  // Fetch cash balance for validation (total + per-platform)
  const { data: cashBalanceResponse } = useQuery<{
    balance: number;
    total: number;
    byPlatform?: Record<string, number>;
  }>({
    queryKey: ["/api/cash/balance"],
  });

  const [userEditedProfit, setUserEditedProfit] = useState(false);
  const [durationMode, setDurationMode] = useState<DurationMode>('dates');
  const [durationMonthsInput, setDurationMonthsInput] = useState<number>(0);
  const isResettingRef = useRef(false);
  /** After opening edit dialog, convert stored net → gross once when platforms load */
  const syncedGrossFromNetRef = useRef<string | null>(null);
  const [customCashflows, setCustomCashflows] = useState<CustomCashflow[]>([]);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const restoredDraftKeyRef = useRef<string | null>(null);
  const draftStorageKey = useMemo(
    () => `azfinance:draft:investment-dialog:${investment?.id ?? "new"}`,
    [investment?.id]
  );

  // Get last used platform from localStorage
  const getLastPlatformId = () => {
    try {
      return localStorage.getItem('lastSelectedPlatformId') || "";
    } catch {
      return "";
    }
  };

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(formSchemaResolved),
    defaultValues: {
      platformId: "",
      name: "",
      faceValue: undefined,
      totalExpectedProfit: undefined,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      durationMonths: 0,
      expectedIrr: undefined,
      status: "active",
      riskScore: 50,
      distributionFrequency: "quarterly",
      profitPaymentStructure: "periodic",
      fundedFromCash: 0,
      isReinvestment: 0,
      excludePlatformFees: 0,
    },
  });

  useEffect(() => {
    syncedGrossFromNetRef.current = null;
  }, [investment?.id]);

  // Function to validate current wizard step
  const isWizardStepValid = useMemo(() => {
    return (stepIndex: number): boolean => {
      const platformId = form.watch('platformId');
      const name = form.watch('name');
      const faceValue = form.watch('faceValue');
      const expectedIrr = form.watch('expectedIrr');
      const status = form.watch('status');
      const distributionFrequency = form.watch('distributionFrequency');
      const startDate = form.watch("startDate");
      const endDate = form.watch("endDate");
      
      switch (stepIndex) {
        case 0: // Platform + Name
          return !!(platformId && name && name.length > 0);
        case 1: // Duration
          if (durationMode === 'dates') {
            return !!(startDate && endDate);
          } else {
            return !!(startDate && durationMonthsInput > 0);
          }
        case 2: // Profit
          return !!(faceValue && faceValue > 0 && expectedIrr && expectedIrr > 0);
        case 3: // Distribution + Status
          if (distributionFrequency === "custom") {
            if (!startDate || !endDate) return false;
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (customCashflows.length === 0) return false;
            const isValidCustom = customCashflows.every((cf) => {
              if (!cf?.dueDate || !(cf.amount > 0)) return false;
              const due = new Date(cf.dueDate);
              return due >= start && due <= end;
            });
            // #region agent log
            debugSessionLog({
              runId: "initial",
              hypothesisId: "H3",
              location: "investment-dialog.tsx:isWizardStepValid(step3)",
              message: "custom distribution step validation",
              data: {
                distributionFrequency,
                customCount: customCashflows.length,
                startDate,
                endDate,
                isValidCustom,
              },
            });
            // #endregion
            return isValidCustom;
          }
          return !!(distributionFrequency && status);
        case 4: // Review
          return true;
        default:
          return false;
      }
    };
  }, [form, durationMode, durationMonthsInput, customCashflows]);

  // Wizard steps definition
  const wizardSteps: WizardStep[] = useMemo(() => [
    {
      id: 'platform-name',
      title: t("dialog.platform"),
      description: t("dialog.selectPlatformAndName"),
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: 'amount-duration',
      title: t("dialog.durationMode"),
      description: t("dialog.enterDurationInfo"),
      icon: <RotateCw className="h-4 w-4" />,
    },
    {
      id: 'profit-returns',
      title: t("dialog.expectedProfit"),
      description: t("dialog.enterReturnsInfo"),
      icon: <Calculator className="h-4 w-4" />,
    },
    {
      id: 'distribution-status',
      title: t("dialog.distributionFrequency"),
      description: t("dialog.enterDistributionAndStatus"),
      icon: <AlertCircle className="h-4 w-4" />,
    },
    {
      id: 'review',
      title: t("dialog.review"),
      description: t("dialog.reviewBeforeSave"),
      icon: <Badge className="h-4 w-4" />,
    },
  ], [t]);

  useEffect(() => {
    isResettingRef.current = true;
    setUserEditedProfit(false);
    
    if (investment) {
      const hasDates = Boolean(investment.startDate && investment.endDate);
      const startDate = hasDates ? new Date(investment.startDate!) : null;
      const endDate = hasDates ? new Date(investment.endDate!) : null;
      const months =
        startDate && endDate ? calculateDurationMonths(startDate, endDate) : 0;
      setDurationMonthsInput(months);
      
      const faceValue = parseFloat(investment.faceValue);
      const totalProfit = parseFloat(investment.totalExpectedProfit);
      const irr = parseFloat(investment.expectedIrr);
      
      form.reset({
        platformId: investment.platformId,
        name: investment.name,
        faceValue,
        totalExpectedProfit: totalProfit,
        startDate: startDate ? startDate.toISOString().split("T")[0] : "",
        endDate: endDate ? endDate.toISOString().split("T")[0] : "",
        durationMonths: months,
        actualEndDate: investment.actualEndDate 
          ? new Date(investment.actualEndDate).toISOString().split("T")[0]
          : undefined,
        expectedIrr: irr,
        status: investment.status as "active" | "late" | "defaulted" | "completed" | "pending",
        riskScore: investment.riskScore || 50,
        distributionFrequency: investment.distributionFrequency as "monthly" | "quarterly" | "semi_annually" | "annually" | "at_maturity" | "custom",
        profitPaymentStructure: (investment.profitPaymentStructure || "periodic") as "periodic" | "at_maturity",
        fundedFromCash: investment.fundedFromCash,
        isReinvestment: investment.isReinvestment,
        excludePlatformFees: investment.excludePlatformFees ?? 0,
      });
      
      setUserEditedProfit(true);
    } else {
      // For new investments, use last selected platform
      const lastPlatformId = getLastPlatformId();
      form.reset({
        platformId: lastPlatformId,
        name: "",
        faceValue: undefined,
        totalExpectedProfit: undefined,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        durationMonths: 0,
        expectedIrr: undefined,
        status: "active",
        riskScore: 50,
        distributionFrequency: "quarterly",
        profitPaymentStructure: "periodic",
        fundedFromCash: 0,
        isReinvestment: 0,
        excludePlatformFees: 0,
      });
      setDurationMonthsInput(0);
    }
    
    setTimeout(() => {
      isResettingRef.current = false;
    }, 0);
  }, [investment, form]);

  // Stored totalExpectedProfit is net (after fees); show gross in the form when platform deducts fees
  useEffect(() => {
    if (!investment?.id || !platforms?.length) return;
    if (syncedGrossFromNetRef.current === investment.id) return;
    const platform = platforms.find((p) => p.id === investment.platformId);
    if (!platform) return;
    const feePct = Number(platform.feePercentage) || 0;
    const deductFees = platform.deductFees === 1;
    const exclude = investment.excludePlatformFees === 1;
    if (!(deductFees && feePct > 0 && !exclude)) {
      syncedGrossFromNetRef.current = investment.id;
      return;
    }
    const storedNet = parseFloat(investment.totalExpectedProfit);
    const gross = estimateGrossProfitFromNet(storedNet, feePct, true);
    isResettingRef.current = true;
    form.setValue("totalExpectedProfit", gross);
    syncedGrossFromNetRef.current = investment.id;
    setTimeout(() => {
      isResettingRef.current = false;
    }, 0);
  }, [investment, platforms, form]);

  useEffect(() => {
    if (!open) return;
    // #region agent log
    debugSessionLog({
      runId: "initial",
      hypothesisId: "H5",
      location: "investment-dialog.tsx:open-effect",
      message: "dialog opened effect fired",
      data: { investmentId: investment?.id ?? null },
    });
    // #endregion

    const focusTimer = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 60);

    return () => window.clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (restoredDraftKeyRef.current === draftStorageKey) return;

    const draft = loadFormDraft<InvestmentDialogDraft>(draftStorageKey);
    restoredDraftKeyRef.current = draftStorageKey;
    if (!draft) return;

    isResettingRef.current = true;
    form.reset({
      ...form.getValues(),
      ...draft.values,
    });
    setDurationMode(draft.durationMode ?? "dates");
    setDurationMonthsInput(draft.durationMonthsInput ?? 0);
    setUserEditedProfit(Boolean(draft.userEditedProfit));
    setCustomCashflows(Array.isArray(draft.customCashflows) ? draft.customCashflows : []);
    window.setTimeout(() => {
      isResettingRef.current = false;
    }, 0);
  }, [open, draftStorageKey, form]);

  // Enhanced auto-save with status indicator
  useEffect(() => {
    if (!open) return;
    
    let saveTimeout: NodeJS.Timeout;
    const subscription = form.watch((values) => {
      if (isResettingRef.current) return;
      
      setDraftSaveStatus('saving');
      clearTimeout(saveTimeout);
      
      const draftPayload: InvestmentDialogDraft = {
        values: values as Partial<InvestmentFormValues>,
        durationMode,
        durationMonthsInput,
        userEditedProfit,
        customCashflows,
      };
      
      saveTimeout = setTimeout(() => {
        saveFormDraft(draftStorageKey, draftPayload);
        setDraftSaveStatus('saved');
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          setDraftSaveStatus('idle');
        }, 2000);
      }, 500);
    });
    
    return () => {
      clearTimeout(saveTimeout);
      subscription.unsubscribe();
    };
  }, [open, form, draftStorageKey, durationMode, durationMonthsInput, userEditedProfit, customCashflows]);

  // Auto-derive profitPaymentStructure from distributionFrequency
  const distributionFrequency = useWatch({
    control: form.control,
    name: "distributionFrequency",
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    
    if (distributionFrequency) {
      const newStructure = distributionFrequency === 'at_maturity' 
        ? 'at_maturity' 
        : 'periodic';
      
      const currentStructure = form.getValues('profitPaymentStructure');
      
      if (currentStructure !== newStructure) {
        form.setValue('profitPaymentStructure', newStructure);
      }
    }
  }, [distributionFrequency, form]);

  // Auto-calculate risk score based on expected IRR
  const expectedIrr = useWatch({
    control: form.control,
    name: "expectedIrr",
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    
    // Convert to number if string
    const irrValue = typeof expectedIrr === 'string' ? parseFloat(expectedIrr) : expectedIrr;
    
    // Check if we have a valid IRR value (treat 0 as empty/not set)
    const hasValidIrr = expectedIrr !== undefined && 
                        expectedIrr !== null && 
                        expectedIrr !== 0 &&
                        String(expectedIrr) !== "" && 
                        !isNaN(irrValue) &&
                        irrValue > 0;
    
    if (hasValidIrr) {
      // Calculate risk score: (expectedIrr / 30) * 100
      // 0% IRR = treated as empty, 30% IRR = 100 risk
      const calculatedRisk = Math.min(100, Math.max(0, (irrValue / 30) * 100));
      const roundedRisk = Math.round(calculatedRisk);
      
      const currentRiskScore = form.getValues('riskScore');
      
      if (currentRiskScore !== roundedRisk) {
        form.setValue('riskScore', roundedRisk);
      }
    } else {
      // Reset to default midpoint when IRR is empty/0/invalid
      const currentRiskScore = form.getValues('riskScore');
      if (currentRiskScore !== 50) {
        form.setValue('riskScore', 50);
      }
    }
  }, [expectedIrr, form]);

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      idempotencyKey,
    }: {
      data: InvestmentFormValues;
      idempotencyKey: string;
    }) => {
      if (!isOnline) {
        // Mark for offline sync
        markSyncPending({
          type: 'investment',
          id: `temp-${Date.now()}`,
          action: 'create',
          timestamp: Date.now(),
        });
        throw new Error('offline');
      }
      
      if (dataEntryToken) {
        const res = await fetch("/api/investments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Data-Entry-Token": dataEntryToken,
            "X-Idempotency-Key": idempotencyKey,
          },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || "Failed to create investment");
        }
        return res.json();
      }
      return apiRequest("POST", "/api/investments", data, {
        headers: {
          "X-Idempotency-Key": idempotencyKey,
        },
      });
    },
    onSuccess: () => {
      // Invalidate all dashboard-related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.refetchQueries({ queryKey: ["/api/investments"], type: 'all' });
      if (dataEntryToken) {
        queryClient.invalidateQueries({ queryKey: ["data-entry", dataEntryToken, "/api/investments"] });
        queryClient.invalidateQueries({ queryKey: ["data-entry", dataEntryToken, "/api/cashflows"] });
        queryClient.invalidateQueries({ queryKey: ["data-entry", dataEntryToken, "/api/platforms"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });

      toast({
        title: t("dialog.save"),
        description: t("dialog.add"),
      });
      clearFormDraft(draftStorageKey);
      restoredDraftKeyRef.current = null;
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      // #region agent log
      debugSessionLog({
        runId: "initial",
        hypothesisId: "H4",
        location: "investment-dialog.tsx:createMutation.onError",
        message: "create mutation error",
        data: {
          errorMessage: error?.message || "unknown",
          isOffline: error?.message === "offline",
        },
      });
      // #endregion
      const errorMessage = error?.message;
      
      if (errorMessage === 'offline') {
        toast({
          title: t("offline.saved"),
          description: t("offline.syncWhenOnline"),
        });
        clearFormDraft(draftStorageKey);
        onOpenChange(false);
      } else {
        toast({
          title: t("dialog.error"),
          description: error?.message?.includes("Duplicate request in progress")
            ? t("dialog.duplicateRequestInProgress")
            : t("dialog.createError"),
          variant: "destructive",
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InvestmentFormValues) => {
      if (!isOnline) {
        markSyncPending({
          type: 'investment',
          id: investment?.id || '',
          action: 'update',
          timestamp: Date.now(),
        });
        throw new Error('offline');
      }
      
      if (dataEntryToken) {
        const res = await fetch(`/api/investments/${investment?.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Data-Entry-Token": dataEntryToken,
          },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || "Failed to update investment");
        }
        return res.json();
      }
      return apiRequest("PATCH", `/api/investments/${investment?.id}`, data);
    },
    onSuccess: () => {
      // Invalidate all dashboard-related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.refetchQueries({ queryKey: ["/api/investments"], type: 'all' });
      if (dataEntryToken) {
        queryClient.invalidateQueries({ queryKey: ["data-entry", dataEntryToken, "/api/investments"] });
        queryClient.invalidateQueries({ queryKey: ["data-entry", dataEntryToken, "/api/cashflows"] });
        queryClient.invalidateQueries({ queryKey: ["data-entry", dataEntryToken, "/api/platforms"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });

      toast({
        title: t("dialog.save"),
        description: t("dialog.update"),
      });
      clearFormDraft(draftStorageKey);
      restoredDraftKeyRef.current = null;
      onOpenChange(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.message;
      
      if (errorMessage === 'offline') {
        toast({
          title: t("offline.saved"),
          description: t("offline.syncWhenOnline"),
        });
        clearFormDraft(draftStorageKey);
        onOpenChange(false);
      } else {
        toast({
          title: t("dialog.error"),
          description: t("dialog.updateError"),
          variant: "destructive",
        });
      }
    },
  });

  // Watch form values for calculations
  const formValues = form.watch();
  const selectedPlatformCashBalance = useMemo(() => {
    const selectedPlatformId = formValues.platformId;
    if (!selectedPlatformId) return 0;
    return cashBalanceResponse?.byPlatform?.[selectedPlatformId] ?? 0;
  }, [formValues.platformId, cashBalanceResponse]);

  // Calculate duration in months when in dates mode
  const calculatedDurationMonths = useMemo(() => {
    if (durationMode !== 'dates') return 0;
    
    const startDate = formValues.startDate;
    const endDate = formValues.endDate;
    
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return calculateDurationMonths(start, end);
  }, [formValues.startDate, formValues.endDate, durationMode]);

  // Update endDate when in months mode
  useEffect(() => {
    if (durationMode === 'months' && !isResettingRef.current) {
      const startDate = formValues.startDate;
      
      if (startDate && durationMonthsInput > 0) {
        const start = new Date(startDate);
        const calculatedEnd = calculateEndDate(start, durationMonthsInput);
        const endDateString = calculatedEnd.toISOString().split("T")[0];
        form.setValue("endDate", endDateString);
        form.setValue("durationMonths", durationMonthsInput);
      }
    }
  }, [durationMode, durationMonthsInput, formValues.startDate, form]);

  // Keep durationMonths in sync when using dates mode for accurate summaries/previews
  useEffect(() => {
    if (durationMode !== "dates" || isResettingRef.current) return;
    if (calculatedDurationMonths > 0) {
      form.setValue("durationMonths", calculatedDurationMonths);
    }
  }, [durationMode, calculatedDurationMonths, form]);

  // Gross expected profit from principal × IRR × duration (before platform fees)
  const autoCalculatedGrossProfit = useMemo(() => {
    const faceValue = formValues.faceValue || 0;
    const expectedIrr = formValues.expectedIrr || 0;
    const months = durationMode === "dates" ? calculatedDurationMonths : durationMonthsInput;

    if (!faceValue || !expectedIrr || !months) {
      return 0;
    }

    return calculateExpectedProfit(faceValue, expectedIrr, months);
  }, [
    formValues.faceValue,
    formValues.expectedIrr,
    calculatedDurationMonths,
    durationMonthsInput,
    durationMode,
  ]);

  // Auto-fill totalExpectedProfit (gross) when inputs change (if user hasn't manually edited it)
  useEffect(() => {
    if (isResettingRef.current) return;

    if (!userEditedProfit && autoCalculatedGrossProfit > 0) {
      form.setValue("totalExpectedProfit", autoCalculatedGrossProfit);
    }
  }, [autoCalculatedGrossProfit, userEditedProfit, form]);

  // Calculate ROI percentage
  const roiPercentage = useMemo(() => {
    const faceValue = formValues.faceValue || 0;
    const totalExpectedProfit = formValues.totalExpectedProfit || 0;
    
    if (!faceValue) return 0;
    
    return (totalExpectedProfit / faceValue) * 100;
  }, [formValues.faceValue, formValues.totalExpectedProfit]);

  // Handle Calculate button click
  const handleCalculateProfit = () => {
    if (autoCalculatedGrossProfit > 0) {
      form.setValue("totalExpectedProfit", autoCalculatedGrossProfit);
      setUserEditedProfit(false);
      toast({
        title: t("dialog.toastCalculatedTitle"),
        description: t("dialog.toastCalculatedProfitDesc", {
          amount: autoCalculatedGrossProfit.toFixed(2),
        }),
      });
    }
  };

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      form.handleSubmit(onSubmit)();
      return;
    }

    if (event.altKey && event.key.toLowerCase() === "c") {
      event.preventDefault();
      handleCalculateProfit();
    }
  };

  // totalExpectedProfit in the form = GROSS; net = gross after platform fee (unless exclude fees)
  const calculatedMetrics = useMemo(() => {
    const faceValue = formValues.faceValue || 0;
    const grossProfit = Number(formValues.totalExpectedProfit) || 0;
    const startDate = formValues.startDate;
    const endDate = formValues.endDate;
    const frequency = formValues.distributionFrequency;
    const profitStructure = formValues.profitPaymentStructure;

    if (!faceValue || !startDate || !endDate) {
      return null;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end.getTime() - start.getTime();
    const durationYears = durationMs / (1000 * 60 * 60 * 24 * 365.25);

    if (durationYears <= 0) {
      return null;
    }

    let paymentCount = 0;
    let paymentsPerYear = 0;

    if (profitStructure === "at_maturity" || frequency === "at_maturity") {
      paymentCount = 1;
    } else {
      if (frequency === "monthly") paymentsPerYear = 12;
      else if (frequency === "quarterly") paymentsPerYear = 4;
      else if (frequency === "semi_annually") paymentsPerYear = 2;
      else if (frequency === "annually") paymentsPerYear = 1;

      paymentCount = Math.ceil(durationYears * paymentsPerYear);
    }

    const selectedPlatform = platforms?.find((p) => p.id === formValues.platformId);
    const feePercentage = Number(selectedPlatform?.feePercentage) || 0;
    const deductFees = selectedPlatform?.deductFees || 0;
    const excludePlatformFees = formValues.excludePlatformFees === 1;

    const netProfit = applyPlatformFeeToProfit(
      grossProfit,
      feePercentage,
      deductFees === 1 && !excludePlatformFees,
    );
    const feeAmount =
      deductFees === 1 && feePercentage > 0 && !excludePlatformFees
        ? Math.max(0, grossProfit - netProfit)
        : 0;

    const paymentValue = paymentCount > 0 ? netProfit / paymentCount : 0;
    const numberOfUnits = faceValue;

    return {
      totalExpectedReturn: grossProfit,
      numberOfUnits,
      paymentCount,
      paymentValue,
      netProfit,
      feeAmount,
      feePercentage,
      deductFees,
      excludePlatformFees,
    };
  }, [
    formValues.faceValue,
    formValues.totalExpectedProfit,
    formValues.startDate,
    formValues.endDate,
    formValues.distributionFrequency,
    formValues.profitPaymentStructure,
    formValues.platformId,
    formValues.excludePlatformFees,
    platforms,
  ]);

  const onSubmit = (data: InvestmentFormValues) => {
    // #region agent log
    debugSessionLog({
      runId: "initial",
      hypothesisId: "H1",
      location: "investment-dialog.tsx:onSubmit(entry)",
      message: "submit entry values",
      data: {
        durationMode,
        durationMonthsInput,
        startDate: data.startDate,
        endDate: data.endDate,
        formDurationMonths: data.durationMonths,
        distributionFrequency: data.distributionFrequency,
        customCount: customCashflows.length,
      },
    });
    // #endregion
    // Single source of truth: derive durationMonths/endDate from current form values
    const startDateValue = data.startDate;
    const endDateValue = data.endDate;

    if (!startDateValue) {
      toast({
        title: t("common.error"),
        description: t("dialog.validation.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    if (durationMode === "months") {
      const months = Number(durationMonthsInput) || 0;
      if (months <= 0) {
        toast({
          title: t("common.error"),
          description: t("dialog.validation.requiredFields"),
          variant: "destructive",
        });
        return;
      }
      data.durationMonths = months;
      const computedEnd = calculateEndDate(new Date(startDateValue), months);
      data.endDate = computedEnd.toISOString().split("T")[0];
    } else {
      if (!endDateValue) {
        toast({
          title: t("common.error"),
          description: t("dialog.validation.requiredFields"),
          variant: "destructive",
        });
        return;
      }
      const months = calculateDurationMonths(new Date(startDateValue), new Date(endDateValue));
      data.durationMonths = months;
    }

    // Validate cash balance if funding from cash
    if (data.fundedFromCash === 1 && data.faceValue > selectedPlatformCashBalance) {
      toast({
        title: t("common.error"),
        description: t("dialog.insufficientCashForInvestment"),
        variant: "destructive",
      });
      return;
    }

    const selectedPlatform = platforms?.find((p) => p.id === data.platformId);
    const feePct = Number(selectedPlatform?.feePercentage) || 0;
    const deductFees = selectedPlatform?.deductFees === 1;
    const exclude = data.excludePlatformFees === 1;
    const grossProfit = Number(data.totalExpectedProfit) || 0;
    const netStored = applyPlatformFeeToProfit(
      grossProfit,
      feePct,
      deductFees && !exclude,
    );

    // Include customDistributions if frequency is 'custom'
    const payload = {
      ...data,
      totalExpectedProfit: netStored,
      customDistributions:
        data.distributionFrequency === "custom"
          ? customCashflows.map((cf) => ({
              dueDate: new Date(cf.dueDate),
              amount: cf.amount,
              type: cf.type,
              notes: cf.notes,
            }))
          : undefined,
    };
    // #region agent log
    debugSessionLog({
      runId: "initial",
      hypothesisId: "H2",
      location: "investment-dialog.tsx:onSubmit(payload)",
      message: "payload before mutation",
      data: {
        name: payload.name,
        startDate: payload.startDate,
        endDate: payload.endDate,
        durationMonths: payload.durationMonths,
        distributionFrequency: payload.distributionFrequency,
        customDistributionsCount: Array.isArray(payload.customDistributions)
          ? payload.customDistributions.length
          : 0,
        status: payload.status,
      },
    });
    // #endregion

    // Send date strings directly - server will convert to Date objects
    if (investment) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate({
        data: payload,
        idempotencyKey: createIdempotencyKey("investment-create"),
      });
    }
  };

  const displayDurationMonths = durationMode === 'dates' ? calculatedDurationMonths : durationMonthsInput;
  const handleDialogOpenChange = (nextOpen: boolean) => {
    // #region agent log
    debugSessionLog({
      runId: "initial",
      hypothesisId: "H5",
      location: "investment-dialog.tsx:handleDialogOpenChange",
      message: "dialog open state changed",
      data: { nextOpen, investmentId: investment?.id ?? null },
    });
    // #endregion
    if (!nextOpen) {
      restoredDraftKeyRef.current = null;
      setWizardState({ currentStep: 0, errors: {} });
    }
    onOpenChange(nextOpen);
  };

  const handleWizardNext = () => {
    if (isWizardStepValid(wizardState.currentStep)) {
      setWizardState(prev => ({
        ...prev,
        currentStep: Math.min(wizardSteps.length - 1, prev.currentStep + 1),
        errors: { ...prev.errors, [prev.currentStep]: '' }
      }));
    } else {
      setWizardState(prev => ({
        ...prev,
        errors: { ...prev.errors, [prev.currentStep]: t("dialog.validation.requiredFields") }
      }));
    }
  };

  const handleWizardPrevious = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  };

  const handleWizardComplete = () => {
    // #region agent log
    debugSessionLog({
      runId: "initial",
      hypothesisId: "H5",
      location: "investment-dialog.tsx:handleWizardComplete",
      message: "complete clicked",
      data: {
        currentStep: wizardState.currentStep,
        canSubmit: isWizardStepValid(wizardState.currentStep),
      },
    });
    // #endregion
    if (isWizardStepValid(wizardState.currentStep)) {
      form.handleSubmit(onSubmit)();
    } else {
      setWizardState(prev => ({
        ...prev,
        errors: { ...prev.errors, [prev.currentStep]: t("dialog.validation.requiredFields") }
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {investment ? t("dialog.editInvestment") : t("dialog.addInvestment")} - {t("dialog.wizardMode")}
          </DialogTitle>
          <DialogDescription>{t("dialog.stepByStep")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleWizardComplete();
            }}
            onKeyDown={handleFormKeyDown}
            className="space-y-4"
          >
            {draftSaveStatus !== "idle" && (
              <Alert
                className={
                  draftSaveStatus === "saving"
                    ? "bg-blue-50 dark:bg-blue-950/20"
                    : "bg-green-50 dark:bg-green-950/20"
                }
              >
                <AlertDescription
                  className={
                    draftSaveStatus === "saving"
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-green-700 dark:text-green-400"
                  }
                >
                  {draftSaveStatus === "saving" ? t("dialog.savingDraft") : t("dialog.draftSaved")}
                </AlertDescription>
              </Alert>
            )}

            <InvestmentWizard
              steps={wizardSteps}
              currentStepIndex={wizardState.currentStep}
              onStepChange={(step) => {
                // #region agent log
                debugSessionLog({
                  runId: "initial",
                  hypothesisId: "H5",
                  location: "investment-dialog.tsx:InvestmentWizard.onStepChange",
                  message: "wizard step changed",
                  data: { from: wizardState.currentStep, to: step },
                });
                // #endregion
                setWizardState((prev) => ({ ...prev, currentStep: step }));
              }}
              canGoNext={isWizardStepValid(wizardState.currentStep)}
              canGoPrevious={wizardState.currentStep > 0}
              isLoading={createMutation.isPending || updateMutation.isPending}
              onPrevious={handleWizardPrevious}
              onNext={handleWizardNext}
              onComplete={handleWizardComplete}
              error={wizardState.errors[wizardState.currentStep]}
            >
              {wizardState.currentStep === 0 && <InvestmentWizardStep1 />}
              {wizardState.currentStep === 1 && (
                <InvestmentWizardStep2
                  durationMode={durationMode}
                  onDurationModeChange={setDurationMode}
                  durationMonthsInput={durationMonthsInput}
                  onDurationMonthsChange={setDurationMonthsInput}
                />
              )}
              {wizardState.currentStep === 2 && (
                <InvestmentWizardStep3
                  autoCalculatedGrossProfit={autoCalculatedGrossProfit}
                  onCalculateProfit={handleCalculateProfit}
                  displayDurationMonths={displayDurationMonths}
                  selectedPlatformCashBalance={selectedPlatformCashBalance}
                />
              )}
              {wizardState.currentStep === 3 && (
                <InvestmentWizardStep4 customCashflows={customCashflows} onCustomCashflowsChange={setCustomCashflows} />
              )}
              {wizardState.currentStep === 4 && (
                <InvestmentWizardStep5
                  investment={investment}
                  calculatedMetrics={calculatedMetrics}
                  language={language}
                  platforms={platforms ?? []}
                />
              )}
            </InvestmentWizard>

            {!isOnline && (
              <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  {t("offline.offline")} - {t("offline.willSaveLocallyWhenOffline")}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
