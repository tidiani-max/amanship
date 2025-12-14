import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const LANGUAGE_KEY = "@kilatgo_language";

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

const languages: Language[] = [
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "Chinese" },
];

function LanguageOption({
  language,
  isSelected,
  onSelect,
}: {
  language: Language;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { theme } = useTheme();
  
  return (
    <Pressable style={styles.languageRow} onPress={onSelect}>
      <View style={styles.languageInfo}>
        <ThemedText type="body" style={{ fontWeight: "500" }}>
          {language.name}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {language.nativeName}
        </ThemedText>
      </View>
      {isSelected ? (
        <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
          <Feather name="check" size={16} color={theme.buttonText} />
        </View>
      ) : (
        <View style={[styles.emptyCircle, { borderColor: theme.border }]} />
      )}
    </Pressable>
  );
}

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState("id");

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (stored) {
        setSelectedLanguage(stored);
      }
    } catch (error) {
      console.error("Failed to load language:", error);
    }
  };

  const selectLanguage = async (code: string) => {
    setSelectedLanguage(code);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, code);
    } catch (error) {
      console.error("Failed to save language:", error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Card style={styles.card}>
          {languages.map((language, index) => (
            <React.Fragment key={language.code}>
              <LanguageOption
                language={language}
                isSelected={selectedLanguage === language.code}
                onSelect={() => selectLanguage(language.code)}
              />
              {index < languages.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              ) : null}
            </React.Fragment>
          ))}
        </Card>
        
        <ThemedText type="small" style={[styles.note, { color: theme.textSecondary }]}>
          App will use your selected language for all content. Some content may still appear in the original language.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    padding: 0,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  languageInfo: {
    flex: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  note: {
    textAlign: "center",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
});
