import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
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

// ===================== LOSS PREVENTION TYPES =====================
interface LossSummary {
  totalAtRisk: number;
  freshAtRisk: number;
  packagedAtRisk: number;
  savedToday: number;
  pendingSuggestionsCount: number;
  criticalAlertsCount: number;
}

interface ExpirySuggestion {
  id: string;
  productId: string;
  productName: string;
  type: 'fresh_discount' | 'packaged_discount' | 'overstock';
  suggestedDiscountPercent: number;
  currentPrice: number;
  suggestedPrice: number;
  rupiahAtRisk: number;
  hoursUntilExpiry?: number;
  daysUntilExpiry?: number;
  status: 'pending' | 'approved' | 'ignored';
}

interface BundleSuggestionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface BundleSuggestion {
  id: string;
  suggestedName: string;
  items: BundleSuggestionItem[];
  normalTotal: number;
  suggestedBundlePrice: number;
  discountPercent: number;
  rupiahAtRisk: number;
  possibleBundleCount: number;
  status: 'pending' | 'approved' | 'ignored' | 'price_adjusted';
}

interface DeadStockAlert {
  id: string;
  productName: string;
  daysSinceLastSale: number;
  currentStock: number;
  rupiahAtRisk: number;
  severity: 'yellow' | 'red' | 'critical';
  hasExpiryRisk: boolean;
}

const BRAND_PURPLE = "#6338f2";

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
  if (priority >= 95) return '#dc2626';
  if (priority >= 85) return '#f59e0b';
  if (priority >= 70) return '#fbbf24';
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
  
  contentSection: {
    padding: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  
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


// ===================== LOSS PREVENTION STYLES =====================
const lossStyles = StyleSheet.create({
  // ── Summary card ──────────────────────────────────────────────
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: Spacing.md,
    color: '#1e293b',
  },
  summaryBigNumber: {
    fontSize: 32,
    fontWeight: '900' as const,
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  breakdownItem: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#f8fafc',
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600' as const,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  savedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#f0fdf4',
    marginTop: Spacing.sm,
  },
  savedText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600' as const,
    flex: 1,
  },
  // ── Section headers ────────────────────────────────────────────
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#1e293b',
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  countBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800' as const,
  },
  // ── Suggestion cards ───────────────────────────────────────────
  suggestionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.md,
    overflow: 'hidden' as const,
    backgroundColor: 'white',
  },
  cardBody: {
    padding: Spacing.lg,
  },
  urgencyStrip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
  },
  urgencyStripText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900' as const,
    letterSpacing: 0.5,
  },
  typeBadgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 6,
    marginTop: 8,
  },
  freshBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freshBadgeText: {
    color: '#16a34a',
    fontSize: 10,
    fontWeight: '800' as const,
  },
  packagedBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  packagedBadgeText: {
    color: '#1d4ed8',
    fontSize: 10,
    fontWeight: '800' as const,
  },
  overstockBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  overstockBadgeText: {
    color: '#d97706',
    fontSize: 10,
    fontWeight: '800' as const,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
    color: '#1e293b',
  },
  riskLine: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  priceLine: {
    fontSize: 13,
    color: '#475569',
    marginBottom: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row' as const,
    gap: Spacing.sm,
  },
  approveBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center' as const,
  },
  ignoreBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center' as const,
    backgroundColor: '#f1f5f9',
  },
  approveBtnText: {
    color: 'white',
    fontWeight: '800' as const,
    fontSize: 13,
  },
  ignoreBtnText: {
    color: '#94a3b8',
    fontWeight: '600' as const,
    fontSize: 13,
  },
  // ── Bundle cards ───────────────────────────────────────────────
  bundleItemLine: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 3,
  },
  bundlePriceRow: {
    marginTop: 10,
    marginBottom: 4,
  },
  normalPrice: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 2,
  },
  bundlePrice: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#16a34a',
    marginBottom: Spacing.sm,
  },
  // ── Dead stock cards ───────────────────────────────────────────
  deadStockCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: '#fca5a5',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: '#fff5f5',
  },
  deadStockName: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 4,
    color: '#1e293b',
  },
  deadStockInfo: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  deadStockRisk: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#dc2626',
    marginTop: 4,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start' as const,
    marginBottom: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: 'white',
  },
});

