import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language-provider";
import { useVision2040Controller } from "@/hooks/use-vision2040-controller";
import { MonthlyTargetsTable } from "./monthly-targets-table";
import { MonthlyProgressChart } from "./monthly-progress-chart";
import { Vision2040Overview } from "./vision-2040-overview";
import { 
  ChevronDown, 
  ChevronUp,
  Calculator,
  TrendingUp,
  TableProperties,
  LineChart
} from "lucide-react";

interface Vision2040CalculatorProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Vision2040CalculatorRefactored({ isCollapsed = false, onToggle }: Vision2040CalculatorProps) {
  const { t } = useLanguage();
  const controller = useVision2040Controller();

  return (
    <Card data-testid="card-vision-2040-calculator">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-1.5 text-lg">
          <LineChart className="h-5 w-5 text-primary" />
          {t("vision2040.title")}
        </CardTitle>
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
            <CardContent className="space-y-3 sm:space-y-4">
              <Tabs 
                value={controller.selectedTab} 
                onValueChange={controller.setSelectedTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 h-auto p-1">
                  <TabsTrigger value="overview" className="flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm">
                    <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t("vision2040.overview")}
                  </TabsTrigger>
                  <TabsTrigger value="progress" className="flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t("vision2040.progressTab")}
                  </TabsTrigger>
                  <TabsTrigger value="targets" className="flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm">
                    <TableProperties className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t("vision2040.targetsTab")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <Vision2040Overview controller={controller} />
                </TabsContent>

                <TabsContent value="progress" className="mt-4">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-end">
                      <Button
                        onClick={() => controller.generateTargets()}
                        disabled={controller.isGeneratingTargets}
                        variant="outline"
                        size="sm"
                        data-testid="button-generate-targets-progress"
                      >
                        <Calculator className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
                        {t("vision2040.generateMonthlyTargets")}
                      </Button>
                    </div>
                    <MonthlyProgressChart
                      startDate={controller.dateRange.start}
                      endDate={controller.dateRange.end}
                      height={320}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="targets" className="mt-4">
                  <MonthlyTargetsTable
                    startDate={controller.dateRange.start}
                    endDate={controller.dateRange.end}
                    targetValue={controller.targetCapital2040}
                    currentValue={controller.currentPortfolioValue}
                    onGenerateTargets={() => controller.generateTargets()}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}