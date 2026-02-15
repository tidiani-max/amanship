import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const BRAND_PURPLE = "#6338f2";

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  showBadge?: boolean;
  color?: string;
}

function MenuItem({ icon, label, onPress, showBadge, color }: MenuItemProps) {
  const iconColor = color || BRAND_PURPLE;
  
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.menuIconContainer, { backgroundColor: iconColor + '10' }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <ThemedText style={styles.menuLabel}>{label}</ThemedText>
      <View style={styles.menuRight}>
        {showBadge && (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>2</ThemedText>
          </View>
        )}
        <Feather name="chevron-right" size={18} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => await logout() }
    ]);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#F8F9FE' }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* PREMIUM HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>

          <View style={styles.profileContainer}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>
                  {user?.username?.charAt(0).toUpperCase() || "G"}
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.editBadge}>
                <Feather name="camera" size={12} color="white" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileMeta}>
              <ThemedText style={styles.userName}>{user?.username || "Guest User"}</ThemedText>
              <ThemedText style={styles.userPhone}>{user?.phone || user?.email || "No contact info"}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* SECTION: WALLET & REWARDS */}
          

          {/* SECTION: ACCOUNT SETTINGS */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{t.account.myAccount.toUpperCase()}</ThemedText>
            <Card style={styles.menuCard}>
              <MenuItem icon="map-pin" label={t.account.savedAddresses} onPress={() => navigation.navigate("EditAddress")} />
              <MenuItem icon="bell" label={t.account.notifications} onPress={() => navigation.navigate("Notifications")} />
              <MenuItem icon="globe" label={t.account.language} onPress={() => navigation.navigate("Language")} />
            </Card>
          </View>

          {/* SECTION: WORK (Conditional) */}
          {user?.role && ['driver', 'picker', 'owner', 'admin'].includes(user.role) && (
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: BRAND_PURPLE }]}>WORK MANAGEMENT</ThemedText>
              <Card style={styles.menuCard}>
                {user.role === 'driver' && (
                  <MenuItem icon="truck" label="Driver Dashboard" onPress={() => navigation.navigate("DriverDashboard")} />
                )}
                {user.role === 'picker' && (
                  <MenuItem icon="package" label="Picker Dashboard" onPress={() => navigation.navigate("PickerDashboard")} />
                )}
                {(user.role === 'owner' || user.role === 'admin') && (
                   <MenuItem icon="home" label="Store Management" onPress={() => navigation.navigate("OwnerDashboard")} />
                )}
              </Card>
            </View>
          )}

          {/* SECTION: SUPPORT */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>SUPPORT</ThemedText>
            <Card style={styles.menuCard}>
              <MenuItem icon="help-circle" label={t.account.helpCenter} onPress={() => navigation.navigate("HelpCenter")} />
              {/* <MenuItem icon="info" label={t.account.about} onPress={() => navigation.navigate("About")} /> */}
            </Card>
          </View>

          {isAuthenticated && (
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#ef4444" />
              <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 70, height: 70, borderRadius: 24,
    backgroundColor: BRAND_PURPLE + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: BRAND_PURPLE },
  editBadge: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: BRAND_PURPLE, width: 24, height: 24,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'white'
  },
  profileMeta: { marginLeft: 16 },
  userName: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  userPhone: { fontSize: 13, color: '#64748b', marginTop: 2 },
  content: { padding: 20 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', marginBottom: 12, marginLeft: 4, letterSpacing: 1 },
  menuCard: { padding: 4, borderRadius: 24, backgroundColor: 'white' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  menuIconContainer: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, marginLeft: 14, fontSize: 15, fontWeight: '600', color: '#334155' },
  menuRight: { flexDirection: 'row', alignItems: 'center' },
  badge: { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginRight: 8 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, marginTop: 10, gap: 8,
    backgroundColor: '#fee2e2', borderRadius: 18,
  },
  logoutText: { color: '#ef4444', fontWeight: '800', fontSize: 15 }
});