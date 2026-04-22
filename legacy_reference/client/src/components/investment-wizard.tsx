import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  isComplete?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

interface InvestmentWizardProps {
  steps: WizardStep[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  children: ReactNode;
  onPrevious?: () => void;
  onNext?: () => void;
  onComplete?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isLoading?: boolean;
  error?: string;
}

/**
 * Investment Dialog Wizard Component
 * Provides step-by-step navigation for adding/editing investments
 */
export function InvestmentWizard({
  steps,
  currentStepIndex,
  onStepChange,
  children,
  onPrevious,
  onNext,
  onComplete,
  canGoNext = true,
  canGoPrevious = true,
  isLoading = false,
  error,
}: InvestmentWizardProps) {
  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="w-full space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {currentStepIndex + 1} / {steps.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {currentStep?.title}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps Navigation */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 lg:auto-cols-fr lg:grid-cols-none" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => onStepChange(index)}
            disabled={isLoading || (index > currentStepIndex && !step.isComplete)}
            className={`
              relative p-3 rounded-lg border transition-all
              ${index === currentStepIndex 
                ? 'border-primary bg-primary/10 ring-1 ring-primary' 
                : index < currentStepIndex 
                ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                : 'border-muted bg-muted/40 opacity-50 cursor-not-allowed'
              }
              ${step.isError ? 'border-destructive bg-destructive/10' : ''}
            `}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="text-sm font-medium">{index + 1}</div>
              <div className="text-xs text-center line-clamp-2">{step.title}</div>
              {step.isError && (
                <div className="text-xs text-destructive mt-1">⚠️</div>
              )}
              {index < currentStepIndex && (
                <div className="text-xs text-green-600 dark:text-green-400">✓</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Step Description */}
      {currentStep?.description && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {currentStep.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {(error || (currentStep?.isError && currentStep?.errorMessage)) && (
        <Card className="bg-destructive/10 border-destructive/50">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">
              ⚠️ {error || currentStep?.errorMessage}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step Content */}
      <motion.div
        key={currentStepIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={!canGoPrevious || currentStepIndex === 0 || isLoading}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          السابق / Previous
        </Button>

        <div className="flex gap-3">
          {!isLastStep && (
            <Button
              type="button"
              onClick={onNext}
              disabled={!canGoNext || isLoading}
              className="gap-2"
            >
              التالي / Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {isLastStep && (
            <Button
              type="submit"
              onClick={onComplete}
              disabled={!canGoNext || isLoading}
              className="gap-2"
            >
              {isLoading ? 'جاري الحفظ...' : 'إضافة الاستثمار / Add Investment'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvestmentWizard;
