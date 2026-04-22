import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/language-provider";
import { 
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Clock,
  Save,
  Trash2,
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
import { useMemo } from "react";
import type { ScenarioInputs } from "@/hooks/use-vision2040-controller";
import type { SavedScenario } from "@shared/schema";

interface Vision2040OverviewProps {
  controller: any; // Using any to avoid circular dependency
}

export function Vision2040Overview({ controller }: Vision2040OverviewProps) {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  // Format currency - Always use English numbers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Generate projection data for timeline
  const projectionData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const milestones = Array.from(new Set([currentYear, 2025, 2030, 2035, 2040])).sort((a, b) => a - b);
    
    return milestones.map(year => {
      const yearsFromNow = year - currentYear;
      
      // Current path projection
      const currentYears = Math.max(0, yearsFromNow);
      const currentMonthlyRate = controller.currentInputs.expectedIRR / 100 / 12;
      const currentMonths = currentYears * 12;
      let currentValue = controller.currentInputs.initialAmount;
      for (let i = 0; i < currentMonths; i++) {
        currentValue = currentValue * (1 + currentMonthlyRate) + controller.currentInputs.monthlyDeposit;
      }
      
      // Scenario path projection
      const scenarioYears = Math.max(0, yearsFromNow);
      const scenarioMonthlyRate = controller.scenarioInputs.expectedIRR / 100 / 12;
      const scenarioMonths = scenarioYears * 12;
      let scenarioValue = controller.scenarioInputs.initialAmount;
      for (let i = 0; i < scenarioMonths; i++) {
        scenarioValue = scenarioValue * (1 + scenarioMonthlyRate) + controller.scenarioInputs.monthlyDeposit;
      }
      
      return {
        year,
        currentPath: Math.round(currentValue),
        scenarioPath: Math.round(scenarioValue),
        label: String(year),
      };
    });
  }, [controller.currentInputs, controller.scenarioInputs]);

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
    <div className="space-y-4">
      {/* Current Portfolio Summary */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">
              {t("vision2040.currentPortfolio")}
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(controller.currentPortfolioValue)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {controller.currentProgress.toFixed(1)}% {t("vision2040.progressPercentage")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-chart-2/5 border-chart-2/20">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">
              {t("vision2040.targetAmount")}
            </div>
            <div className="text-2xl font-bold text-chart-2">
              {formatCurrency(controller.targetCapital2040)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {controller.yearsTo2040} {t("vision2040.yearsLeft")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">
              {t("vision2040.expectedReturn")}
            </div>
            <div className="text-2xl font-bold">
              {controller.weightedAPR.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("dashboard.weightedAvgAPR")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dual Progress Bars */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-chart-1 rounded-full"></div>
              <span className="text-sm font-medium">{t("vision2040.currentPath")}</span>
            </div>
            <span className="text-sm font-semibold">
              {controller.currentProjectedProgress.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={Math.min(100, controller.currentProjectedProgress)} 
            className="h-3"
            data-testid="progress-current-path"
          />
          <div className="text-xs text-muted-foreground mt-1">
            {formatCurrency(controller.currentFinalValue)} {t("dashboard.by2040")}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-chart-2 rounded-full"></div>
              <span className="text-sm font-medium">{t("vision2040.scenarioPath")}</span>
            </div>
            <span className="text-sm font-semibold">
              {controller.scenarioProjectedProgress.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={Math.min(100, controller.scenarioProjectedProgress)} 
            className="h-3"
            data-testid="progress-scenario-path"
          />
          <div className="text-xs text-muted-foreground mt-1">
            {formatCurrency(controller.scenarioFinalValue)} {t("dashboard.by2040")}
          </div>
        </div>
      </div>

      {/* Interactive Timeline Chart */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">{t("vision2040.projectionTimeline")}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="scenarioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                  }
                  return `${(value / 1000).toFixed(0)}K`;
                }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine 
                y={controller.targetCapital2040} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5"
                label={{ value: t("vision2040.targetGoal"), position: "right", fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="currentPath"
                name={t("vision2040.currentPath")}
                stroke="hsl(var(--chart-1))"
                fillOpacity={1}
                fill="url(#currentGradient)"
              />
              <Area
                type="monotone"
                dataKey="scenarioPath"
                name={t("vision2040.scenarioPath")}
                stroke="hsl(var(--chart-2))"
                fillOpacity={1}
                fill="url(#scenarioGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Smart Indicators */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Gap Indicator */}
        <Alert className={controller.monthlyGap > 0 ? "border-destructive/50" : "border-green-500/50"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-1">
              {controller.monthlyGap > 0 ? t("vision2040.monthlyGapTitle") : t("vision2040.onTrackTitle")}
            </div>
            <div className="text-xs">
              {controller.monthlyGap > 0 
                ? `${t("vision2040.additionalNeeded")}: ${formatCurrency(controller.monthlyGap)}/mo`
                : `${t("vision2040.surplusAmount")}: ${formatCurrency(Math.abs(controller.monthlyGap))}/mo`
              }
            </div>
          </AlertDescription>
        </Alert>

        {/* Time Progress Indicator */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-1">{t("vision2040.timeProgress")}</div>
            <div className="text-xs">
              {controller.yearsTo2040} {t("vision2040.years")} ({(controller.yearsTo2040 * 12)} {t("vision2040.monthsShort")}) {t("vision2040.remaining")}
            </div>
          </AlertDescription>
        </Alert>
      </div>

      <Separator />

      {/* Scenario Planning */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          {t("vision2040.scenarioPlanning")}
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="scenario-monthly-deposit">
              {t("vision2040.monthlyContribution")}
            </Label>
            <Input
              id="scenario-monthly-deposit"
              type="number"
              value={controller.scenarioInputs.monthlyDeposit}
              onChange={(e) => controller.setScenarioInputs((prev: ScenarioInputs) => ({
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
              value={controller.scenarioInputs.expectedIRR}
              onChange={(e) => controller.setScenarioInputs((prev: ScenarioInputs) => ({
                ...prev,
                expectedIRR: Number(e.target.value)
              }))}
              data-testid="input-scenario-expected-irr"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => controller.generateTargets()}
            disabled={controller.isGeneratingTargets}
            className="flex-1"
            data-testid="button-generate-targets"
          >
            <Calculator className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t("vision2040.generateMonthlyTargets")}
          </Button>
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
            {controller.savedScenarios.length}/5
          </Badge>
        </div>

        {controller.savedScenarios.length > 0 ? (
          <div className="grid gap-2">
            {controller.savedScenarios.map((scenario: SavedScenario) => (
              <Card key={scenario.id} className="hover-elevate">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{scenario.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(Number.parseFloat(String(scenario.monthlyDeposit)))}/mo · {Number.parseFloat(String(scenario.expectedIRR)).toFixed(1)}% IRR
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => controller.loadScenario(scenario)}
                        data-testid={`button-load-scenario-${scenario.id}`}
                      >
                        {t("vision2040.loadScenario")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => controller.deleteScenario(scenario.id)}
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
        {controller.savedScenarios.length < 5 && (
          <div className="flex gap-2">
            <Input
              placeholder={t("vision2040.scenarioNamePlaceholder")}
              value={controller.scenarioName}
              onChange={(e) => controller.setScenarioName(e.target.value)}
              data-testid="input-scenario-name"
            />
            <Button
              onClick={() => controller.saveScenario()}
              disabled={!controller.scenarioName.trim() || controller.isSavingScenario}
              data-testid="button-save-scenario"
            >
              <Save className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {t("vision2040.saveScenario")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}