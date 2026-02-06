import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import * as ImagePicker from 'expo-image-picker';
import { getImageUrl } from "@/lib/image-url";

// ===================== TYPES =====================
interface StoreOwnerDashboard {
  store: {
    id: string;
    name: string;
    address: string;
    isActive: boolean;
  };
  today: {
    revenue: number;
    costs: number;
    netProfit: number;
    orders: number;
  };
  month: {
    revenue: number;
    costs: number;
    netProfit: number;
    orders: number;
  };
  staff: {
    total: number;
    online: number;
    pickers: number;
    drivers: number;
  };
}

interface StaffMember {
  id: string;
  userId: string;
  role: "picker" | "driver";
  status: "online" | "offline";
  user: { 
    id: string; 
    username: string; 
    phone: string | null; 
    email: string | null; 
    name: string | null 
  } | null;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: string;
  discountValue: number | null;
  minOrder: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  usedCount: number;
  showInBanner: boolean;
  image?: string | null;
  bannerImage?: string | null;
}

// ===================== HELPERS =====================
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ===================== STYLES =====================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: Spacing.xl,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  
  // Stats Grid
  statsGrid: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  statCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  statSubtext: {
    fontSize: 13,
  },
  
  // Tabs
  tabContainer: {
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  tab: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Content
  contentSection: {
    padding: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  
  // Staff Cards
  staffGrid: {
    gap: Spacing.md,
  },
  staffCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  staffRole: {
    fontSize: 13,
    marginBottom: 4,
  },
  staffActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  
  // Promotions
  promotionCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  promotionImage: {
    width: '100%',
    height: 150,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  
  // Buttons
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: '#10b981',
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
});

// ===================== STORE WITH OWNER MODAL =====================
interface StoreWithOwnerModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const StoreWithOwnerModal: React.FC<StoreWithOwnerModalProps> = ({ visible, onClose, onSubmit, isLoading }) => {
  const { theme } = useTheme();
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeLatitude, setStoreLatitude] = useState("-6.2088");
  const [storeLongitude, setStoreLongitude] = useState("106.8456");
  const [codAllowed, setCodAllowed] = useState(true);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  if (!visible) return null;

  const handleGeocode = async () => {
    if (!storeAddress.trim()) {
      Alert.alert("Error", "Please enter an address first");
      return;
    }

    setGeocoding(true);
    try {
      const response = await apiRequest("POST", "/api/admin/geocode", { address: storeAddress });
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        setStoreLatitude(String(data.latitude));
        setStoreLongitude(String(data.longitude));
        
        if (data.isDefault) {
          Alert.alert(
            "Using Default Location", 
            data.displayName + "\n\nYou can manually adjust the coordinates if needed."
          );
        } else {
          Alert.alert("Success", `Location found:\n${data.displayName || "Address geocoded"}`);
        }
      }
    } catch (error) {
      console.error("Geocode error:", error);
      Alert.alert(
        "Geocoding Unavailable", 
        "Using default Jakarta coordinates. You can manually adjust them if needed."
      );
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = () => {
    if (!storeName.trim() || !storeAddress.trim()) {
      Alert.alert("Error", "Store name and address are required");
      return;
    }

    if (!ownerName.trim() || !ownerPhone.trim()) {
      Alert.alert("Error", "Owner name and phone are required");
      return;
    }

    // Generate temporary password
    const tempPassword = `owner${Math.random().toString(36).slice(-6)}`;

    onSubmit({
      storeName: storeName.trim(),
      storeAddress: storeAddress.trim(),
      storeLatitude: parseFloat(storeLatitude) || -6.2088,
      storeLongitude: parseFloat(storeLongitude) || 106.8456,
      codAllowed,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerEmail: ownerEmail.trim() || null,
      tempPassword,
    });
  };

  return (
    <View style={styles.modalOverlay}>
      <Card style={StyleSheet.flatten([styles.modalContent, { backgroundColor: theme.backgroundDefault }])}>
        <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <ThemedText style={styles.modalTitle}>Add Store + Owner</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          {/* STORE INFORMATION */}
          <ThemedText style={{ fontSize: 16, fontWeight: '700', marginBottom: Spacing.md }}>
            Store Information
          </ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Store Name *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="e.g. ZendO North Jakarta"
              placeholderTextColor={theme.textSecondary}
              value={storeName}
              onChangeText={setStoreName}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Address *</ThemedText>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="Full store address"
              placeholderTextColor={theme.textSecondary}
              value={storeAddress}
              onChangeText={setStoreAddress}
              multiline
            />
          </View>

          <Pressable 
            style={[styles.button, styles.buttonSecondary, { borderColor: theme.secondary, marginBottom: Spacing.lg }]}
            onPress={handleGeocode}
            disabled={geocoding}
          >
            {geocoding ? (
              <ActivityIndicator size="small" color={theme.secondary} />
            ) : (
              <>
                <Feather name="map-pin" size={16} color={theme.secondary} />
                <ThemedText style={[styles.buttonText, { color: theme.secondary }]}>Auto-Find Location</ThemedText>
              </>
            )}
          </Pressable>

          {/* OWNER INFORMATION */}
          <ThemedText style={{ fontSize: 16, fontWeight: '700', marginBottom: Spacing.md, marginTop: Spacing.lg }}>
            Owner Information
          </ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Owner Name *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="Full name"
              placeholderTextColor={theme.textSecondary}
              value={ownerName}
              onChangeText={setOwnerName}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Phone Number *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="+62 812 3456 7890"
              placeholderTextColor={theme.textSecondary}
              value={ownerPhone}
              onChangeText={setOwnerPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Email (Optional)</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="owner@example.com"
              placeholderTextColor={theme.textSecondary}
              value={ownerEmail}
              onChangeText={setOwnerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Pressable
            style={[styles.button, styles.buttonPrimary, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={[styles.buttonText, { color: '#fff' }]}>
                Create Store + Owner
              </ThemedText>
            )}
          </Pressable>
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
};

// ===================== MAIN COMPONENT =====================
export default function StoreOwnerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'inventory' | 'promotions'>('overview');

  // Get dashboard data
  const { data: dashboard, isLoading, refetch, isRefetching } = useQuery<StoreOwnerDashboard>({
    queryKey: ["/api/store-owner/dashboard"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/store-owner/dashboard?userId=demo-user`);
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Get earnings history
  const { data: earningsHistory = [] } = useQuery({
    queryKey: ["/api/store-owner/earnings/history"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/store-owner/earnings/history?userId=demo-user&days=30`);
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
          {t.common.loading}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!dashboard) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={64} color={theme.textSecondary} style={styles.emptyIcon} />
          <ThemedText style={styles.emptyTitle}>No Store Found</ThemedText>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            You haven't been assigned a store yet. Contact admin for assistance.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText style={styles.headerTitle}>{dashboard.store.name}</ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {dashboard.store.address}
        </ThemedText>
      </View>

      {/* TABS */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
        <Pressable 
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <ThemedText style={[styles.tabText, { color: activeTab === 'overview' ? '#10b981' : theme.textSecondary }]}>
            Overview
          </ThemedText>
        </Pressable>
        
        <Pressable 
          style={[styles.tab, activeTab === 'staff' && styles.tabActive]}
          onPress={() => setActiveTab('staff')}
        >
          <ThemedText style={[styles.tabText, { color: activeTab === 'staff' ? '#10b981' : theme.textSecondary }]}>
            Staff
          </ThemedText>
        </Pressable>
        
        <Pressable 
          style={[styles.tab, activeTab === 'inventory' && styles.tabActive]}
          onPress={() => setActiveTab('inventory')}
        >
          <ThemedText style={[styles.tabText, { color: activeTab === 'inventory' ? '#10b981' : theme.textSecondary }]}>
            Inventory
          </ThemedText>
        </Pressable>
        
        <Pressable 
          style={[styles.tab, activeTab === 'promotions' && styles.tabActive]}
          onPress={() => setActiveTab('promotions')}
        >
          <ThemedText style={[styles.tabText, { color: activeTab === 'promotions' ? '#10b981' : theme.textSecondary }]}>
            Promotions
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={refetch} 
            tintColor="#10b981" 
          />
        }
      >
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* TODAY'S EARNINGS */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.success + '10', borderColor: theme.success + '30' }]}>
                <ThemedText style={[styles.statLabel, { color: theme.success }]}>Today's Revenue</ThemedText>
                <ThemedText style={[styles.statValue, { color: theme.success }]}>
                  {formatCurrency(dashboard.today.revenue)}
                </ThemedText>
                <ThemedText style={[styles.statSubtext, { color: theme.textSecondary }]}>
                  {dashboard.today.orders} orders
                </ThemedText>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.error + '10', borderColor: theme.error + '30' }]}>
                <ThemedText style={[styles.statLabel, { color: theme.error }]}>Today's Costs</ThemedText>
                <ThemedText style={[styles.statValue, { color: theme.error }]}>
                  {formatCurrency(dashboard.today.costs)}
                </ThemedText>
                <ThemedText style={[styles.statSubtext, { color: theme.textSecondary }]}>
                  Products + Staff + Promos
                </ThemedText>
              </View>

              <View style={[styles.statCard, { 
                backgroundColor: dashboard.today.netProfit >= 0 ? theme.primary + '10' : theme.error + '10',
                borderColor: dashboard.today.netProfit >= 0 ? theme.primary + '30' : theme.error + '30'
              }]}>
                <ThemedText style={[styles.statLabel, { 
                  color: dashboard.today.netProfit >= 0 ? theme.primary : theme.error 
                }]}>Today's Net Profit</ThemedText>
                <ThemedText style={[styles.statValue, { 
                  color: dashboard.today.netProfit >= 0 ? theme.primary : theme.error 
                }]}>
                  {formatCurrency(dashboard.today.netProfit)}
                </ThemedText>
                <ThemedText style={[styles.statSubtext, { color: theme.textSecondary }]}>
                  {dashboard.today.revenue > 0 
                    ? `${((dashboard.today.netProfit / dashboard.today.revenue) * 100).toFixed(1)}% margin`
                    : 'No orders yet'
                  }
                </ThemedText>
              </View>
            </View>

            {/* MONTHLY SUMMARY */}
            <View style={styles.contentSection}>
              <View style={styles.sectionHeader}>
                <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>
                  This Month
                </ThemedText>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md }}>
                  <View>
                    <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Revenue</ThemedText>
                    <ThemedText style={[styles.statValue, { fontSize: 24, color: theme.success }]}>
                      {formatCurrency(dashboard.month.revenue)}
                    </ThemedText>
                  </View>
                  <View>
                    <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Net Profit</ThemedText>
                    <ThemedText style={[styles.statValue, { fontSize: 24, color: dashboard.month.netProfit >= 0 ? theme.primary : theme.error }]}>
                      {formatCurrency(dashboard.month.netProfit)}
                    </ThemedText>
                  </View>
                </View>
                
                <ThemedText style={[styles.statSubtext, { color: theme.textSecondary }]}>
                  {dashboard.month.orders} orders completed
                </ThemedText>
              </View>
            </View>

            {/* STAFF SUMMARY */}
            <View style={styles.contentSection}>
              <View style={styles.sectionHeader}>
                <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>
                  Staff Overview
                </ThemedText>
              </View>
              
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={[styles.statCard, { flex: 1, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Total Staff</ThemedText>
                  <ThemedText style={[styles.statValue, { fontSize: 32 }]}>
                    {dashboard.staff.total}
                  </ThemedText>
                  <ThemedText style={[styles.statSubtext, { color: theme.success }]}>
                    {dashboard.staff.online} online
                  </ThemedText>
                </View>

                <View style={[styles.statCard, { flex: 1, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Pickers</ThemedText>
                  <ThemedText style={[styles.statValue, { fontSize: 32 }]}>
                    {dashboard.staff.pickers}
                  </ThemedText>
                </View>

                <View style={[styles.statCard, { flex: 1, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Drivers</ThemedText>
                  <ThemedText style={[styles.statValue, { fontSize: 32 }]}>
                    {dashboard.staff.drivers}
                  </ThemedText>
                </View>
              </View>
            </View>
          </>
        )}

        {/* OTHER TABS - Placeholder for now */}
        {activeTab !== 'overview' && (
          <View style={styles.emptyState}>
            <Feather name="box" size={64} color={theme.textSecondary} style={styles.emptyIcon} />
            <ThemedText style={styles.emptyTitle}>Coming Soon</ThemedText>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              {activeTab === 'staff' && 'Manage your staff members'}
              {activeTab === 'inventory' && 'View and manage your inventory'}
              {activeTab === 'promotions' && 'Create store-specific promotions'}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}