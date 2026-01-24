import React, { useState, useEffect } from "react";
import { View, StyleSheet, Switch, Alert, Platform, ScrollView, Pressable, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing } from "@/constants/theme";
import { useNotifications } from "../hooks/useNotification";


const NOTIFICATIONS_KEY = "@kilatgo_notifications";

interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  deliveryAlerts: boolean;
  chatMessages: boolean;
}

const defaultSettings: NotificationSettings = {
  orderUpdates: true,
  promotions: false,
  deliveryAlerts: true,
  chatMessages: true,
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
  const { user } = useAuth();
  const { registerForPushNotifications } = useNotifications();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [permissionStatus, setPermissionStatus] = useState<string>("unknown");
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);

    if (status === 'granted') {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: '113ea7fa-db9e-4380-b05f-dd63a05e5632',
        });
        setPushToken(tokenData.data);
      } catch (error) {
        console.error("Failed to get push token:", error);
      }
    }
  };

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
    if (value && permissionStatus !== 'granted') {
      Alert.alert(
        "Enable Notifications",
        "To receive notifications, we need your permission.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Enable",
            onPress: async () => {
              await registerForPushNotifications();
              await checkPermissionStatus();
              await saveSetting(key, value);
            },
          },
        ]
      );
      return;
    }

    await saveSetting(key, value);
  };

  const saveSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Failed to save notification settings:", error);
    }
  };

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);

    if (status !== 'granted') {
      Alert.alert(
        "Permission Denied",
        "You've denied notification permissions. You can enable them in your device settings.",
        [
          { text: "OK", style: "default" },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === 'ios') {
                Notifications.requestPermissionsAsync();
              }
            },
          },
        ]
      );
    } else {
      await registerForPushNotifications();
      await checkPermissionStatus();
      Alert.alert("Success", "Push notifications enabled!");
    }
  };

  const testNotification = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert("Error", "Please enable notifications first");
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Notification 📬",
          body: "Your notifications are working correctly!",
          data: { test: true },
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2 
        },
      });

      Alert.alert("Success", "Test notification will appear in 2 seconds");
    } catch (error) {
      console.error("Failed to send test notification:", error);
      Alert.alert("Error", "Failed to send test notification");
    }
  };

  // ✅ Fixed: Proper type for dynamic styles
  const getStatusCardStyle = (): ViewStyle => {
    return {
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      backgroundColor: permissionStatus === 'granted' 
        ? theme.success + '15' 
        : theme.warning + '15'
    };
  };

  const getInfoCardStyle = (): ViewStyle => {
    return {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      marginBottom: Spacing.md,
      backgroundColor: theme.primary + '10'
    };
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        {/* Permission Status Card - ✅ Fixed style */}
        <Card style={getStatusCardStyle()}>
          <View style={styles.statusRow}>
            <Feather 
              name={permissionStatus === 'granted' ? "check-circle" : "alert-circle"} 
              size={24} 
              color={permissionStatus === 'granted' ? theme.success : theme.warning}
            />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>
                {permissionStatus === 'granted' ? "Notifications Enabled" : "Notifications Disabled"}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
                {permissionStatus === 'granted' 
                  ? "You'll receive updates about your orders"
                  : "Enable to receive order and delivery updates"
                }
              </ThemedText>
            </View>
          </View>

          {permissionStatus !== 'granted' && (
            <Pressable 
              style={[styles.enableButton, { backgroundColor: theme.primary }]}
              onPress={requestPermissions}
            >
              <ThemedText style={{ color: 'white', fontWeight: '600' }}>
                Enable Notifications
              </ThemedText>
            </Pressable>
          )}
        </Card>

        {/* Role-Specific Info - ✅ Fixed style */}
        {user?.role && ['picker', 'driver'].includes(user.role) && (
          <Card style={getInfoCardStyle()}>
            <Feather name="info" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginLeft: Spacing.sm, flex: 1, color: theme.textSecondary }}>
              As a {user.role}, you'll receive instant notifications for new {user.role === 'picker' ? 'orders' : 'deliveries'}
            </ThemedText>
          </Card>
        )}

        {/* Settings Card */}
        <Card style={styles.card}>
          {user?.role === 'customer' && (
            <>
              <SettingRow
                icon="package"
                title="Order Updates"
                description="Get notified when your order status changes"
                value={settings.orderUpdates}
                onValueChange={(value) => updateSetting("orderUpdates", value)}
              />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </>
          )}

          <SettingRow
            icon="truck"
            title="Delivery Alerts"
            description={user?.role === 'driver' ? "New deliveries available" : "Track your delivery in real-time"}
            value={settings.deliveryAlerts}
            onValueChange={(value) => updateSetting("deliveryAlerts", value)}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <SettingRow
            icon="message-circle"
            title="Chat Messages"
            description="Notifications for new messages"
            value={settings.chatMessages}
            onValueChange={(value) => updateSetting("chatMessages", value)}
          />

          {user?.role === 'customer' && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <SettingRow
                icon="tag"
                title="Promotions"
                description="Special offers and discounts"
                value={settings.promotions}
                onValueChange={(value) => updateSetting("promotions", value)}
              />
            </>
          )}
        </Card>

        {/* Test Notification Button */}
        {permissionStatus === 'granted' && __DEV__ && (
          <Pressable 
            style={[styles.testButton, { borderColor: theme.border }]}
            onPress={testNotification}
          >
            <Feather name="send" size={18} color={theme.primary} />
            <ThemedText style={{ marginLeft: Spacing.sm, color: theme.primary }}>
              Send Test Notification
            </ThemedText>
          </Pressable>
        )}

        {/* Token Display (Dev Only) */}
        {__DEV__ && pushToken && (
          <Card style={styles.debugCard}>
            <ThemedText type="small" style={{ color: theme.textSecondary, fontFamily: 'monospace' }}>
              Token: {pushToken.substring(0, 30)}...
            </ThemedText>
          </Card>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  enableButton: { 
    marginTop: Spacing.md, 
    padding: Spacing.md, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  card: { padding: 0, marginBottom: Spacing.md },
  settingRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: Spacing.lg 
  },
  iconContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: Spacing.md 
  },
  settingInfo: { flex: 1, marginRight: Spacing.md },
  divider: { height: 1, marginHorizontal: Spacing.lg },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  debugCard: { 
    padding: Spacing.sm, 
    marginTop: Spacing.md, 
    backgroundColor: '#f5f5f5' 
  },
});