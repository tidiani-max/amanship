import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface OnboardingContextType {
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const ONBOARDING_STORAGE_KEY = "@kilatgo_onboarding_completed";

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOnboardingState();
  }, []);

  const loadOnboardingState = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      setHasCompletedOnboarding(completed === "true");
    } catch (error) {
      console.error("Failed to load onboarding state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error("Failed to save onboarding state:", error);
    }
  };

  const resetOnboarding = () => {
    setHasCompletedOnboarding(false);
    AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY).catch((error) => {
      console.error("Failed to reset onboarding state:", error);
    });
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        isLoading,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
