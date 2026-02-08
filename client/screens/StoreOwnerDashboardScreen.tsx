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
import { useAuth } from "@/context/AuthContext";

// ===================== TYPES =====================
interface StoreOwnerDashboard {
  store: {
    id: string;
    name: string;
    address: string;
    isActive: boolean;
  } | null;
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

interface AutomationAlert {
  type: 'EXPIRING_SOON' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'CRITICAL_FRESH';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  productId: string;
  productName: string;
  message: string;
  daysUntilExpiry?: number;
  stockCount?: number;
  recommendedAction: string;
}

interface AlertsResponse {
  storeId: string;
  totalAlerts: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  byType: {
    expiringSoon: number;
    criticalFresh: number;
    outOfStock: number;
    lowStock: number;
  };
  alerts: AutomationAlert[];
}

interface Product {
  id: string;
  name: string;
  brand: string;
  costPrice: number;
  price: number;
  margin: number;
  stockCount: number;
  location: string | null;
  isAvailable: boolean;
  isFresh: boolean;
  expiryDate: string | null;
  requiresRefrigeration: boolean;
  requiresFreezer: boolean;
  image: string | null;
  freshnessPriority: number;
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

const getDaysUntilExpiry = (expiryDate: string): number => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getUrgencyColor = (priority: number, theme: any) => {
  if (priority >= 95) return '#dc2626'; // Critical (0-5 days)
  if (priority >= 85) return '#f59e0b'; // Urgent (6-15 days)
  if (priority >= 70) return '#fbbf24'; // Medium (16-30 days)
  return theme.success;
};

const getUrgencyLabel = (priority: number) => {
  if (priority >= 95) return '🚨 CRITICAL';
  if (priority >= 85) return '⚠️ URGENT';
  if (priority >= 70) return '🟡 MEDIUM';
  return '🟢 LOW';
};

const getAlertIcon = (type: string) => {
  switch(type) {
    case 'CRITICAL_FRESH': return '🚨';
    case 'EXPIRING_SOON': return '⏰';
    case 'OUT_OF_STOCK': return '📦';
    case 'LOW_STOCK': return '📉';
    default: return '⚠️';
  }
};

const getAlertColor = (priority: string) => {
  switch(priority) {
    case 'HIGH': return '#dc2626';
    case 'MEDIUM': return '#f59e0b';
    case 'LOW': return '#fbbf24';
    default: return '#6b7280';
  }
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
  
  // ✅ NEW: Automation Alert Card
  automationAlertCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.md,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  alertBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    minWidth: 60,
    alignItems: 'center',
  },
  
  // Fresh Products Alert
  freshProductsAlert: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.lg,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  alertSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  
  // Product Cards
  productCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
  },
  productInfo: {
    flex: 1,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
  },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
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
  buttonWarning: {
    backgroundColor: '#f59e0b',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
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
});

