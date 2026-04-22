import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MonthlyTargetsTable } from "./monthly-targets-table";
import { MonthlyProgressChart } from "./monthly-progress-chart";
import { generateMonthlyTargets } from "@/lib/target-generator";
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Clock,
  Calculator
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from "recharts";
import type { InvestmentWithPlatform, CashTransaction, UserSettings, SavedScenario } from "@shared/schema";

interface Vision2040CalculatorProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

interface ScenarioInputs {
  initialAmount: number;
  monthlyDeposit: number;
  expectedIRR: number;
  targetAmount: number;
  durationYears: number;
}

interface ProjectionData {
  year: number;
  currentPath: number;
  scenarioPath: number;
  label: string;
}

export function Vision2040Calculator({ isCollapsed = false, onToggle }: Vision2040CalculatorProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === "ar";
  
  // Shared state for tab integration
  const [selectedTab, setSelectedTab] = useState("overview");
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});

  // Fetch data
  const { data: investments } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ["/api/cash/transactions"],
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: savedScenarios = [] } = useQuery<SavedScenario[]>({
    queryKey: ["/api/saved-scenarios"],
  });

  // Calculate current portfolio value (using faceValue for active investments)
  const currentPortfolioValue = useMemo(() => {
    if (!investments || !cashTransactions) return 0;
    
    const activeInvestmentsValue = investments
      .filter(inv => inv.status === "active")
      .reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
    
    const cashBalance = cashTransactions.reduce((balance, tx) => {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'deposit' || tx.type === 'distribution') {
        return balance + amount;
      } else if (tx.type === 'withdrawal' || tx.type === 'investment') {
        return balance - amount;
      }
      return balance;
    }, 0);
    
    return activeInvestmentsValue + cashBalance;
  }, [investments, cashTransactions]);

  // Calculate weighted APR from active investments
  const weightedAPR = useMemo(() => {
    const activeInvs = investments?.filter(inv => inv.status === "active") || [];
    if (activeInvs.length === 0) return 10; // default 10%
    
    const totalValue = activeInvs.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
    if (totalValue === 0) return 10;
    
    const weightedSum = activeInvs.reduce((sum, inv) => {
      const weight = parseFloat(inv.faceValue) / totalValue;
      return sum + (parseFloat(inv.expectedIrr) * weight);
    }, 0);
    
    return weightedSum;
  }, [investments]);

  // Get target from settings or default to 10 million
  const targetCapital2040 = useMemo(() => {
    return settings?.targetCapital2040 
      ? parseFloat(settings.targetCapital2040) 
      : 10000000; // Default 10M SAR
  }, [settings]);

  // Calculate years to 2040
  const yearsTo2040 = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Math.max(0, 2040 - currentYear);
  }, []);

  // Current status inputs (read-only, based on actual portfolio)
  const currentInputs: ScenarioInputs = useMemo(() => ({
    initialAmount: currentPortfolioValue,
    monthlyDeposit: 0, // Assume no regular deposits for current path
    expectedIRR: weightedAPR,
    targetAmount: targetCapital2040,
    durationYears: yearsTo2040,
  }), [currentPortfolioValue, weightedAPR, targetCapital2040, yearsTo2040]);

  // Scenario inputs (editable)
  const [scenarioInputs, setScenarioInputs] = useState<ScenarioInputs>({
    initialAmount: 0,
    monthlyDeposit: 5000,
    expectedIRR: 12,
    targetAmount: 0,
    durationYears: 0,
  });

  // Update scenario inputs when current inputs change
  useEffect(() => {
    setScenarioInputs(prev => ({
      ...prev,
      initialAmount: currentInputs.initialAmount,
      targetAmount: currentInputs.targetAmount,
      durationYears: currentInputs.durationYears,
      expectedIRR: weightedAPR > 0 ? weightedAPR : 12,
    }));
  }, [currentInputs, weightedAPR]);

  // Scenario name for saving
  const [scenarioName, setScenarioName] = useState("");
  
  // Generate targets mutation
  const generateTargetsMutation = useMutation({
    mutationFn: async () => {
      // Generate targets for the current scenario
      const targets = generateMonthlyTargets(
        scenarioInputs,
        new Date(),
        scenarioName || "Vision 2040"
      );
      
      // Bulk upsert targets
      const response = await apiRequest("POST", "/api/vision-targets/bulk", {
        targets: targets.map(t => ({
          month: t.month.toISOString(),
          targetValue: t.targetValue,
          scenarioId: t.scenarioId,
          generated: t.generated,
        }))
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-targets"] });
      toast({
        title: "Success",
        description: "Monthly targets generated successfully.",
      });
      setSelectedTab("progress"); // Switch to progress tab
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to generate targets.",
        variant: "destructive",
      });
    }
  });

  // Calculate future value
  const calculateFutureValue = (inputs: ScenarioInputs) => {
    const { initialAmount, monthlyDeposit, expectedIRR, durationYears } = inputs;
    const monthlyRate = expectedIRR / 100 / 12;
    const months = durationYears * 12;
    
    let futureValue = initialAmount;
    for (let i = 0; i < months; i++) {
      futureValue = futureValue * (1 + monthlyRate) + monthlyDeposit;
    }
    
    return futureValue;
  };

  // Generate projection data for timeline
  const projectionData: ProjectionData[] = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const milestones = Array.from(new Set([currentYear, 2025, 2030, 2035, 2040])).sort((a, b) => a - b);
    
    return milestones.map(year => {
      const yearsFromNow = year - currentYear;
      
      // Current path projection
      const currentYears = Math.max(0, yearsFromNow);
      const currentMonthlyRate = currentInputs.expectedIRR / 100 / 12;
      const currentMonths = currentYears * 12;
      let currentValue = currentInputs.initialAmount;
      for (let i = 0; i < currentMonths; i++) {
        currentValue = currentValue * (1 + currentMonthlyRate) + currentInputs.monthlyDeposit;
      }
      
      // Scenario path projection
      const scenarioYears = Math.max(0, yearsFromNow);
      const scenarioMonthlyRate = scenarioInputs.expectedIRR / 100 / 12;
      const scenarioMonths = scenarioYears * 12;
      let scenarioValue = scenarioInputs.initialAmount;
      for (let i = 0; i < scenarioMonths; i++) {
        scenarioValue = scenarioValue * (1 + scenarioMonthlyRate) + scenarioInputs.monthlyDeposit;
      }
      
      return {
        year,
        currentPath: Math.round(currentValue),
        scenarioPath: Math.round(scenarioValue),
        label: String(year),
      };
    });
  }, [currentInputs, scenarioInputs]);

  // Calculate current and scenario final values
  const currentFinalValue = calculateFutureValue(currentInputs);
  const scenarioFinalValue = calculateFutureValue(scenarioInputs);

  // Calculate progress percentages
  const currentProgress = (currentPortfolioValue / targetCapital2040) * 100;
  const currentProjectedProgress = (currentFinalValue / targetCapital2040) * 100;
  const scenarioProjectedProgress = (scenarioFinalValue / targetCapital2040) * 100;

  // Calculate required monthly deposit to reach target
  const requiredMonthlyDeposit = useMemo(() => {
    const { initialAmount, expectedIRR, targetAmount, durationYears } = scenarioInputs;
    const monthlyRate = expectedIRR / 100 / 12;
    const months = durationYears * 12;
    
    if (months === 0 || monthlyRate === 0) return 0;
    
    // FV = PV * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
    // Solve for PMT
    const futureValueOfInitial = initialAmount * Math.pow(1 + monthlyRate, months);
    const remaining = targetAmount - futureValueOfInitial;
    
    if (remaining <= 0) return 0;
    
    const pmt = remaining / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate));
    return Math.max(0, pmt);
  }, [scenarioInputs]);

  // Calculate monthly gap
  const monthlyGap = Math.max(0, requiredMonthlyDeposit - scenarioInputs.monthlyDeposit);

  // Format currency - Always use English numbers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Save scenario mutation
  const saveScenarioMutation = useMutation({
    mutationFn: async () => {
      if (!scenarioName.trim()) {
        throw new Error("Please enter a scenario name");
      }
      
      if (savedScenarios.length >= 5) {
        throw new Error(t("vision2040.maxScenariosReached"));
      }
      
      const response = await apiRequest("POST", "/api/saved-scenarios", {
        name: scenarioName,
        initialAmount: scenarioInputs.initialAmount,
        monthlyDeposit: scenarioInputs.monthlyDeposit,
        expectedIRR: scenarioInputs.expectedIRR,
        targetAmount: scenarioInputs.targetAmount,
        durationYears: scenarioInputs.durationYears,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/saved-scenarios"], type: 'all' });
      setScenarioName("");
      toast({
        title: t("vision2040.scenarioSaved"),
        description: `"${scenarioName}" ${t("vision2040.scenarioSaved").toLowerCase()}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || "Failed to save scenario",
      });
    },
  });

  // Delete scenario mutation
  const deleteScenarioMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/saved-scenarios/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/saved-scenarios"], type: 'all' });
      toast({
        title: t("vision2040.scenarioDeleted"),
        description: t("vision2040.scenarioDeleted"),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: "Failed to delete scenario",
      });
    },
  });

  // Load scenario
  const loadScenario = (scenario: SavedScenario) => {
    setScenarioInputs({
      initialAmount: parseFloat(scenario.initialAmount),
      monthlyDeposit: parseFloat(scenario.monthlyDeposit),
      expectedIRR: parseFloat(scenario.expectedIRR),
      targetAmount: parseFloat(scenario.targetAmount),
      durationYears: scenario.durationYears,
    });
    toast({
      title: t("vision2040.scenarioLoaded"),
      description: `"${scenario.name}" ${t("vision2040.scenarioLoaded").toLowerCase()}`,
    });
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-3 border-2">
          <div className="text-sm font-medium mb-2">{payload[0].payload.label}</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-chart-1 rounded-full"></div>
              <span>{t("vision2040.currentPath")}:</span>
              <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-chart-2 rounded-full"></div>
              <span>{t("vision2040.scenarioPath")}:</span>
              <span className="font-semibold">{formatCurrency(payload[1].value)}</span>
            </div>
          </div>
        </Card>
      );
    }
    return null;
  };

  return (
    <Card data-testid="card-vision-2040-calculator">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            {t("vision2040.title")}
          </CardTitle>
          <CardDescription className="mt-1.5">
            {t("vision2040.subtitle")}
          </CardDescription>
        </div>
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            data-testid="button-toggle-vision-2040"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        )}
      </CardHeader>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <CardContent className="space-y-6">
              {/* Current Portfolio Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      {t("vision2040.currentPortfolio")}
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(currentPortfolioValue)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {currentProgress.toFixed(1)}% {t("vision2040.progressPercentage")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-chart-2/5 border-chart-2/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      {t("vision2040.targetAmount")}
                    </div>
                    <div className="text-2xl font-bold text-chart-2">
                      {formatCurrency(targetCapital2040)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {yearsTo2040} {t("vision2040.yearsLeft")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      {t("vision2040.expectedReturn")}
                    </div>
                    <div className="text-2xl font-bold">
                      {weightedAPR.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("dashboard.weightedAvgAPR")}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Dual Progress Bars */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-chart-1 rounded-full"></div>
                      <span className="text-sm font-medium">{t("vision2040.currentPath")}</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {currentProjectedProgress.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, currentProjectedProgress)} 
                    className="h-3"
                    data-testid="progress-current-path"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(currentFinalValue)} {t("dashboard.by2040")}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-chart-2 rounded-full"></div>
                      <span className="text-sm font-medium">{t("vision2040.scenarioPath")}</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {scenarioProjectedProgress.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, scenarioProjectedProgress)} 
                    className="h-3"
                    data-testid="progress-scenario-path"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(scenarioFinalValue)} {t("dashboard.by2040")}
                  </div>
                </div>
              </div>

              {/* Smart Indicators */}
              <div className="grid gap-4 md:grid-cols-2">
                <Alert className={scenarioProjectedProgress >= 100 ? "border-green-500 bg-green-500/10" : "border-yellow-500 bg-yellow-500/10"}>
                  {scenarioProjectedProgress >= 100 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <AlertDescription>
                    {scenarioProjectedProgress >= 100 
                      ? t("vision2040.successIndicator")
                      : t("vision2040.warningIndicator")
                    }
                  </AlertDescription>
                </Alert>

                {monthlyGap > 0 && (
                  <Alert className="border-blue-500 bg-blue-500/10">
                    <ArrowUp className="h-4 w-4 text-blue-500" />
                    <AlertDescription>
                      <div className="font-medium">{t("vision2040.monthlyGap")}</div>
                      <div className="text-lg font-bold mt-1">
                        {formatCurrency(monthlyGap)}/mo {t("vision2040.toReachTarget")}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Projection Timeline Chart */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t("vision2040.projectionTimeline")}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={projectionData}>
                    <defs>
                      <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorScenario" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="label" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine 
                      y={targetCapital2040} 
                      stroke="hsl(var(--destructive))" 
                      strokeDasharray="5 5"
                      label={{ value: t("vision2040.targetGoal"), fill: "hsl(var(--foreground))", fontSize: 12 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="currentPath" 
                      stroke="hsl(var(--chart-1))" 
                      fill="url(#colorCurrent)"
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="scenarioPath" 
                      stroke="hsl(var(--chart-2))" 
                      fill="url(#colorScenario)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <Separator />

              {/* Scenario Inputs */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("vision2040.calculationInputs")}
                </h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scenario-monthly-deposit">
                      {t("vision2040.monthlyContribution")}
                    </Label>
                    <Input
                      id="scenario-monthly-deposit"
                      type="number"
                      value={scenarioInputs.monthlyDeposit}
                      onChange={(e) => setScenarioInputs(prev => ({
                        ...prev,
                        monthlyDeposit: Number(e.target.value)
                      }))}
                      data-testid="input-scenario-monthly-deposit"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scenario-expected-irr">
                      {t("vision2040.expectedReturn")} (%)
                    </Label>
                    <Input
                      id="scenario-expected-irr"
                      type="number"
                      step="0.1"
                      value={scenarioInputs.expectedIRR}
                      onChange={(e) => setScenarioInputs(prev => ({
                        ...prev,
                        expectedIRR: Number(e.target.value)
                      }))}
                      data-testid="input-scenario-expected-irr"
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {t("vision2040.adjustInputs")}
                </div>
              </div>

              <Separator />

              {/* Saved Scenarios */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {t("vision2040.savedScenarios")}
                  </h3>
                  <Badge variant="outline">
                    {savedScenarios.length}/5
                  </Badge>
                </div>

                {savedScenarios.length > 0 ? (
                  <div className="grid gap-2">
                    {savedScenarios.map((scenario) => (
                      <Card key={scenario.id} className="hover-elevate">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{scenario.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(parseFloat(scenario.monthlyDeposit))}/mo · {parseFloat(scenario.expectedIRR).toFixed(1)}% IRR
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadScenario(scenario)}
                                data-testid={`button-load-scenario-${scenario.id}`}
                              >
                                {t("vision2040.loadScenario")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteScenarioMutation.mutate(scenario.id)}
                                data-testid={`button-delete-scenario-${scenario.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">{t("vision2040.noSavedScenarios")}</div>
                      <div className="text-xs mt-1">{t("vision2040.noSavedScenariosDesc")}</div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Save Scenario Form */}
                {savedScenarios.length < 5 && (
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("vision2040.scenarioNamePlaceholder")}
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                      data-testid="input-scenario-name"
                    />
                    <Button
                      onClick={() => saveScenarioMutation.mutate()}
                      disabled={!scenarioName.trim() || saveScenarioMutation.isPending}
                      data-testid="button-save-scenario"
                    >
                      <Save className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                      {t("vision2040.saveScenario")}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
