import React from "react";
import { View, StyleSheet, Pressable, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing } from "@/constants/theme";
import { Language } from "@/constants/translations";

// Brand Colors
const PURPLE_PRIMARY = "#6366F1";
const PURPLE_LIGHT = "#EEF2FF";

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
    <Pressable 
      style={[
        styles.languageRow, 
        isSelected && { backgroundColor: PURPLE_LIGHT + '50' }
      ]} 
      onPress={onSelect}
    >
      <View style={styles.languageInfo}>
        <View style={styles.labelRow}>
          <ThemedText style={[styles.languageName, isSelected && { color: PURPLE_PRIMARY }]} noTranslate>
            {languageOption.name}
          </ThemedText>
          {isSelected ? (
            <View style={[styles.currentBadge, { backgroundColor: PURPLE_PRIMARY }]}>
              <ThemedText style={styles.badgeText}>
                {currentLabel}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText style={styles.nativeName} noTranslate>
          {languageOption.nativeName}
        </ThemedText>
      </View>
      {isSelected ? (
        <View style={[styles.checkCircle, { backgroundColor: PURPLE_PRIMARY }]}>
          <Feather name="check" size={16} color="white" />
        </View>
      ) : (
        <View style={[styles.emptyCircle, { borderColor: '#E2E8F0' }]} />
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

  // Fixed top padding for the header area
  const dynamicTopPadding = Platform.OS === 'ios' ? insets.top : insets.top + 10;

  return (
    <ThemedView style={styles.container}>
      {/* FIXED HEADER AREA */}
      <View style={[styles.fixedHeader, { paddingTop: dynamicTopPadding }]}>
        <ThemedText style={styles.mainTitle}>{t.language.selectLanguage}</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="caption" style={[styles.sectionTitle, { color: '#94A3B8' }]}>
          {language === 'en' ? "AVAILABLE LANGUAGES" : "BAHASA TERSEDIA"}
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
                <View style={styles.divider} />
              ) : null}
            </View>
          ))}
        </Card>
        
        <View style={styles.noteContainer}>
          <Feather name="info" size={16} color={PURPLE_PRIMARY} style={{ marginBottom: 8 }} />
          <ThemedText style={styles.note}>
            {language === "en" 
              ? "The app will restart or update content to reflect your selected language."
              : "Aplikasi akan memperbarui konten sesuai dengan bahasa yang Anda pilih."}
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fixedHeader: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 10,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    marginLeft: 4,
    fontWeight: '800',
    letterSpacing: 1,
  },
  card: {
    padding: 0,
    marginBottom: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    elevation: 0,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    minHeight: 80,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 17,
    fontWeight: "800",
    color: '#1E293B',
  },
  nativeName: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: "900",
    textTransform: 'uppercase',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
  },
  noteContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 10,
  },
  note: {
    textAlign: "center",
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
});