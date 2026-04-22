import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-provider";
import { Target, TrendingUp, DollarSign, Calendar, ChevronDown, ChevronUp, Wallet, ArrowUp, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { InvestmentWithPlatform, CashTransaction } from "@shared/schema";

interface CalculationResult {
  futureValue: number;
  totalDeposits: number;
  totalReturns: number;
  projections: Array<{ year: number; value: number; deposits: number }>;
}

interface GoalCalculatorProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function GoalCalculator({ isCollapsed = false, onToggle }: GoalCalculatorProps = {}) {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  // Fetch investments and cash balance to calculate current portfolio value
  const { data: investments } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ["/api/cash/transactions"],
  });

  // Calculate current portfolio value using face value (principal invested)
  const currentPortfolioValue = useMemo(() => {
    if (!investments || !cashTransactions) return 10000; // Default fallback
    
    // Use faceValue for active investments (principal invested, not including expected profits)
    const activeInvestmentsValue = investments
      .filter(inv => inv.status === "active")
      .reduce((sum, inv) => sum + Number.parseFloat(String(inv.faceValue)), 0);
    
    const cashBalance = cashTransactions.reduce((balance, tx) => {
      const amount = Number.parseFloat(String(tx.amount));
      if (tx.type === 'deposit' || tx.type === 'distribution') {
        return balance + amount;
      } else if (tx.type === 'withdrawal' || tx.type === 'investment') {
        return balance - amount;
      }
      return balance;
    }, 0);
    
    const totalValue = activeInvestmentsValue + cashBalance;
    return totalValue > 0 ? totalValue : 10000; // Use actual value or default
  }, [investments, cashTransactions]);

  const [inputs, setInputs] = useState({
    initialAmount: 10000,
    monthlyDeposit: 1000,
    expectedIRR: 12,
    durationYears: 10,
  });

  // Update initialAmount when currentPortfolioValue changes
  useEffect(() => {
    setInputs(prev => ({
      ...prev,
      initialAmount: Math.round(currentPortfolioValue)
    }));
  }, [currentPortfolioValue]);

  const [result, setResult] = useState<CalculationResult | null>(null);

  const calculateGoal = () => {
    const { initialAmount, monthlyDeposit, expectedIRR, durationYears } = inputs;
    
    const monthlyRate = expectedIRR / 100 / 12;
    const months = durationYears * 12;
    
    const projections = [];
    let currentValue = initialAmount;
    let totalDepositsAccum = initialAmount;
    
    for (let year = 0; year <= durationYears; year++) {
      if (year === 0) {
        projections.push({
          year: 0,
          value: initialAmount,
          deposits: initialAmount,
        });
      } else {
        for (let month = 1; month <= 12; month++) {
          currentValue = currentValue * (1 + monthlyRate) + monthlyDeposit;
          totalDepositsAccum += monthlyDeposit;
        }
        
        projections.push({
          year,
          value: Math.round(currentValue),
          deposits: Math.round(totalDepositsAccum),
        });
      }
    }
    
    const futureValue = currentValue;
    const totalDeposits = totalDepositsAccum;
    const totalReturns = futureValue - totalDeposits;
    
    setResult({
      futureValue: Math.round(futureValue),
      totalDeposits: Math.round(totalDeposits),
      totalReturns: Math.round(totalReturns),
      projections,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card data-testid="card-goal-calculator">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-4 w-4 text-primary" />
            {t("calculator.title") || "Investment Goal Calculator"}
          </CardTitle>
          <CardDescription className="mt-1.5">
            {t("calculator.description") || "Calculate your future investment value based on deposits and returns"}
          </CardDescription>
        </div>
        {onToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            data-testid="button-toggle-goal-calculator"
            className="h-8 w-8 p-0"
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="initial-amount" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t("calculator.initialAmount") || "Initial Amount (SAR)"}
            </Label>
            <Input
              id="initial-amount"
              type="number"
              value={inputs.initialAmount}
              onChange={(e) => setInputs({ ...inputs, initialAmount: Number(e.target.value) })}
              data-testid="input-initial-amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly-deposit" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("calculator.monthlyDeposit") || "Monthly Deposit (SAR)"}
            </Label>
            <Input
              id="monthly-deposit"
              type="number"
              value={inputs.monthlyDeposit}
              onChange={(e) => setInputs({ ...inputs, monthlyDeposit: Number(e.target.value) })}
              data-testid="input-monthly-deposit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected-irr" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t("calculator.expectedIRR") || "Expected Annual Return (%)"}
            </Label>
            <Input
              id="expected-irr"
              type="number"
              step="0.1"
              value={inputs.expectedIRR}
              onChange={(e) => setInputs({ ...inputs, expectedIRR: Number(e.target.value) })}
              data-testid="input-expected-irr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration-years" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("calculator.durationYears") || "Duration (Years)"}
            </Label>
            <Input
              id="duration-years"
              type="number"
              value={inputs.durationYears}
              onChange={(e) => setInputs({ ...inputs, durationYears: Number(e.target.value) })}
              data-testid="input-duration-years"
            />
          </div>
        </div>

        {/* Current Portfolio Summary */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {t("goalCalculator.currentPortfolio")}
                  </p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-current-portfolio">
                    {formatCurrency(currentPortfolioValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-chart-2/5 border-chart-2/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <Target className="h-5 w-5 text-chart-2" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {t("goalCalculator.visionGoal")}
                  </p>
                  <p className="text-2xl font-bold text-chart-2" data-testid="text-vision-goal">
                    {formatCurrency(10000000)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress towards Vision 2040 */}
        <Card className="border-chart-1/30">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {t("goalCalculator.progressTitle")}
                </p>
                <p className="text-sm font-bold text-chart-1">
                  {((currentPortfolioValue / 10000000) * 100).toFixed(2)}%
                </p>
              </div>
              <Progress 
                value={(currentPortfolioValue / 10000000) * 100} 
                className="h-2"
                data-testid="progress-vision-2040" 
              />
              <p className="text-xs text-muted-foreground">
                {t("goalCalculator.remaining", {
                  amount: formatCurrency(10000000 - currentPortfolioValue),
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={calculateGoal}
          className="w-full"
          data-testid="button-calculate-goal"
        >
          <Target className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t("calculator.calculate") || "Calculate Goal"}
        </Button>

        {result && (
          <div className="space-y-4">
            {/* Smart Alert based on results */}
            {result.futureValue < 10000000 && (
              <Alert variant="destructive" data-testid="alert-goal-warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("goalCalculator.warning", {
                    futureValue: formatCurrency(result.futureValue),
                    year: String(new Date().getFullYear() + inputs.durationYears),
                    goal: formatCurrency(10000000),
                  })}
                </AlertDescription>
              </Alert>
            )}
            {result.futureValue >= 10000000 && (
              <Alert className="border-chart-1 bg-chart-1/5" data-testid="alert-goal-success">
                <ArrowUp className="h-4 w-4 text-chart-1" />
                <AlertDescription className="text-chart-1">
                  {t("goalCalculator.success", {
                    futureValue: formatCurrency(result.futureValue),
                    year: String(new Date().getFullYear() + inputs.durationYears),
                  })}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">
                    {t("calculator.futureValue") || "Future Value"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-chart-2" data-testid="stat-future-value">
                    {formatCurrency(result.futureValue)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">
                    {t("calculator.totalDeposits") || "Total Deposits"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-primary" data-testid="stat-total-deposits">
                    {formatCurrency(result.totalDeposits)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">
                    {t("calculator.totalReturns") || "Total Returns"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-chart-1" data-testid="stat-total-returns">
                    {formatCurrency(result.totalReturns)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t("calculator.projectionChart") || "Investment Projection"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.projections}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="year"
                        className="text-xs"
                        label={{
                          value: t("calculator.years") || "Years",
                          position: "insideBottom",
                          offset: -5,
                        }}
                      />
                      <YAxis
                        className="text-xs"
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      {t("calculator.year") || "Year"} {payload[0].payload.year}
                                    </span>
                                    <span className="font-bold text-chart-2">
                                      {formatCurrency(payload[0].payload.value)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {t("calculator.deposits") || "Deposits"}: {formatCurrency(payload[0].payload.deposits)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="deposits"
                        stroke="hsl(var(--primary))"
                        fill="url(#colorDeposits)"
                        strokeWidth={2}
                        name={t("calculator.deposits") || "Deposits"}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--chart-2))"
                        fill="url(#colorValue)"
                        strokeWidth={2}
                        name={t("calculator.futureValue") || "Future Value"}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
