import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-provider";
import { useVision2040Controller } from "@/hooks/use-vision2040-controller";
import { UnifiedProgressChart } from "./unified-progress-chart";
import { 
  Target, 
  ChevronDown, 
  ChevronUp,
  TrendingUp
} from "lucide-react";

interface Vision2040SimplifiedProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Vision2040Simplified({ isCollapsed = false, onToggle }: Vision2040SimplifiedProps) {
  const { t, language } = useLanguage();
  const controller = useVision2040Controller();
  const isRTL = language === "ar";
  
  // Local state for target input to avoid saving on every keystroke
  const [localTarget, setLocalTarget] = useState(controller.targetCapital2040.toString());
  
  // Update local target when controller value changes
  useEffect(() => {
    setLocalTarget(controller.targetCapital2040.toString());
  }, [controller.targetCapital2040]);
  
  // Save target on blur
  const handleTargetBlur = () => {
    const value = parseFloat(localTarget);
    if (!isNaN(value) && value > 0) {
      if (value !== controller.targetCapital2040) {
        controller.updateTargetCapital(value);
      }
    } else {
      // Revert to stored value on invalid input
      setLocalTarget(controller.targetCapital2040.toString());
    }
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
    <Card data-testid="card-vision-2040-calculator">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 md:p-6">
        <div className="min-w-0 flex-1">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="break-words leading-snug whitespace-normal">{t("vision2040.title")}</span>
          </CardTitle>
          <CardDescription className="mt-1 text-xs sm:text-sm">
            {t("vision2040.subtitle")}
          </CardDescription>
        </div>
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            data-testid="button-toggle-vision-2040"
            className="h-8 w-8 flex-shrink-0"
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
            <CardContent className="space-y-4 p-3 sm:p-4 md:p-6">
              {/* Input Section - Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Current Balance */}
                <div className="space-y-1.5">
                  <Label htmlFor="current-balance" className="text-xs sm:text-sm">
                    {t("vision2040.currentBalance")}
                  </Label>
                  <Input
                    id="current-balance"
                    type="number"
                    value={controller.currentPortfolioValue.toFixed(0)}
                    readOnly
                    className="text-sm h-8 sm:h-9 bg-muted/50"
                    data-testid="input-current-balance"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(controller.currentPortfolioValue)}
                  </p>
                </div>

                {/* Expected Return */}
                <div className="space-y-1.5">
                  <Label htmlFor="expected-return" className="text-xs sm:text-sm">
                    {t("vision2040.expectedReturn")}
                  </Label>
                  <Input
                    id="expected-return"
                    type="number"
                    step="0.1"
                    value={controller.currentInputs.expectedIRR}
                    onChange={(e) => controller.updateCurrentInput('expectedIRR', parseFloat(e.target.value) || 0)}
                    className="text-sm h-8 sm:h-9"
                    data-testid="input-expected-return"
                  />
                  <p className="text-xs text-muted-foreground">
                    {controller.weightedAPR.toFixed(1)}% {t("vision2040.weighted")}
                  </p>
                </div>

                {/* Monthly Deposit */}
                <div className="space-y-1.5">
                  <Label htmlFor="monthly-deposit" className="text-xs sm:text-sm">
                    {t("vision2040.monthlyDeposit")}
                  </Label>
                  <Input
                    id="monthly-deposit"
                    type="number"
                    value={controller.currentInputs.monthlyDeposit}
                    onChange={(e) => controller.updateCurrentInput('monthlyDeposit', parseFloat(e.target.value) || 0)}
                    className="text-sm h-8 sm:h-9"
                    data-testid="input-monthly-deposit"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(controller.currentInputs.monthlyDeposit)}
                  </p>
                </div>

                {/* Target 2040 */}
                <div className="space-y-1.5">
                  <Label htmlFor="target-2040" className="text-xs sm:text-sm">
                    {t("vision2040.target2040")}
                  </Label>
                  <Input
                    id="target-2040"
                    type="number"
                    value={localTarget}
                    onChange={(e) => setLocalTarget(e.target.value)}
                    onBlur={handleTargetBlur}
                    className="text-sm h-8 sm:h-9"
                    data-testid="input-target-2040"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(parseFloat(localTarget) || 0)}
                  </p>
                </div>
              </div>

              {/* Progress Summary - Compact Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Card className="bg-blue-500/10 border-blue-500/20">
                  <CardContent className="p-2 sm:p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span className="text-xs font-medium break-words leading-snug whitespace-normal">{t("vision2040.currentPath")}</span>
                    </div>
                    <div className="text-sm sm:text-lg font-bold text-blue-500 break-words leading-snug whitespace-normal">
                      {formatCurrency(controller.currentFinalValue)}
                    </div>
                    <div className="text-xs text-muted-foreground break-words leading-snug whitespace-normal">
                      {controller.currentProjectedProgress.toFixed(0)}%
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="p-2 sm:p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="text-xs font-medium break-words leading-snug whitespace-normal">{t("vision2040.targetPath")}</span>
                    </div>
                    <div className="text-sm sm:text-lg font-bold text-green-500 break-words leading-snug whitespace-normal">
                      {formatCurrency(controller.targetCapital2040)}
                    </div>
                    <div className="text-xs text-muted-foreground break-words leading-snug whitespace-normal">
                      100%
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-500/10 border-orange-500/20">
                  <CardContent className="p-2 sm:p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-orange-500 rounded-full flex-shrink-0"></div>
                      <span className="text-xs font-medium break-words leading-snug whitespace-normal">{t("vision2040.actualData")}</span>
                    </div>
                    <div className="text-sm sm:text-lg font-bold text-orange-500 break-words leading-snug whitespace-normal">
                      {formatCurrency(controller.currentPortfolioValue)}
                    </div>
                    <div className="text-xs text-muted-foreground break-words leading-snug whitespace-normal">
                      {controller.currentProgress.toFixed(0)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Generate Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => controller.generateTargets()}
                  disabled={controller.isGeneratingTargets}
                  variant="default"
                  size="sm"
                  data-testid="button-generate-targets"
                  className="h-8 text-xs sm:text-sm"
                >
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 ltr:mr-1.5 rtl:ml-1.5" />
                  {t("vision2040.generateTargets")}
                </Button>
              </div>

              {/* Unified Progress Chart */}
              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t("vision2040.progressChart")}
                </h3>
                <UnifiedProgressChart
                  currentPortfolioValue={controller.currentPortfolioValue}
                  targetCapital2040={controller.targetCapital2040}
                  currentInputs={controller.currentInputs}
                  scenarioInputs={controller.scenarioInputs}
                  yearsTo2040={controller.yearsTo2040}
                />
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
