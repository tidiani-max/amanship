import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing } from "@/constants/theme";

const APP_VERSION = "1.0.0";
const BUILD_NUMBER = "1";

function InfoRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.infoRow}>
      <ThemedText type="body" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
      <ThemedText type="body" style={{ fontWeight: "500" }}>
        {value}
      </ThemedText>
    </View>
  );
}

function LinkRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  
  return (
    <Pressable style={styles.linkRow} onPress={onPress}>
      <View style={[styles.linkIcon, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name={icon as any} size={18} color={theme.primary} />
      </View>
      <ThemedText type="body" style={{ flex: 1 }}>
        {label}
      </ThemedText>
      <Feather name="external-link" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Failed to open URL:", err));
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <View style={[styles.logoContainer, { backgroundColor: theme.primary }]}>
            <Feather name="zap" size={40} color={theme.buttonText} />
          </View>
          <ThemedText type="h2" style={styles.appName}>
            KilatGo
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
            {t.about.appDescription}
          </ThemedText>
        </View>
        
        <Card style={styles.card}>
          <InfoRow label={t.about.version} value={APP_VERSION} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <InfoRow label="Build" value={BUILD_NUMBER} />
        </Card>
        
        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t.about.legal.toUpperCase()}
        </ThemedText>
        <Card style={styles.card}>
          <LinkRow
            icon="file-text"
            label={t.about.termsOfService}
            onPress={() => openLink("https://kilatgo.com/terms")}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <LinkRow
            icon="shield"
            label={t.about.privacyPolicy}
            onPress={() => openLink("https://kilatgo.com/privacy")}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <LinkRow
            icon="book"
            label={t.about.licenses}
            onPress={() => openLink("https://kilatgo.com/licenses")}
          />
        </Card>
        
        <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t.about.followUs.toUpperCase()}
        </ThemedText>
        <Card style={styles.card}>
          <LinkRow
            icon="instagram"
            label="Instagram"
            onPress={() => openLink("https://instagram.com/kilatgo")}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <LinkRow
            icon="twitter"
            label="Twitter"
            onPress={() => openLink("https://twitter.com/kilatgo")}
          />
        </Card>
        
        <ThemedText type="small" style={[styles.copyright, { color: theme.textSecondary }]}>
          2024 KilatGo. {t.about.allRightsReserved}.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  appName: {
    marginBottom: Spacing.xs,
  },
  card: {
    padding: 0,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    letterSpacing: 1,
  },
  copyright: {
    textAlign: "center",
    marginTop: Spacing.xs,
  },
});
