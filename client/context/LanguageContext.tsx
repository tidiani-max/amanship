import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, Language, TranslationKeys } from "@/constants/translations";
import { FirstLaunchLanguageModal } from "@/components/FirstLaunchLanguageModal";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LANGUAGE_STORAGE_KEY = "@ZendO_language";
const LANGUAGE_SELECTED_KEY = "@ZendO_language_selected"; // Track if user has selected

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isLoading, setIsLoading] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    initializeLanguage();
  }, []);

  const initializeLanguage = async () => {
    try {
      // Check if user has ever selected a language
      const hasSelected = await AsyncStorage.getItem(LANGUAGE_SELECTED_KEY);
      
      if (!hasSelected) {
        // First time user - show modal
        setShowLanguageModal(true);
        setIsLoading(false);
        return;
      }

      // Load previously selected language
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && (stored === "en" || stored === "id")) {
        setLanguageState(stored);
      }
    } catch (error) {
      console.error("Failed to initialize language:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      await AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, "true"); // Mark as selected
      setLanguageState(lang);
    } catch (error) {
      console.error("Failed to save language:", error);
    }
  };

  const handleFirstLanguageSelection = async (lang: Language) => {
    await setLanguage(lang);
    setShowLanguageModal(false);
  };

  const t = translations[language];

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {/* Language Selection Modal - Only on first launch */}
      <FirstLaunchLanguageModal
        visible={showLanguageModal}
        onSelectLanguage={handleFirstLanguageSelection}
      />
      
      {/* Only show children after language is selected */}
      {!showLanguageModal && children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}