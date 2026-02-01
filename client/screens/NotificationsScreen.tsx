import React, { useState, useEffect } from "react";
import { View, StyleSheet, Switch, Alert, Platform, ScrollView, Pressable, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing } from "@/constants/theme";
import { useNotifications } from "../hooks/useNotification";

const BRAND_PURPLE = "#6338f2";
const NOTIFICATIONS_KEY = "@ZendO_notifications";

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
      <View style={[styles.iconCircle, { backgroundColor: BRAND_PURPLE + '10' }]}>
        <Feather name={icon as any} size={18} color={BRAND_PURPLE} />
      </View>
      <View style={styles.settingInfo}>
        <ThemedText style={styles.settingTitle}>{title}</ThemedText>
        <ThemedText style={styles.settingDescription}>{description}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e2e8f0', true: BRAND_PURPLE + '50' }}
        thumbColor={value ? BRAND_PURPLE : '#f8fafc'}
        ios_backgroundColor="#e2e8f0"
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { registerForPushNotifications } = useNotifications();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [permissionStatus, setPermissionStatus] = useState<string>("unknown");

  useEffect(() => {
    loadSettings();
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  const loadSettings = async () => {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) setSettings(JSON.parse(stored));
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    if (value && permissionStatus !== 'granted') {
      Alert.alert("Enable Access", "Please allow notifications in settings first.", [
        { text: "Cancel" },
        { text: "Enable", onPress: async () => {
            await registerForPushNotifications();
            await checkPermissionStatus();
          }
        }
      ]);
      return;
    }
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(newSettings));
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#F8F9FE' }]}>
      {/* MODERN HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={28} color="#1e293b" />
        </Pressable>
        <ThemedText style={styles.headerTitleText}>Notification Settings</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}>
        
        {/* STATUS CARD */}
        <Card 
  style={StyleSheet.flatten([
    styles.statusCard, 
    { borderColor: permissionStatus === 'granted' ? '#10b98120' : '#f59e0b20' }
  ])}
>
          <View style={styles.statusIconContainer}>
             <MaterialCommunityIcons 
                name={permissionStatus === 'granted' ? "bell-check" : "bell-off-outline"} 
                size={32} 
                color={permissionStatus === 'granted' ? "#10b981" : "#f59e0b"} 
             />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.statusTitle}>
                {permissionStatus === 'granted' ? "Push Notifications On" : "Notifications are Off"}
            </ThemedText>
            <ThemedText style={styles.statusSub}>
                {permissionStatus === 'granted' 
                  ? "You're getting all order & chat updates." 
                  : "Enable access to get real-time delivery alerts."}
            </ThemedText>
          </View>
          {permissionStatus !== 'granted' && (
            <Pressable style={styles.miniEnableBtn} onPress={() => registerForPushNotifications()}>
              <ThemedText style={styles.miniEnableText}>Fix</ThemedText>
            </Pressable>
          )}
        </Card>

        <ThemedText style={styles.sectionLabel}>PREFERENCES</ThemedText>
        
        <Card style={styles.settingsCard}>
          {user?.role === 'customer' && (
            <SettingRow
              icon="package"
              title="Order Updates"
              description="Status changes and delivery progress"
              value={settings.orderUpdates}
              onValueChange={(v) => updateSetting("orderUpdates", v)}
            />
          )}

          <SettingRow
            icon="message-circle"
            title="Chat Messages"
            description="Alerts for new messages from your driver"
            value={settings.chatMessages}
            onValueChange={(v) => updateSetting("chatMessages", v)}
          />

          <SettingRow
            icon="truck"
            title="Delivery Alerts"
            description={user?.role === 'driver' ? "New delivery opportunities" : "Real-time location updates"}
            value={settings.deliveryAlerts}
            onValueChange={(v) => updateSetting("deliveryAlerts", v)}
          />

          {user?.role === 'customer' && (
            <SettingRow
              icon="percent"
              title="Promotions"
              description="Special offers and exclusive discounts"
              value={settings.promotions}
              onValueChange={(v) => updateSetting("promotions", v)}
            />
          )}
        </Card>

        {/* INFO PILL */}
        <View style={[styles.infoPill, { backgroundColor: BRAND_PURPLE + '08' }]}>
           <Feather name="info" size={14} color={BRAND_PURPLE} />
           <ThemedText style={styles.infoPillText}>
              System alerts regarding account security cannot be disabled.
           </ThemedText>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  headerTitleText: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  scrollView: { flex: 1 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 24,
    marginBottom: 25,
    borderWidth: 1,
  },
  statusIconContainer: { marginRight: 15 },
  statusTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  statusSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  miniEnableBtn: { backgroundColor: BRAND_PURPLE, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  miniEnableText: { color: 'white', fontWeight: '800', fontSize: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#94a3b8', marginBottom: 12, marginLeft: 5, letterSpacing: 1 },
  settingsCard: { padding: 5, borderRadius: 28, backgroundColor: 'white' },
  settingRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 15,
  },
  iconCircle: { 
    width: 40, height: 40, borderRadius: 14, 
    alignItems: "center", justifyContent: "center", marginRight: 15 
  },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  settingDescription: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  infoPill: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 12, borderRadius: 15, marginTop: 20, 
    gap: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: BRAND_PURPLE + '30' 
  },
  infoPillText: { fontSize: 11, color: BRAND_PURPLE, fontWeight: '600', flex: 1 }
});