import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
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
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          },
        },
      ]
    );
  };

  const getInitial = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "G";
  };

  const getDisplayName = () => {
    if (user?.username) {
      return user.username;
    }
    return "Guest";
  };

  const getPhoneNumber = () => {
    if (user?.phone) {
      return user.phone;
    }
    return "No phone number";
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
          <ThemedText type="h2">Account</ThemedText>
        </View>
        
        {isAuthenticated ? (
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
        ) : (
          <Card style={styles.profileCard}>
            <Pressable 
              style={styles.loginPrompt}
              onPress={() => navigation.navigate("Login")}
            >
              <View style={[styles.avatar, { backgroundColor: theme.textSecondary }]}>
                <Feather name="user" size={24} color={theme.buttonText} />
              </View>
              <View style={styles.profileInfo}>
                <ThemedText type="h3">Sign In</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Tap to sign in or create an account
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
          </Card>
        )}
        
        <View style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            My Account
          </ThemedText>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="map-pin"
              label="Saved Addresses"
              onPress={() => navigation.navigate("EditAddress", {})}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="credit-card"
              label="Payment Methods"
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="tag"
              label="My Vouchers"
              onPress={() => navigation.navigate("Vouchers")}
              showBadge
            />
          </Card>
        </View>
        
        <View style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Support
          </ThemedText>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="help-circle"
              label="Help Center"
              onPress={() => navigation.navigate("HelpCenter")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="message-circle"
              label="Chat Support"
              onPress={() => {}}
            />
          </Card>
        </View>
        
        <View style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Settings
          </ThemedText>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="bell"
              label="Notifications"
              onPress={() => navigation.navigate("Notifications")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="globe"
              label="Language"
              onPress={() => navigation.navigate("Language")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <MenuItem
              icon="info"
              label="About"
              onPress={() => navigation.navigate("About")}
            />
          </Card>
        </View>
        
        {user?.role === "admin" || user?.role === "customer" ? (
          <View style={styles.section}>
            <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Admin
            </ThemedText>
            <Card style={styles.menuCard}>
              <MenuItem
                icon="bar-chart-2"
                label="Store Dashboard"
                onPress={() => navigation.navigate("AdminDashboard")}
              />
            </Card>
          </View>
        ) : null}
        
        {isAuthenticated ? (
          <Pressable 
            style={[styles.logoutButton, { borderColor: theme.error }]}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={20} color={theme.error} />
            <ThemedText type="body" style={{ color: theme.error, fontWeight: "500" }}>
              Log Out
            </ThemedText>
          </Pressable>
        ) : null}
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
