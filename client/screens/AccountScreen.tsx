import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  showBadge?: boolean;
}

function MenuItem({ icon, label, onPress, showBadge }: MenuItemProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconContainer, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name={icon as any} size={20} color={theme.text} />
      </View>
      <ThemedText type="body" style={styles.menuLabel}>
        {label}
      </ThemedText>
      <View style={styles.menuRight}>
        {showBadge ? (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <ThemedText type="small" style={{ color: theme.buttonText, fontSize: 10 }}>
              2
            </ThemedText>
          </View>
        ) : null}
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useLanguage();

  const getInitial = () => {
    return "G";
  };

  const getDisplayName = () => {
    return "Guest";
  };

  const getPhoneNumber = () => {
    return t.account.noPhone;
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="h2">{t.account.title}</ThemedText>
        </View>
        
        <Card style={styles.profileCard}>
          <View style={styles.profileContent}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <ThemedText type="h2" style={{ color: theme.buttonText }}>
                {getInitial()}
              </ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText type="h3">{getDisplayName()}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {getPhoneNumber()}
              </ThemedText>
            </View>
            <Pressable style={styles.editButton}>
              <Feather name="edit-2" size={18} color={theme.primary} />
            </Pressable>
          </View>
        </Card>
        
        <View style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t.account.myAccount.toUpperCase()}
          </ThemedText>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="map-pin"
              label={t.account.savedAddresses}
              onPress={() => navigation.navigate("EditAddress", {})}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="credit-card"
              label={t.account.paymentMethods}
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="tag"
              label={t.account.myVouchers}
              onPress={() => navigation.navigate("Vouchers")}
              showBadge
            />
          </Card>
        </View>
        
        <View style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t.account.support.toUpperCase()}
          </ThemedText>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="help-circle"
              label={t.account.helpCenter}
              onPress={() => navigation.navigate("HelpCenter")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="message-circle"
              label={t.account.chatSupport}
              onPress={() => {}}
            />
          </Card>
        </View>
        
        <View style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t.account.settings.toUpperCase()}
          </ThemedText>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="bell"
              label={t.account.notifications}
              onPress={() => navigation.navigate("Notifications")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="globe"
              label={t.account.language}
              onPress={() => navigation.navigate("Language")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="info"
              label={t.account.about}
              onPress={() => navigation.navigate("About")}
            />
          </Card>
        </View>
        
        <View style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t.account.admin.toUpperCase()}
          </ThemedText>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="bar-chart-2"
              label={t.account.storeDashboard}
              onPress={() => navigation.navigate("AdminDashboard")}
            />
          </Card>
        </View>
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
  header: {
    marginBottom: Spacing.lg,
  },
  profileCard: {
    marginBottom: Spacing.xl,
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  editButton: {
    padding: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginLeft: 60,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.lg,
  },
});