// ===================== MAIN COMPONENT =====================
export default function StoreOwnerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'fresh' | 'products' | 'loss'>('overview');

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
    refetchInterval: 60000,
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

  // Get expiring soon products
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

  // ===================== LOSS PREVENTION QUERIES =====================
  const { data: lossSummary } = useQuery<LossSummary>({
    queryKey: ['/api/store-owner/loss-summary'],
    refetchInterval: 60000,
    enabled: !!userId,
  });

  const { data: expirySuggestions = [] } = useQuery<ExpirySuggestion[]>({
    queryKey: ['/api/store-owner/expiry-suggestions'],
    enabled: !!userId,
    refetchInterval: 120000,
  });

  const { data: bundleSuggestions = [] } = useQuery<BundleSuggestion[]>({
    queryKey: ['/api/store-owner/bundle-suggestions'],
    enabled: !!userId,
    refetchInterval: 120000,
  });

  const { data: deadStockAlerts = [] } = useQuery<DeadStockAlert[]>({
    queryKey: ['/api/store-owner/dead-stock-alerts'],
    enabled: !!userId,
    refetchInterval: 120000,
  });

  // ===================== LOSS PREVENTION MUTATIONS =====================
  const approveSuggestionMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/store-owner/approve-suggestion/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/store-owner/expiry-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/store-owner/loss-summary'] });
      Alert.alert('✅ Diskon Diaktifkan!', 'Diskon berhasil diaktifkan. Pelanggan terdekat akan mendapat notifikasi.');
    },
    onError: () => Alert.alert('Error', 'Gagal mengaktifkan diskon.'),
  });

  const ignoreSuggestionMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/store-owner/ignore-suggestion/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/store-owner/expiry-suggestions'] }),
  });

  const approveBundleMutation = useMutation({
    mutationFn: ({ id, finalPrice }: { id: string; finalPrice?: number }) =>
      apiRequest('POST', `/api/store-owner/approve-bundle/${id}`, { finalPrice }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/store-owner/bundle-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/store-owner/loss-summary'] });
      Alert.alert('🎁 Bundle Aktif!', 'Paket bundle berhasil diaktifkan. Pelanggan terdekat akan mendapat notifikasi.');
    },
    onError: () => Alert.alert('Error', 'Gagal mengaktifkan bundle.'),
  });

  const ignoreBundleMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/store-owner/ignore-bundle/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/store-owner/bundle-suggestions'] }),
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

  const criticalProducts = freshProducts.filter(p => p.freshnessPriority >= 95);
  const urgentProducts = freshProducts.filter(p => p.freshnessPriority >= 85 && p.freshnessPriority < 95);
  const highPriorityAlerts = alertsData?.alerts.filter(a => a.priority === 'HIGH') || [];

  return (
    <ThemedView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText style={styles.headerTitle}>{dashboard.store.name}</ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {dashboard.store.address}
        </ThemedText>
        
        {/* ✅ Manual Scan Button */}
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
        <Pressable 
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <ThemedText style={[styles.tabText, { color: activeTab === 'overview' ? '#10b981' : theme.textSecondary }]}>
            Overview
          </ThemedText>
        </Pressable>
        
        {/* ✅ Alerts Tab */}
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

        <Pressable
          style={[styles.tab, activeTab === 'loss' && styles.tabActive]}
          onPress={() => setActiveTab('loss')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ThemedText style={[styles.tabText, { color: activeTab === 'loss' ? BRAND_PURPLE : theme.textSecondary }]}>
              💰 Rugi
            </ThemedText>
            {(lossSummary?.pendingSuggestionsCount ?? 0) > 0 && (
              <View style={{
                backgroundColor: BRAND_PURPLE,
                borderRadius: 10, minWidth: 20, height: 20,
                justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
              }}>
                <ThemedText style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                  {lossSummary!.pendingSuggestionsCount}
                </ThemedText>
              </View>
            )}
          </View>
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
        {/* ✅ ALERTS TAB */}
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

        {/* FRESH PRODUCTS TAB */}
        {activeTab === 'fresh' && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>
                Fresh Products Management
              </ThemedText>
            </View>
            
            {/* CRITICAL PRODUCTS */}
            {criticalProducts.length > 0 && (
              <>
                <ThemedText style={{ fontSize: 16, fontWeight: '700', color: '#dc2626', marginBottom: Spacing.md }}>
                  🚨 CRITICAL (0-5 Days) - {criticalProducts.length}
                </ThemedText>
                {criticalProducts.map(product => {
                  const daysLeft = getDaysUntilExpiry(product.expiryDate!);
                  return (
                    <View 
                      key={product.id} 
                      style={[
                        styles.productCard, 
                        { 
                          borderColor: '#dc2626', 
                          borderWidth: 2,
                          backgroundColor: '#fee2e2' 
                        }
                      ]}
                    >
                      {product.image && (
                        <Image 
                          source={{ uri: getImageUrl(product.image) }} 
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      )}
                      <View style={styles.productInfo}>
                        <View style={[styles.urgencyBadge, { backgroundColor: '#dc2626' }]}>
                          <ThemedText style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>
                            {getUrgencyLabel(product.freshnessPriority)}
                          </ThemedText>
                        </View>
                        
                        <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>
                          {product.name}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>
                          {product.brand}
                        </ThemedText>
                        
                        <View style={[styles.expiryWarning, { backgroundColor: '#fee2e2' }]}>
                          <Feather name="clock" size={14} color="#dc2626" />
                          <ThemedText style={{ fontSize: 13, color: '#dc2626', fontWeight: '600' }}>
                            Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} - {new Date(product.expiryDate!).toLocaleDateString()}
                          </ThemedText>
                        </View>
                        
                        <ThemedText style={{ fontSize: 13, marginTop: Spacing.xs }}>
                          Stock: {product.stockCount} • {product.location || 'No location'}
                        </ThemedText>
                        
                        {product.requiresRefrigeration && (
                          <ThemedText style={{ fontSize: 12, color: '#3b82f6', marginTop: Spacing.xs }}>
                            ❄️ Requires refrigeration
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            )}
            
            {/* URGENT PRODUCTS */}
            {urgentProducts.length > 0 && (
              <>
                <ThemedText style={{ fontSize: 16, fontWeight: '700', color: '#f59e0b', marginTop: Spacing.lg, marginBottom: Spacing.md }}>
                  ⚠️ URGENT (6-15 Days) - {urgentProducts.length}
                </ThemedText>
                {urgentProducts.map(product => {
                  const daysLeft = getDaysUntilExpiry(product.expiryDate!);
                  return (
                    <View 
                      key={product.id} 
                      style={[
                        styles.productCard, 
                        { 
                          borderColor: '#f59e0b', 
                          backgroundColor: '#fef3c7' 
                        }
                      ]}
                    >
                      {product.image && (
                        <Image 
                          source={{ uri: getImageUrl(product.image) }} 
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      )}
                      <View style={styles.productInfo}>
                        <View style={[styles.urgencyBadge, { backgroundColor: '#f59e0b' }]}>
                          <ThemedText style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>
                            {getUrgencyLabel(product.freshnessPriority)}
                          </ThemedText>
                        </View>
                        
                        <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>
                          {product.name}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>
                          {product.brand}
                        </ThemedText>
                        
                        <View style={[styles.expiryWarning, { backgroundColor: '#fef3c7' }]}>
                          <Feather name="clock" size={14} color="#f59e0b" />
                          <ThemedText style={{ fontSize: 13, color: '#f59e0b', fontWeight: '600' }}>
                            Expires in {daysLeft} days - {new Date(product.expiryDate!).toLocaleDateString()}
                          </ThemedText>
                        </View>
                        
                        <ThemedText style={{ fontSize: 13, marginTop: Spacing.xs }}>
                          Stock: {product.stockCount} • {product.location || 'No location'}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
            
            {/* ALL FRESH PRODUCTS */}
            <ThemedText style={{ fontSize: 16, fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.md }}>
              🟢 All Fresh Products - {freshProducts.length}
            </ThemedText>
            {freshProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="package" size={64} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>No Fresh Products</ThemedText>
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No fresh products in your inventory
                </ThemedText>
              </View>
            ) : (
              freshProducts
                .filter(p => p.freshnessPriority < 85)
                .map(product => (
                  <View 
                    key={product.id} 
                    style={[
                      styles.productCard, 
                      { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }
                    ]}
                  >
                    {product.image && (
                      <Image 
                        source={{ uri: getImageUrl(product.image) }} 
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.productInfo}>
                      <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>
                        {product.name}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>
                        {product.brand}
                      </ThemedText>
                      
                      {product.expiryDate && (
                        <ThemedText style={{ fontSize: 13, marginTop: Spacing.xs }}>
                          📅 Expires: {new Date(product.expiryDate).toLocaleDateString()}
                        </ThemedText>
                      )}
                      
                      <ThemedText style={{ fontSize: 13 }}>
                        Stock: {product.stockCount}
                      </ThemedText>
                    </View>
                  </View>
                ))
            )}
          </View>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>
                All Products ({products.length})
              </ThemedText>
            </View>
            
            {products.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="package" size={64} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>No Products</ThemedText>
              </View>
            ) : (
              products.map(product => (
                <View 
                  key={product.id} 
                  style={[
                    styles.productCard, 
                    { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }
                  ]}
                >
                  {product.image && (
                    <Image 
                      source={{ uri: getImageUrl(product.image) }} 
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.productInfo}>
                    {product.isFresh && (
                      <View style={[styles.urgencyBadge, { backgroundColor: '#10b981' }]}>
                        <ThemedText style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>
                          🥬 FRESH
                        </ThemedText>
                      </View>
                    )}
                    
                    <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>
                      {product.name}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>
                      {product.brand}
                    </ThemedText>
                    
                    <ThemedText style={{ fontSize: 14, marginTop: Spacing.xs }}>
                      Cost: {formatCurrency(product.costPrice)} → Sell: {formatCurrency(product.price)}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 14 }}>
                      Stock: {product.stockCount} • Margin: {product.margin}%
                    </ThemedText>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* =================== LOSS PREVENTION TAB =================== */}
        {activeTab === 'loss' && (
          <View style={styles.contentSection}>

            {/* ══ LOSS SUMMARY BANNER ══════════════════════════════════════ */}
            <View style={[lossStyles.summaryCard, {
              backgroundColor: (lossSummary?.totalAtRisk ?? 0) > 0 ? '#fff1f2' : '#f0fdf4',
              borderColor: (lossSummary?.totalAtRisk ?? 0) > 0 ? '#fca5a5' : '#86efac',
            }]}>
              <ThemedText style={lossStyles.summaryTitle}>💰 Risiko Kerugian Hari Ini</ThemedText>

              {(lossSummary?.totalAtRisk ?? 0) > 0 ? (
                <>
                  <ThemedText style={[lossStyles.summaryBigNumber, { color: '#dc2626' }]}>
                    {formatCurrency(lossSummary!.totalAtRisk)}
                  </ThemedText>
                  <ThemedText style={lossStyles.summarySubtext}>total potensi kerugian</ThemedText>

                  <View style={lossStyles.breakdownRow}>
                    <View style={[lossStyles.breakdownItem, { borderLeftWidth: 3, borderLeftColor: '#16a34a' }]}>
                      <ThemedText style={lossStyles.breakdownLabel}>🥬 BARANG SEGAR</ThemedText>
                      <ThemedText style={[lossStyles.breakdownValue, { color: '#dc2626' }]}>
                        {formatCurrency(lossSummary!.freshAtRisk)}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>expires &lt; 72 jam</ThemedText>
                    </View>
                    <View style={[lossStyles.breakdownItem, { borderLeftWidth: 3, borderLeftColor: '#3b82f6' }]}>
                      <ThemedText style={lossStyles.breakdownLabel}>📦 BARANG KEMASAN</ThemedText>
                      <ThemedText style={[lossStyles.breakdownValue, { color: '#ea580c' }]}>
                        {formatCurrency(lossSummary!.packagedAtRisk)}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>expires &lt; 30 hari</ThemedText>
                    </View>
                  </View>
                </>
              ) : (
                <ThemedText style={[lossStyles.summaryBigNumber, { color: '#16a34a', fontSize: 18 }]}>
                  🎉 Tidak ada risiko kerugian saat ini!
                </ThemedText>
              )}

              {(lossSummary?.savedToday ?? 0) > 0 && (
                <View style={lossStyles.savedBanner}>
                  <ThemedText style={lossStyles.savedText}>
                    ✅ Sudah diselamatkan hari ini: {formatCurrency(lossSummary!.savedToday)}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* ══ EXPIRY DISCOUNT SUGGESTIONS ═══════════════════════════════ */}
            {expirySuggestions.length > 0 ? (
              <View>
                <View style={lossStyles.sectionHeaderRow}>
                  <ThemedText style={lossStyles.sectionTitle}>⚡ Saran Diskon Mendesak</ThemedText>
                  <View style={lossStyles.countBadge}>
                    <ThemedText style={lossStyles.countBadgeText}>{expirySuggestions.length}</ThemedText>
                  </View>
                </View>

                {expirySuggestions.map((s) => {
                  const isFreshProduct = s.type === 'fresh_discount';
                  const isOverstock = s.type === 'overstock';
                  const isUltraCritical = (s.hoursUntilExpiry ?? 999) < 6;
                  const isCritical = (s.hoursUntilExpiry ?? 999) < 24;

                  // Urgency color
                  const urgencyColor = isUltraCritical
                    ? '#dc2626'
                    : isCritical
                    ? '#ea580c'
                    : isOverstock
                    ? '#d97706'
                    : '#3b82f6';

                  // Urgency label
                  const urgencyLabel = isUltraCritical
                    ? `🚨 KRITIS — HABIS ${s.hoursUntilExpiry} JAM LAGI`
                    : isCritical
                    ? `⚠️ MENDESAK — ${s.hoursUntilExpiry} JAM LAGI`
                    : isOverstock
                    ? `📦 OVERSTOCK — ${s.daysUntilExpiry} HARI SUPPLY`
                    : `⏰ AKAN KADALUARSA — ${s.daysUntilExpiry} HARI LAGI`;

                  return (
                    <View key={s.id} style={[lossStyles.suggestionCard, { borderColor: urgencyColor }]}>
                      {/* Urgency strip at top */}
                      <View style={[lossStyles.urgencyStrip, { backgroundColor: urgencyColor }]}>
                        <ThemedText style={lossStyles.urgencyStripText}>{urgencyLabel}</ThemedText>
                      </View>

                      <View style={lossStyles.cardBody}>
                        {/* Fresh vs Packaged badge */}
                        <View style={lossStyles.typeBadgeRow}>
                          {isFreshProduct ? (
                            <View style={lossStyles.freshBadge}>
                              <ThemedText style={lossStyles.freshBadgeText}>🥬 BARANG SEGAR</ThemedText>
                            </View>
                          ) : isOverstock ? (
                            <View style={lossStyles.overstockBadge}>
                              <ThemedText style={lossStyles.overstockBadgeText}>📦 OVERSTOCK</ThemedText>
                            </View>
                          ) : (
                            <View style={lossStyles.packagedBadge}>
                              <ThemedText style={lossStyles.packagedBadgeText}>📦 BARANG KEMASAN</ThemedText>
                            </View>
                          )}
                          <ThemedText style={{ fontSize: 10, color: '#94a3b8' }}>
                            diskon {s.suggestedDiscountPercent}%
                          </ThemedText>
                        </View>

                        <ThemedText style={lossStyles.productName}>{s.productName}</ThemedText>

                        <ThemedText style={lossStyles.riskLine}>
                          Potensi rugi:{' '}
                          <ThemedText style={{ color: '#dc2626', fontWeight: '800' }}>
                            {formatCurrency(s.rupiahAtRisk)}
                          </ThemedText>
                        </ThemedText>

                        {/* Price arrow: from → to */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <ThemedText style={{ fontSize: 14, color: '#94a3b8', textDecorationLine: 'line-through' }}>
                            {formatCurrency(s.currentPrice)}
                          </ThemedText>
                          <ThemedText style={{ fontSize: 14, color: '#94a3b8' }}>→</ThemedText>
                          <ThemedText style={{ fontSize: 16, fontWeight: '800', color: '#16a34a' }}>
                            {formatCurrency(s.suggestedPrice)}
                          </ThemedText>
                          <ThemedText style={{ fontSize: 11, color: '#64748b' }}>
                            (hemat {s.suggestedDiscountPercent}%)
                          </ThemedText>
                        </View>

                        <View style={lossStyles.actionRow}>
                          <Pressable
                            style={[lossStyles.approveBtn, { backgroundColor: BRAND_PURPLE }]}
                            onPress={() => approveSuggestionMutation.mutate(s.id)}
                            disabled={approveSuggestionMutation.isPending}
                          >
                            <ThemedText style={lossStyles.approveBtnText}>✅ Terapkan Diskon</ThemedText>
                          </Pressable>
                          <Pressable
                            style={lossStyles.ignoreBtn}
                            onPress={() => ignoreSuggestionMutation.mutate(s.id)}
                          >
                            <ThemedText style={lossStyles.ignoreBtnText}>Lewati</ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={{ padding: Spacing.lg, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: Spacing.lg }}>
                <ThemedText style={{ fontSize: 24, marginBottom: 8 }}>✅</ThemedText>
                <ThemedText style={{ fontSize: 14, color: '#64748b', textAlign: 'center' }}>Tidak ada saran diskon saat ini</ThemedText>
              </View>
            )}

            {/* ══ BUNDLE SUGGESTIONS ════════════════════════════════════════ */}
            {bundleSuggestions.length > 0 && (
              <View>
                <View style={lossStyles.sectionHeaderRow}>
                  <ThemedText style={lossStyles.sectionTitle}>🎁 Saran Paket Bundle</ThemedText>
                  <View style={[lossStyles.countBadge, { backgroundColor: '#7c3aed' }]}>
                    <ThemedText style={lossStyles.countBadgeText}>{bundleSuggestions.length}</ThemedText>
                  </View>
                </View>

                {bundleSuggestions.map((b) => (
                  <View key={b.id} style={[lossStyles.suggestionCard, { borderColor: '#7c3aed' }]}>
                    <View style={[lossStyles.urgencyStrip, { backgroundColor: '#7c3aed' }]}>
                      <ThemedText style={lossStyles.urgencyStripText}>🎁 PAKET BUNDLE — JUAL BERSAMA LEBIH HEMAT</ThemedText>
                    </View>
                    <View style={lossStyles.cardBody}>
                      <ThemedText style={[lossStyles.productName, { fontSize: 18, color: '#6d28d9' }]}>
                        {b.suggestedName}
                      </ThemedText>

                      <ThemedText style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>ISI PAKET:</ThemedText>
                      {b.items.map((item, i) => (
                        <ThemedText key={i} style={lossStyles.bundleItemLine}>
                          • {item.productName} ×{item.quantity}
                          {'  '}
                          <ThemedText style={{ color: '#64748b' }}>{formatCurrency(item.unitPrice)}/pcs</ThemedText>
                        </ThemedText>
                      ))}

                      <View style={lossStyles.bundlePriceRow}>
                        <ThemedText style={lossStyles.normalPrice}>
                          Harga normal:{' '}
                          <ThemedText style={{ textDecorationLine: 'line-through' }}>
                            {formatCurrency(b.normalTotal)}
                          </ThemedText>
                        </ThemedText>
                        <ThemedText style={lossStyles.bundlePrice}>
                          Harga bundle:{' '}
                          <ThemedText style={{ color: '#16a34a', fontWeight: '900' }}>
                            {formatCurrency(b.suggestedBundlePrice)}
                          </ThemedText>
                          {'  '}
                          <ThemedText style={{ fontSize: 12, backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: '700' }}>
                            HEMAT {b.discountPercent}%
                          </ThemedText>
                        </ThemedText>
                      </View>

                      <ThemedText style={lossStyles.riskLine}>
                        Bisa buat <ThemedText style={{ fontWeight: '700', color: '#1e293b' }}>{b.possibleBundleCount} paket</ThemedText>
                      </ThemedText>

                      <View style={[lossStyles.actionRow, { marginTop: 8 }]}>
                        <Pressable
                          style={[lossStyles.approveBtn, { backgroundColor: '#7c3aed' }]}
                          onPress={() => approveBundleMutation.mutate({ id: b.id })}
                          disabled={approveBundleMutation.isPending}
                        >
                          <ThemedText style={lossStyles.approveBtnText}>✅ Aktifkan Paket</ThemedText>
                        </Pressable>
                        <Pressable
                          style={[lossStyles.approveBtn, { backgroundColor: '#0284c7' }]}
                          onPress={() => {
                            Alert.prompt(
                              'Ubah Harga Bundle',
                              `Harga saran: ${formatCurrency(b.suggestedBundlePrice)}
Min: ${formatCurrency(b.minimumBundlePrice)}`,
                              (value: string) => {
                                const price = parseInt(value?.replace(/\D/g, '') || '0');
                                if (price >= b.minimumBundlePrice) {
                                  approveBundleMutation.mutate({ id: b.id, finalPrice: price });
                                } else {
                                  Alert.alert('Harga terlalu rendah', `Minimum: ${formatCurrency(b.minimumBundlePrice)}`);
                                }
                              },
                              'plain-text',
                              String(b.suggestedBundlePrice)
                            );
                          }}
                        >
                          <ThemedText style={lossStyles.approveBtnText}>✏️ Ubah Harga</ThemedText>
                        </Pressable>
                        <Pressable
                          style={lossStyles.ignoreBtn}
                          onPress={() => ignoreBundleMutation.mutate(b.id)}
                        >
                          <ThemedText style={lossStyles.ignoreBtnText}>Lewati</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ══ DEAD STOCK ALERTS ════════════════════════════════════════ */}
            {deadStockAlerts.length > 0 && (
              <View>
                <View style={lossStyles.sectionHeaderRow}>
                  <ThemedText style={lossStyles.sectionTitle}>⚰️ Stok Mati</ThemedText>
                  <View style={[lossStyles.countBadge, { backgroundColor: '#dc2626' }]}>
                    <ThemedText style={lossStyles.countBadgeText}>{deadStockAlerts.length}</ThemedText>
                  </View>
                </View>
                <ThemedText style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, marginTop: -8 }}>
                  Produk tidak terjual dalam waktu lama — perlu tindakan
                </ThemedText>

                {deadStockAlerts.map((d) => {
                  const severityColor = d.severity === 'red' ? '#dc2626' : d.severity === 'orange' ? '#ea580c' : '#d97706';
                  const severityLabel = d.severity === 'red' ? '🔴 KRITIS' : d.severity === 'orange' ? '🟠 WASPADA' : '🟡 PERHATIAN';
                  return (
                    <View key={d.id} style={[lossStyles.deadStockCard, { borderColor: severityColor + '80' }]}>
                      <View style={[lossStyles.severityBadge, { backgroundColor: severityColor }]}>
                        <ThemedText style={lossStyles.severityText}>{severityLabel}</ThemedText>
                      </View>
                      <ThemedText style={lossStyles.deadStockName}>{d.productName}</ThemedText>
                      <ThemedText style={lossStyles.deadStockInfo}>
                        📅 Tidak terjual selama <ThemedText style={{ fontWeight: '700', color: '#1e293b' }}>{d.daysSinceLastSale} hari</ThemedText>
                      </ThemedText>
                      <ThemedText style={lossStyles.deadStockInfo}>
                        📦 Stok tersisa: <ThemedText style={{ fontWeight: '700', color: '#1e293b' }}>{d.currentStock} unit</ThemedText>
                      </ThemedText>
                      {d.hasExpiryRisk && (
                        <ThemedText style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>
                          ⚠️ Berisiko kadaluarsa sebelum terjual
                        </ThemedText>
                      )}
                      <ThemedText style={lossStyles.deadStockRisk}>
                        💸 Modal tertanam: {formatCurrency(d.rupiahAtRisk)}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Empty state */}
            {expirySuggestions.length === 0 && bundleSuggestions.length === 0 && deadStockAlerts.length === 0 && (lossSummary?.totalAtRisk ?? 0) === 0 && (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ThemedText style={{ fontSize: 48, marginBottom: 12 }}>🎉</ThemedText>
                <ThemedText style={{ fontSize: 18, fontWeight: '800', color: '#16a34a', marginBottom: 8 }}>Toko Anda Sehat!</ThemedText>
                <ThemedText style={{ fontSize: 14, color: '#64748b', textAlign: 'center' }}>
                  Tidak ada risiko kerugian yang terdeteksi saat ini.
                </ThemedText>
              </View>
            )}

          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}