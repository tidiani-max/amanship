import React, { useState, useEffect } from "react";
import { View, StyleSheet, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing } from "@/constants/theme";

const NOTIFICATIONS_KEY = "@kilatgo_notifications";

interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  deliveryAlerts: boolean;
}

const defaultSettings: NotificationSettings = {
  orderUpdates: true,
  promotions: false,
  deliveryAlerts: true,
};

function SettingRow({
  icon,
  title,
  description,
  value,
  onValueChange,
}: {
  icon: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.settingRow}>
      <View style={[styles.iconContainer, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name={icon as any} size={20} color={theme.primary} />
      </View>
      <View style={styles.settingInfo}>
        <ThemedText type="body" style={{ fontWeight: "500" }}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {description}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.primary + "80" }}
        thumbColor={value ? theme.primary : theme.backgroundTertiary}
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Failed to save notification settings:", error);
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
          <SettingRow
            icon="package"
            title={t.notifications.orderUpdates}
            description={t.notifications.orderDescription}
            value={settings.orderUpdates}
            onValueChange={(value) => updateSetting("orderUpdates", value)}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          
          <SettingRow
            icon="truck"
            title={t.notifications.deliveryAlerts}
            description={t.notifications.deliveryDescription}
            value={settings.deliveryAlerts}
            onValueChange={(value) => updateSetting("deliveryAlerts", value)}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          
          <SettingRow
            icon="tag"
            title={t.notifications.promotions}
            description={t.notifications.promotionsDescription}
            value={settings.promotions}
            onValueChange={(value) => updateSetting("promotions", value)}
          />
        </Card>
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
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
});
