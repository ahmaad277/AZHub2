import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateMonthlyTargets } from "@/lib/target-generator";
import type { 
  InvestmentWithPlatform, 
  CashTransaction, 
  UserSettings, 
  SavedScenario 
} from "@shared/schema";

export interface ScenarioInputs {
  initialAmount: number;
  monthlyDeposit: number;
  expectedIRR: number;
  targetAmount: number;
  durationYears: number;
}

interface Vision2040State {
  // Tab and filtering
  selectedTab: string;
  dateRange: { start?: Date; end?: Date };
  
  // Scenario inputs
  currentInputs: ScenarioInputs;
  scenarioInputs: ScenarioInputs;
  scenarioName: string;
  
  // Calculated values
  currentPortfolioValue: number;
  weightedAPR: number;
  targetCapital2040: number;
  yearsTo2040: number;
  currentFinalValue: number;
  scenarioFinalValue: number;
  currentProgress: number;
  currentProjectedProgress: number;
  scenarioProjectedProgress: number;
  requiredMonthlyDeposit: number;
  monthlyGap: number;
  
  // Data
  investments: InvestmentWithPlatform[] | undefined;
  cashTransactions: CashTransaction[] | undefined;
  settings: UserSettings | undefined;
  savedScenarios: SavedScenario[];
}

