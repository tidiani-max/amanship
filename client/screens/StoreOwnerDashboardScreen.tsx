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
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.md,
    color: '#1e293b',
  },
  summaryBigNumber: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
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
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#f0fdf4',
  },
  savedText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  suggestionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  urgencyTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '900',
    color: 'white',
  },
  productNameText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  riskText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '700',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  approveBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  ignoreBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  approveBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
  },
  ignoreBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 13,
  },
  bundleCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: '#faf5ff',
  },
  bundleName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#6d28d9',
    marginBottom: Spacing.sm,
  },
  bundleItem: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
  bundlePriceOld: {
    fontSize: 13,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginTop: Spacing.sm,
  },
  bundlePriceNew: {
    fontSize: 20,
    fontWeight: '900',
    color: '#16a34a',
  },
  bundleDiscountBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  bundleDiscountText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 12,
  },
  bundleCount: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: Spacing.md,
  },
  adjustPriceBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    backgroundColor: '#ede9fe',
  },
  adjustPriceBtnText: {
    color: '#7c3aed',
    fontWeight: '700',
    fontSize: 13,
  },
  deadStockCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  deadStockName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  deadStockInfo: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
  deadStockRisk: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  criticalBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: '#dc2626',
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  criticalBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
  },
  // ── Aliases & missing keys ──────────────────────────────────
  savedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
    marginTop: 16,
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
  urgencyStrip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start' as const,
    marginBottom: 8,
  },
  urgencyStripText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900' as const,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  riskLine: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  priceLine: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  bundleItemLine: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
  bundlePriceRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  normalPrice: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 2,
  },
  bundlePrice: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 8,
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

            {/* ── LOSS SUMMARY BANNER ─────────────────────────────── */}
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
                  <ThemedText style={lossStyles.summarySubtext}>dari barang berisiko</ThemedText>

                  <View style={lossStyles.breakdownRow}>
                    <View style={lossStyles.breakdownItem}>
                      <ThemedText style={lossStyles.breakdownLabel}>🥬 Barang Segar</ThemedText>
                      <ThemedText style={[lossStyles.breakdownValue, { color: '#dc2626' }]}>
                        {formatCurrency(lossSummary!.freshAtRisk)}
                      </ThemedText>
                    </View>
                    <View style={lossStyles.breakdownItem}>
                      <ThemedText style={lossStyles.breakdownLabel}>📦 Packaged</ThemedText>
                      <ThemedText style={[lossStyles.breakdownValue, { color: '#ea580c' }]}>
                        {formatCurrency(lossSummary!.packagedAtRisk)}
                      </ThemedText>
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

            {/* ── EXPIRY DISCOUNT SUGGESTIONS ─────────────────────── */}
            {expirySuggestions.length > 0 && (
              <View>
                <View style={lossStyles.sectionHeaderRow}>
                  <ThemedText style={lossStyles.sectionTitle}>⚡ Saran Diskon Mendesak</ThemedText>
                  <View style={lossStyles.countBadge}>
                    <ThemedText style={lossStyles.countBadgeText}>{expirySuggestions.length}</ThemedText>
                  </View>
                </View>

                {expirySuggestions.map((s) => {
                  const isUltraCritical = (s.hoursUntilExpiry ?? 999) < 6;
                  const isCritical = (s.hoursUntilExpiry ?? 999) < 24;
                  const urgencyColor = isUltraCritical ? '#dc2626' : isCritical ? '#ea580c' : '#d97706';
                  const urgencyLabel = isUltraCritical
                    ? `🚨 KRITIS ${s.hoursUntilExpiry} JAM LAGI`
                    : isCritical
                    ? `⚠️ ${s.hoursUntilExpiry} JAM LAGI`
                    : s.daysUntilExpiry != null
                    ? `⏰ ${s.daysUntilExpiry} HARI LAGI`
                    : s.type === 'overstock'
                    ? `📦 OVERSTOCK ${s.daysUntilExpiry} HARI SUPPLY`
                    : '⏰ PERLU DISKON';

                  return (
                    <View key={s.id} style={[lossStyles.suggestionCard, { borderColor: urgencyColor }]}>
                      <View style={[lossStyles.urgencyStrip, { backgroundColor: urgencyColor }]}>
                        <ThemedText style={lossStyles.urgencyStripText}>{urgencyLabel}</ThemedText>
                      </View>

                      <ThemedText style={lossStyles.productName}>{s.productName}</ThemedText>

                      <ThemedText style={lossStyles.riskLine}>
                        Potensi rugi: <ThemedText style={{ color: '#dc2626', fontWeight: '800' }}>
                          {formatCurrency(s.rupiahAtRisk)}
                        </ThemedText>
                      </ThemedText>

                      <ThemedText style={lossStyles.priceLine}>
                        Saran: {formatCurrency(s.currentPrice)}{' '}
                        <ThemedText style={{ color: '#dc2626', textDecorationLine: 'line-through' }}>
                          →
                        </ThemedText>{' '}
                        <ThemedText style={{ color: '#16a34a', fontWeight: '700' }}>
                          {formatCurrency(s.suggestedPrice)}
                        </ThemedText>{' '}
                        (diskon {s.suggestedDiscountPercent}%)
                      </ThemedText>

                      <View style={lossStyles.actionRow}>
                        <Pressable
                          style={[lossStyles.approveBtn, { backgroundColor: BRAND_PURPLE }]}
                          onPress={() => approveSuggestionMutation.mutate(s.id)}
                          disabled={approveSuggestionMutation.isPending}
                        >
                          <ThemedText style={lossStyles.approveBtnText}>✅ APPROVE</ThemedText>
                        </Pressable>
                        <Pressable
                          style={lossStyles.ignoreBtn}
                          onPress={() => ignoreSuggestionMutation.mutate(s.id)}
                        >
                          <ThemedText style={lossStyles.ignoreBtnText}>Abaikan</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── BUNDLE SUGGESTIONS ──────────────────────────────── */}
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
                    <ThemedText style={[lossStyles.productName, { fontSize: 18 }]}>{b.suggestedName}</ThemedText>

                    {b.items.map((item, i) => (
                      <ThemedText key={i} style={lossStyles.bundleItemLine}>
                        • {item.productName} ×{item.quantity} — {formatCurrency(item.unitPrice)}
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
                        <ThemedText style={{ color: '#16a34a', fontWeight: '800' }}>
                          {formatCurrency(b.suggestedBundlePrice)}
                        </ThemedText>
                      </ThemedText>
                    </View>

                    <ThemedText style={lossStyles.riskLine}>
                      Diskon {b.discountPercent}% untuk pelanggan • Bisa buat {b.possibleBundleCount} paket
                    </ThemedText>
                    <ThemedText style={lossStyles.riskLine}>
                      Potensi rugi jika tidak dijual:{' '}
                      <ThemedText style={{ color: '#dc2626', fontWeight: '800' }}>
                        {formatCurrency(b.rupiahAtRisk)}
                      </ThemedText>
                    </ThemedText>

                    <View style={lossStyles.actionRow}>
                      <Pressable
                        style={[lossStyles.approveBtn, { backgroundColor: '#7c3aed', flex: 1 }]}
                        onPress={() => approveBundleMutation.mutate({ id: b.id })}
                        disabled={approveBundleMutation.isPending}
                      >
                        <ThemedText style={lossStyles.approveBtnText}>✅ APPROVE</ThemedText>
                      </Pressable>
                      <Pressable
                        style={[lossStyles.approveBtn, { backgroundColor: '#0284c7', flex: 1 }]}
                        onPress={() => {
                          Alert.prompt(
                            'Ubah Harga Bundle',
                            `Masukkan harga baru (min Rp ${b.suggestedBundlePrice.toLocaleString('id-ID')}):`,
                            (value) => {
                              const price = parseInt(value ?? '0', 10);
                              if (price > 0) {
                                approveBundleMutation.mutate({ id: b.id, finalPrice: price });
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
                        <ThemedText style={lossStyles.ignoreBtnText}>Abaikan</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── DEAD STOCK WARNINGS ─────────────────────────────── */}
            {deadStockAlerts.length > 0 && (
              <View>
                <ThemedText style={[lossStyles.sectionTitle, { marginBottom: Spacing.sm }]}>
                  ⚠️ Stok Mati
                </ThemedText>

                {deadStockAlerts.map((alert) => {
                  const bgColor =
                    alert.severity === 'critical' ? '#fef2f2' :
                    alert.severity === 'red' ? '#fff7ed' : '#fefce8';
                  const borderColor =
                    alert.severity === 'critical' ? '#dc2626' :
                    alert.severity === 'red' ? '#ea580c' : '#ca8a04';

                  return (
                    <View key={alert.id} style={[lossStyles.deadStockCard, { backgroundColor: bgColor, borderColor }]}>
                      {alert.hasExpiryRisk && (
                        <View style={[lossStyles.criticalBadge, { backgroundColor: '#dc2626' }]}>
                          <ThemedText style={lossStyles.criticalBadgeText}>
                            🚨 + RISIKO KADALUARSA
                          </ThemedText>
                        </View>
                      )}
                      <ThemedText style={[lossStyles.productName, { color: borderColor }]}>
                        {alert.productName}
                      </ThemedText>
                      <ThemedText style={lossStyles.deadStockInfo}>
                        {alert.daysSinceLastSale >= 999
                          ? 'Belum pernah terjual'
                          : `${alert.daysSinceLastSale} hari tanpa penjualan`}{' '}
                        — stok {alert.currentStock} unit
                      </ThemedText>
                      <ThemedText style={lossStyles.riskLine}>
                        Estimasi kerugian:{' '}
                        <ThemedText style={{ color: '#dc2626', fontWeight: '800' }}>
                          {formatCurrency(alert.rupiahAtRisk)}
                        </ThemedText>
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            )}

            {expirySuggestions.length === 0 && bundleSuggestions.length === 0 && deadStockAlerts.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="check-circle" size={64} color="#16a34a" />
                <ThemedText style={styles.emptyTitle}>Semua Aman! ✅</ThemedText>
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Tidak ada saran atau peringatan kerugian saat ini.
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}