import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing } from "@/constants/theme";
import { Language } from "@/constants/translations";

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

const languages: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
];

function LanguageOptionRow({
  languageOption,
  isSelected,
  onSelect,
  currentLabel,
}: {
  languageOption: LanguageOption;
  isSelected: boolean;
  onSelect: () => void;
  currentLabel: string;
}) {
  const { theme } = useTheme();
  
  return (
    <Pressable style={styles.languageRow} onPress={onSelect}>
      <View style={styles.languageInfo}>
        <View style={styles.labelRow}>
          <ThemedText type="body" style={{ fontWeight: "500" }}>
            {languageOption.name}
          </ThemedText>
          {isSelected ? (
            <View style={[styles.currentBadge, { backgroundColor: theme.primary + "20" }]}>
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                {currentLabel}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {languageOption.nativeName}
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
  const { language, setLanguage, t } = useLanguage();

  const handleSelectLanguage = async (code: Language) => {
    await setLanguage(code);
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
        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t.language.selectLanguage.toUpperCase()}
        </ThemedText>
        
        <Card style={styles.card}>
          {languages.map((lang, index) => (
            <View key={lang.code}>
              <LanguageOptionRow
                languageOption={lang}
                isSelected={language === lang.code}
                onSelect={() => handleSelectLanguage(lang.code)}
                currentLabel={t.language.current}
              />
              {index < languages.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              ) : null}
            </View>
          ))}
        </Card>
        
        <ThemedText type="small" style={[styles.note, { color: theme.textSecondary }]}>
          {language === "en" 
            ? "App will use your selected language for all content."
            : "Aplikasi akan menggunakan bahasa yang Anda pilih untuk semua konten."}
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
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    letterSpacing: 1,
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
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
