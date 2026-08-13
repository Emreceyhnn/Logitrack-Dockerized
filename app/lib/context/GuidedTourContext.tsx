"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export interface TourStep {
  /** CSS selector to highlight */
  targetSelector: string;
  /** Title for this step */
  title: string;
  /** Description for this step */
  description: string;
  /** Placement of the tooltip relative to the target */
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

interface GuidedTourState {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  pageKey: string;
}

interface GuidedTourContextValue {
  state: GuidedTourState;
  startTour: (pageKey: string, steps: TourStep[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  closeTour: () => void;
  goToStep: (index: number) => void;
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

/**
 * tr-kullanıcıya rehberli tur sağlamak için context sağlayıcısı bileşeni
 * en-context provider component to supply the guided tour to the user
 * input ({ children }: { children: ReactNode })
 * output (JSX.Element)
 */
export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuidedTourState>({
    isActive: false,
    currentStep: 0,
    steps: [],
    pageKey: "",
  });

  const startTour = useCallback((pageKey: string, steps: TourStep[]) => {
    setState({ isActive: true, currentStep: 0, steps, pageKey });
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep >= prev.steps.length - 1) {
        return { ...prev, isActive: false, currentStep: 0, steps: [] };
      }
      return { ...prev, currentStep: prev.currentStep + 1 };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  }, []);

  const closeTour = useCallback(() => {
    setState({ isActive: false, currentStep: 0, steps: [], pageKey: "" });
  }, []);

  const goToStep = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, Math.min(index, prev.steps.length - 1)),
    }));
  }, []);

  const value = useMemo(
    () => ({ state, startTour, nextStep, prevStep, closeTour, goToStep }),
    [state, startTour, nextStep, prevStep, closeTour, goToStep]
  );

  return (
    <GuidedTourContext.Provider value={value}>
      {children}
    </GuidedTourContext.Provider>
  );
}

/**
 * tr-rehberli tur context değerlerini döndüren hook
 * en-hook that returns the guided tour context values
 * input ()
 * output (GuidedTourContextValue)
 */
export function useGuidedTour(): GuidedTourContextValue {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) {
    throw new Error("useGuidedTour must be used within a GuidedTourProvider");
  }
  return ctx;
}