export function useVision2040Controller() {
  const { toast } = useToast();
  
  // Tab and date range state
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
  
  // Calculate current portfolio value
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
  
  // Calculate weighted APR
  const weightedAPR = useMemo(() => {
    const activeInvs = investments?.filter(inv => inv.status === "active") || [];
    if (activeInvs.length === 0) return 10;
    
    const totalValue = activeInvs.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
    if (totalValue === 0) return 10;
    
    const weightedSum = activeInvs.reduce((sum, inv) => {
      const weight = parseFloat(inv.faceValue) / totalValue;
      return sum + (parseFloat(inv.expectedIrr) * weight);
    }, 0);
    
    return weightedSum;
  }, [investments]);
  
  // Get target from settings
  const targetCapital2040 = useMemo(() => {
    return settings?.targetCapital2040 
      ? parseFloat(settings.targetCapital2040) 
      : 10000000;
  }, [settings]);
  
  // Calculate years to 2040
  const yearsTo2040 = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Math.max(0, 2040 - currentYear);
  }, []);
  
  // Current status inputs (editable for user)
  const [currentInputs, setCurrentInputs] = useState<ScenarioInputs>({
    initialAmount: 0,
    monthlyDeposit: 0,
    expectedIRR: 10,
    targetAmount: 10000000,
    durationYears: 15,
  });
  
  // Update current inputs when portfolio changes
  useEffect(() => {
    setCurrentInputs(prev => ({
      ...prev,
      initialAmount: currentPortfolioValue,
      expectedIRR: weightedAPR > 0 ? weightedAPR : 10,
      targetAmount: targetCapital2040,
      durationYears: yearsTo2040,
    }));
  }, [currentPortfolioValue, weightedAPR, targetCapital2040, yearsTo2040]);
  
  // Scenario inputs (editable)
  const [scenarioInputs, setScenarioInputs] = useState<ScenarioInputs>({
    initialAmount: 0,
    monthlyDeposit: 5000,
    expectedIRR: 12,
    targetAmount: 0,
    durationYears: 0,
  });
  
  const [scenarioName, setScenarioName] = useState("");
  
  // Helper to update current inputs
  const updateCurrentInput = (key: keyof ScenarioInputs, value: number) => {
    setCurrentInputs(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  
  // Helper to update target capital
  const updateTargetCapital = async (value: number) => {
    try {
      await apiRequest("PUT", "/api/settings", {
        targetCapital2040: value.toString(),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: "Target capital updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update target capital.",
      });
    }
  };
  
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
  
  // Calculate projections
  const currentFinalValue = calculateFutureValue(currentInputs);
  const scenarioFinalValue = calculateFutureValue(scenarioInputs);
  
  const currentProgress = (currentPortfolioValue / targetCapital2040) * 100;
  const currentProjectedProgress = (currentFinalValue / targetCapital2040) * 100;
  const scenarioProjectedProgress = (scenarioFinalValue / targetCapital2040) * 100;
  
  // Calculate required monthly deposit
  const requiredMonthlyDeposit = useMemo(() => {
    const { initialAmount, expectedIRR, targetAmount, durationYears } = scenarioInputs;
    const monthlyRate = expectedIRR / 100 / 12;
    const months = durationYears * 12;
    
    if (months === 0 || monthlyRate === 0) return 0;
    
    const futureValueOfInitial = initialAmount * Math.pow(1 + monthlyRate, months);
    const remaining = targetAmount - futureValueOfInitial;
    
    if (remaining <= 0) return 0;
    
    const pmt = remaining / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate));
    return Math.max(0, pmt);
  }, [scenarioInputs]);
  
  const monthlyGap = Math.max(0, requiredMonthlyDeposit - scenarioInputs.monthlyDeposit);
  
  // Generate targets mutation
  const generateTargetsMutation = useMutation({
    mutationFn: async () => {
      const targets = generateMonthlyTargets(
        scenarioInputs,
        new Date(),
        scenarioName || "Vision 2040"
      );
      
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
      setSelectedTab("progress");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate targets.",
        variant: "destructive",
      });
    }
  });
  
  // Save scenario mutation
  const saveScenarioMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/saved-scenarios", {
        name: scenarioName,
        monthlyDeposit: scenarioInputs.monthlyDeposit.toString(),
        expectedIrr: scenarioInputs.expectedIRR.toString(),
        targetAmount: scenarioInputs.targetAmount.toString(),
        durationYears: scenarioInputs.durationYears,
        metadata: {
          initialAmount: scenarioInputs.initialAmount,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-scenarios"] });
      setScenarioName("");
      toast({
        title: "Success",
        description: "Scenario saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save scenario.",
        variant: "destructive",
      });
    }
  });
  
  // Delete scenario mutation
  const deleteScenarioMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/saved-scenarios/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-scenarios"] });
      toast({
        title: "Success",
        description: "Scenario deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete scenario.",
        variant: "destructive",
      });
    }
  });
  
  // Load scenario helper
  const loadScenario = (scenario: SavedScenario) => {
    setScenarioInputs({
      initialAmount: currentPortfolioValue,
      monthlyDeposit: parseFloat(scenario.monthlyDeposit),
      expectedIRR: parseFloat(scenario.expectedIRR),
      targetAmount: parseFloat(scenario.targetAmount),
      durationYears: scenario.durationYears,
    });
    setScenarioName(scenario.name);
    toast({
      title: "Scenario loaded",
      description: `"${scenario.name}" loaded successfully.`,
    });
  };
  
  return {
    // State
    selectedTab,
    setSelectedTab,
    dateRange,
    setDateRange,
    currentInputs,
    scenarioInputs,
    setScenarioInputs,
    scenarioName,
    setScenarioName,
    
    // Calculated values
    currentPortfolioValue,
    weightedAPR,
    targetCapital2040,
    yearsTo2040,
    currentFinalValue,
    scenarioFinalValue,
    currentProgress,
    currentProjectedProgress,
    scenarioProjectedProgress,
    requiredMonthlyDeposit,
    monthlyGap,
    
    // Data
    investments,
    cashTransactions,
    settings,
    savedScenarios,
    
    // Actions
    generateTargets: generateTargetsMutation.mutate,
    isGeneratingTargets: generateTargetsMutation.isPending,
    saveScenario: saveScenarioMutation.mutate,
    isSavingScenario: saveScenarioMutation.isPending,
    deleteScenario: deleteScenarioMutation.mutate,
    loadScenario,
    updateCurrentInput,
    updateTargetCapital,
    
    // Helper functions
    calculateFutureValue,
  };
}