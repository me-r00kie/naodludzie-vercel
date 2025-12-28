import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Step {
  id: number;
  title: string;
  description: string;
}

interface CabinFormWizardProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
  onSubmit: () => void;
  isSubmitting: boolean;
  canProceed: boolean;
  mode: "add" | "edit";
}

export const CabinFormWizard = ({
  steps,
  currentStep,
  onStepChange,
  children,
  onSubmit,
  isSubmitting,
  canProceed,
  mode,
}: CabinFormWizardProps) => {
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onSubmit();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="relative">
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex flex-col items-center flex-1 cursor-pointer"
              onClick={() => index <= currentStep && onStepChange(index)}
            >
              <div className="relative flex items-center justify-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    index < currentStep
                      ? "bg-primary border-primary text-primary-foreground"
                      : index === currentStep
                        ? "border-primary bg-background text-primary"
                        : "border-muted-foreground/30 bg-background text-muted-foreground/50"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-[calc(50%+20px)] w-[calc(100%-40px)] h-0.5 top-1/2 -translate-y-1/2",
                      "hidden sm:block",
                      index < currentStep ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                    style={{ width: "calc(100vw / " + steps.length + " - 60px)" }}
                  />
                )}
              </div>
              <div className="mt-2 text-center hidden sm:block">
                <p
                  className={cn(
                    "text-xs font-medium",
                    index === currentStep ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
              </div>
            </div>
          ))}
        </div>
        {/* Mobile step title */}
        <div className="sm:hidden mt-4 text-center">
          <p className="text-sm font-medium text-primary">{steps[currentStep].title}</p>
          <p className="text-xs text-muted-foreground">{steps[currentStep].description}</p>
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          Wstecz
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={!canProceed || isSubmitting}
        >
          {isSubmitting ? (
            "Zapisywanie..."
          ) : isLastStep ? (
            mode === "add" ? "Dodaj domek" : "Zapisz zmiany"
          ) : (
            "Dalej"
          )}
        </Button>
      </div>
    </div>
  );
};