// ===================== MAIN COMPONENT =====================
export default function StoreOwnerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'fresh' | 'products'>('overview');

  const userId = user?.id;

  // Get dashboard data
  const { data: dashboard, isLoading, refetch, isRefetching } = useQuery<StoreOwnerDashboard>({
    queryKey: ["/api/store-owner/dashboard", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User not logged in");
      
      const response = await apiRequest(
        "GET",
        `/api/store-owner/dashboard?userId=${userId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard");
      }

      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 30000,
  });

  // ✅ NEW: Get automation alerts
  const { data: alertsData } = useQuery<AlertsResponse>({
    queryKey: ["/api/automation/alerts", dashboard?.store?.id, userId],
    queryFn: async () => {
      if (!dashboard?.store?.id || !userId) {
        throw new Error("Store or user not available");
      }
      
      const response = await apiRequest(
        "GET",
        `/api/automation/alerts/${dashboard.store.id}?userId=${userId}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch alerts");
      }
      
      return response.json();
    },
    enabled: !!dashboard?.store?.id && !!userId,
    refetchInterval: 60000, // Refresh every minute
  });

  // Get fresh products
  const { data: freshProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/store-owner/products/fresh", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await apiRequest(
        "GET",
        `/api/store-owner/products/fresh?userId=${userId}`
      );
      
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
  });

  // Get expiring soon products (next 7 days)
  const { data: expiringProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/store-owner/products/expiring-soon", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await apiRequest(
        "GET",
        `/api/store-owner/products/expiring-soon?userId=${userId}&days=7`
      );
      
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
  });

  // Get all products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/store-owner/products", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await apiRequest(
        "GET",
        `/api/store-owner/products?userId=${userId}`
      );
      
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
  });

  // ✅ NEW: Manual scan trigger
  const scanStoreMutation = useMutation({
    mutationFn: async () => {
      if (!dashboard?.store?.id || !userId) {
        throw new Error("Store or user not available");
      }

      const response = await apiRequest("POST", "/api/automation/scan-store", {
        userId,
        storeId: dashboard.store.id,
      });

      if (!response.ok) {
        throw new Error("Scan failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store-owner/products/fresh"] });
      Alert.alert("✅ Scan Complete", "Product scan completed successfully!");
    },
    onError: (error) => {
      Alert.alert("❌ Scan Failed", error.message);
    },
  });

  if (isLoading || !userId) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
          {t.common.loading}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!dashboard || !dashboard.store) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={64} color={theme.textSecondary} style={styles.emptyIcon} />
          <ThemedText style={styles.emptyTitle}>No Store Assigned</ThemedText>
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            You haven't been assigned a store yet. Contact admin to set up your store.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Calculate freshness stats
  const criticalProducts = freshProducts.filter(p => p.freshnessPriority >= 95);
  const urgentProducts = freshProducts.filter(p => p.freshnessPriority >= 85 && p.freshnessPriority < 95);
  
  // Get high priority alerts
  const highPriorityAlerts = alertsData?.alerts.filter(a => a.priority === 'HIGH') || [];

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText style={styles.headerTitle}>{dashboard.store.name}</ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {dashboard.store.address}
        </ThemedText>
        
        {/* ✅ NEW: Manual Scan Button */}
        <Pressable 
          style={[styles.button, styles.buttonPrimary, { marginTop: Spacing.md }]}
          onPress={() => scanStoreMutation.mutate()}
          disabled={scanStoreMutation.isPending}
        >
          {scanStoreMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Feather name="refresh-cw" size={16} color="white" />
          )}
          <ThemedText style={[styles.buttonText, { color: 'white' }]}>
            {scanStoreMutation.isPending ? 'Scanning...' : 'Scan Products'}
          </ThemedText>
        </Pressable>
      </View>

      {/* TABS */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
        {/* Around line 537-558 */}
<Pressable 
  style={[styles.tab, activeTab === 'alerts' && styles.tabActive]}
  onPress={() => setActiveTab('alerts')}
>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <ThemedText style={[styles.tabText, { color: activeTab === 'alerts' ? '#10b981' : theme.textSecondary }]}>
      🚨 Alerts
    </ThemedText>
    {alertsData && alertsData.highPriority > 0 && (
      <View style={{ 
        backgroundColor: '#dc2626', 
        borderRadius: 10, 
        minWidth: 20, 
        height: 20, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingHorizontal: 6,
      }}>
        <ThemedText style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
          {alertsData.highPriority}
        </ThemedText>
      </View>
    )}
  </View>
</Pressable>
        
        {/* ✅ NEW: Alerts Tab */}
        <Pressable 
          style={[styles.tab, activeTab === 'alerts' && styles.tabActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThemedText style={[styles.tabText, { color: activeTab === 'alerts' ? '#10b981' : theme.textSecondary }]}>
              🚨 Alerts
            </ThemedText>
            {alertsData && alertsData.highPriority > 0 && (
              <View style={{ 
                backgroundColor: '#dc2626', 
                borderRadius: 10, 
                minWidth: 20, 
                height: 20, 
                justifyContent: 'center', 
                alignItems: 'center',
                paddingHorizontal: 6,
              }}>
                <ThemedText style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                  {alertsData.highPriority}
                </ThemedText>
              </View>
            )}
          </View>
        </Pressable>
        
        <Pressable 
          style={[styles.tab, activeTab === 'fresh' && styles.tabActive]}
          onPress={() => setActiveTab('fresh')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThemedText style={[styles.tabText, { color: activeTab === 'fresh' ? '#10b981' : theme.textSecondary }]}>
              🥬 Fresh
            </ThemedText>
            {expiringProducts.length > 0 && (
              <View style={{ 
                backgroundColor: '#dc2626', 
                borderRadius: 10, 
                minWidth: 20, 
                height: 20, 
                justifyContent: 'center', 
                alignItems: 'center',
                paddingHorizontal: 6,
              }}>
                <ThemedText style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                  {expiringProducts.length}
                </ThemedText>
              </View>
            )}
          </View>
        </Pressable>
        
        <Pressable 
          style={[styles.tab, activeTab === 'products' && styles.tabActive]}
          onPress={() => setActiveTab('products')}
        >
          <ThemedText style={[styles.tabText, { color: activeTab === 'products' ? '#10b981' : theme.textSecondary }]}>
            Products ({products.length})
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
        {/* ✅ NEW: ALERTS TAB */}
        {activeTab === 'alerts' && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>
                Smart Alerts ({alertsData?.totalAlerts || 0})
              </ThemedText>
            </View>

            {/* Alert Summary */}
            {alertsData && (
              <View style={[
                styles.automationAlertCard,
                { 
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                }
              ]}>
                <ThemedText style={{ fontSize: 16, fontWeight: '700', marginBottom: Spacing.md }}>
                  📊 Alert Summary
                </ThemedText>
                
                <View style={[styles.alertRow, { borderBottomColor: theme.border }]}>
                  <ThemedText>🚨 Critical Fresh</ThemedText>
                  <View style={[styles.alertBadge, { backgroundColor: '#dc2626' }]}>
                    <ThemedText style={{ color: 'white', fontWeight: '700' }}>
                      {alertsData.byType.criticalFresh}
                    </ThemedText>
                  </View>
                </View>
                
                <View style={[styles.alertRow, { borderBottomColor: theme.border }]}>
                  <ThemedText>⏰ Expiring Soon</ThemedText>
                  <View style={[styles.alertBadge, { backgroundColor: '#f59e0b' }]}>
                    <ThemedText style={{ color: 'white', fontWeight: '700' }}>
                      {alertsData.byType.expiringSoon}
                    </ThemedText>
                  </View>
                </View>
                
                <View style={[styles.alertRow, { borderBottomColor: theme.border }]}>
                  <ThemedText>📦 Out of Stock</ThemedText>
                  <View style={[styles.alertBadge, { backgroundColor: '#dc2626' }]}>
                    <ThemedText style={{ color: 'white', fontWeight: '700' }}>
                      {alertsData.byType.outOfStock}
                    </ThemedText>
                  </View>
                </View>
                
                <View style={[styles.alertRow, { borderBottomWidth: 0 }]}>
                  <ThemedText>📉 Low Stock</ThemedText>
                  <View style={[styles.alertBadge, { backgroundColor: '#fbbf24' }]}>
                    <ThemedText style={{ color: 'white', fontWeight: '700' }}>
                      {alertsData.byType.lowStock}
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}

            {/* Individual Alerts */}
            {alertsData && alertsData.alerts.length > 0 ? (
              <>
                <ThemedText style={{ fontSize: 16, fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.md }}>
                  All Alerts
                </ThemedText>
                {alertsData.alerts.map((alert, index) => (
                  <View 
                    key={`${alert.productId}-${index}`}
                    style={[
                      styles.productCard,
                      { 
                        borderColor: getAlertColor(alert.priority),
                        borderWidth: 2,
                        backgroundColor: alert.priority === 'HIGH' ? '#fee2e2' : theme.backgroundSecondary,
                      }
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={[styles.urgencyBadge, { backgroundColor: getAlertColor(alert.priority) }]}>
                        <ThemedText style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>
                          {getAlertIcon(alert.type)} {alert.priority}
                        </ThemedText>
                      </View>
                      
                      <ThemedText style={{ fontSize: 16, fontWeight: '700', marginTop: Spacing.xs }}>
                        {alert.productName}
                      </ThemedText>
                      
                      <ThemedText style={{ fontSize: 14, marginTop: Spacing.xs }}>
                        {alert.message}
                      </ThemedText>
                      
                      <View style={[
                        styles.expiryWarning, 
                        { backgroundColor: alert.priority === 'HIGH' ? '#fecaca' : theme.backgroundSecondary }
                      ]}>
                        <Feather name="info" size={14} color={getAlertColor(alert.priority)} />
                        <ThemedText style={{ fontSize: 13, color: getAlertColor(alert.priority), flex: 1 }}>
                          {alert.recommendedAction}
                        </ThemedText>
                      </View>
                      
                      {alert.daysUntilExpiry !== undefined && (
                        <ThemedText style={{ fontSize: 12, marginTop: Spacing.xs, color: theme.textSecondary }}>
                          ⏰ Expires in {alert.daysUntilExpiry} days
                        </ThemedText>
                      )}
                      
                      {alert.stockCount !== undefined && (
                        <ThemedText style={{ fontSize: 12, marginTop: Spacing.xs, color: theme.textSecondary }}>
                          📦 Stock: {alert.stockCount} units
                        </ThemedText>
                      )}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="check-circle" size={64} color={theme.success} />
                <ThemedText style={styles.emptyTitle}>All Clear! ✅</ThemedText>
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No alerts at this time. Great job!
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* HIGH PRIORITY ALERTS BANNER */}
            {highPriorityAlerts.length > 0 && (
              <View style={styles.contentSection}>
                <View style={[
                  styles.freshProductsAlert, 
                  { 
                    backgroundColor: '#fee2e2', 
                    borderColor: '#dc2626' 
                  }
                ]}>
                  <View style={styles.alertHeader}>
                    <View style={[styles.alertIcon, { backgroundColor: '#dc2626' }]}>
                      <Feather name="alert-triangle" size={24} color="white" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.alertTitle, { color: '#dc2626' }]}>
                        {highPriorityAlerts.length} Urgent Alerts!
                      </ThemedText>
                      <ThemedText style={[styles.alertSubtitle, { color: '#991b1b' }]}>
                        Immediate attention required
                      </ThemedText>
                    </View>
                  </View>
                  
                  <Pressable 
                    style={[styles.button, styles.buttonWarning]}
                    onPress={() => setActiveTab('alerts')}
                  >
                    <Feather name="eye" size={16} color="white" />
                    <ThemedText style={[styles.buttonText, { color: 'white' }]}>
                      View All Alerts
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}

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

            {/* QUICK STATS */}
            <View style={styles.contentSection}>
              <ThemedText style={{ fontSize: 18, fontWeight: '700', marginBottom: Spacing.lg }}>
                Quick Stats
              </ThemedText>
              
              <View style={{ gap: Spacing.md }}>
                {/* ✅ NEW: Automation Stats */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText>🚨 High Priority Alerts</ThemedText>
                  <ThemedText style={{ fontWeight: '700', fontSize: 18, color: '#dc2626' }}>
                    {alertsData?.highPriority || 0}
                  </ThemedText>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText>📦 Total Alerts</ThemedText>
                  <ThemedText style={{ fontWeight: '700', fontSize: 18 }}>
                    {alertsData?.totalAlerts || 0}
                  </ThemedText>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText>🥬 Fresh Products</ThemedText>
                  <ThemedText style={{ fontWeight: '700', fontSize: 18 }}>
                    {freshProducts.length}
                  </ThemedText>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText>🚨 Critical (0-5 days)</ThemedText>
                  <ThemedText style={{ fontWeight: '700', fontSize: 18, color: '#dc2626' }}>
                    {criticalProducts.length}
                  </ThemedText>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText>⚠️ Urgent (6-15 days)</ThemedText>
                  <ThemedText style={{ fontWeight: '700', fontSize: 18, color: '#f59e0b' }}>
                    {urgentProducts.length}
                  </ThemedText>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText>👥 Staff Online</ThemedText>
                  <ThemedText style={{ fontWeight: '700', fontSize: 18, color: theme.success }}>
                    {dashboard.staff.online} / {dashboard.staff.total}
                  </ThemedText>
                </View>
              </View>
            </View>
          </>
        )}

        {/* FRESH PRODUCTS TAB - Keep your existing implementation */}
        {activeTab === 'fresh' && (
          <View style={styles.contentSection}>
            {/* Your existing fresh products code */}
            <View style={styles.sectionHeader}>
              <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>
                Fresh Products Management
              </ThemedText>
            </View>
            
            {/* ... rest of your existing fresh products implementation ... */}
          </View>
        )}

        {/* PRODUCTS TAB - Keep your existing implementation */}
        {activeTab === 'products' && (
          <View style={styles.contentSection}>
            {/* Your existing products code */}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}