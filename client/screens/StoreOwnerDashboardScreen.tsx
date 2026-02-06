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
import { useAuth } from "@/context/AuthContext"; // ✅ ADD THIS

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
});

// ===================== MAIN COMPONENT =====================
export default function StoreOwnerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { user } = useAuth(); // ✅ GET ACTUAL USER

  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'products' | 'promotions'>('overview');

  // ✅ FIX 1: Use actual user ID
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
    enabled: !!userId, // ✅ Only fetch when user is logged in
    refetchInterval: 30000,
  });

  // ✅ FIX 2: Get staff list
  const { data: staffList = [] } = useQuery<StaffMember[]>({
    queryKey: ["/api/store-owner/staff", userId],
    queryFn: async () => {
      if (!userId || !dashboard?.store?.id) return [];
      
      const response = await apiRequest(
        "GET",
        `/api/stores/${dashboard.store.id}/staff`
      );
      
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId && !!dashboard?.store?.id,
  });

  // ✅ FIX 3: Get promotions
  const { data: promotions = [] } = useQuery<Promotion[]>({
    queryKey: ["/api/store-owner/promotions", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await apiRequest(
        "GET",
        `/api/store-owner/promotions?userId=${userId}`
      );
      
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
  });

  // ✅ FIX 4: Get products
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

  // ✅ FIX 5: Get fresh products
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
            Staff ({dashboard.staff.total})
          </ThemedText>
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
          style={[styles.tab, activeTab === 'promotions' && styles.tabActive]}
          onPress={() => setActiveTab('promotions')}
        >
          <ThemedText style={[styles.tabText, { color: activeTab === 'promotions' ? '#10b981' : theme.textSecondary }]}>
            Promotions ({promotions.length})
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

        {/* ✅ STAFF TAB */}
        {activeTab === 'staff' && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>
                Store Staff ({staffList.length})
              </ThemedText>
            </View>
            
            {staffList.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="users" size={64} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>No Staff Yet</ThemedText>
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Contact admin to add staff members to your store
                </ThemedText>
              </View>
            ) : (
              <View style={styles.staffGrid}>
                {staffList.map((member) => (
                  <View key={member.id} style={[styles.staffCard, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
                    <View style={[styles.staffAvatar, { backgroundColor: member.status === 'online' ? theme.success + '20' : theme.textSecondary + '20' }]}>
                      <Feather 
                        name={member.role === 'picker' ? 'package' : 'truck'} 
                        size={24} 
                        color={member.status === 'online' ? theme.success : theme.textSecondary} 
                      />
                    </View>
                    
                    <View style={styles.staffInfo}>
                      <ThemedText style={styles.staffName}>
                        {member.user?.name || member.user?.username || 'Staff Member'}
                      </ThemedText>
                      <ThemedText style={[styles.staffRole, { color: theme.textSecondary }]}>
                        {member.role === 'picker' ? '📦 Picker' : '🚗 Driver'}
                      </ThemedText>
                      {member.user?.phone && (
                        <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                          {member.user.phone}
                        </ThemedText>
                      )}
                    </View>
                    
                    <View style={[styles.statusBadge, { 
                      backgroundColor: member.status === 'online' ? theme.success + '20' : theme.textSecondary + '20' 
                    }]}>
                      <View style={[styles.statusDot, { 
                        backgroundColor: member.status === 'online' ? theme.success : theme.textSecondary 
                      }]} />
                      <ThemedText style={{ fontSize: 12, color: member.status === 'online' ? theme.success : theme.textSecondary }}>
                        {member.status}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ✅ PRODUCTS TAB */}
        {activeTab === 'products' && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>
                Store Products ({products.length})
              </ThemedText>
            </View>
            
            {/* Fresh Products Alert */}
            {freshProducts.length > 0 && (
              <View style={{ marginBottom: Spacing.lg }}>
                <ThemedText style={{ fontSize: 16, fontWeight: '600', marginBottom: Spacing.md }}>
                  🥬 Fresh Products ({freshProducts.length})
                </ThemedText>
                {freshProducts.slice(0, 3).map((product) => (
                  <View key={product.id} style={[styles.productCard, { borderColor: theme.warning, backgroundColor: theme.warning + '10' }]}>
                    {product.image && (
                      <Image 
                        source={{ uri: getImageUrl(product.image) }} 
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.productInfo}>
                      <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>{product.name}</ThemedText>
                      <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>{product.brand}</ThemedText>
                      <ThemedText style={{ fontSize: 14, marginTop: Spacing.xs }}>
                        Stock: {product.stockCount} • {product.location || 'No location'}
                      </ThemedText>
                      {product.expiryDate && (
                        <ThemedText style={{ fontSize: 12, color: theme.warning, marginTop: Spacing.xs }}>
                          ⚠️ Expires: {new Date(product.expiryDate).toLocaleDateString()}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {/* All Products */}
            <ThemedText style={{ fontSize: 16, fontWeight: '600', marginBottom: Spacing.md }}>
              All Products
            </ThemedText>
            {products.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="package" size={64} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>No Products</ThemedText>
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Your store doesn't have any products yet
                </ThemedText>
              </View>
            ) : (
              products.map((product) => (
                <View key={product.id} style={[styles.productCard, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
                  {product.image && (
                    <Image 
                      source={{ uri: getImageUrl(product.image) }} 
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.productInfo}>
                    <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>{product.name}</ThemedText>
                    <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>{product.brand}</ThemedText>
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

        {/* ✅ PROMOTIONS TAB */}
        {activeTab === 'promotions' && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>
                Store Promotions ({promotions.length})
              </ThemedText>
            </View>
            
            {promotions.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="gift" size={64} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>No Promotions</ThemedText>
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Create promotions to attract more customers
                </ThemedText>
              </View>
            ) : (
              promotions.map((promo) => (
                <View key={promo.id} style={[styles.promotionCard, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
                  {(promo.bannerImage || promo.image) && (
                    <Image 
                      source={{ uri: getImageUrl(promo.bannerImage || promo.image || '') }} 
                      style={styles.promotionImage}
                      resizeMode="cover"
                    />
                  )}
                  <ThemedText style={{ fontSize: 18, fontWeight: '700', marginBottom: Spacing.xs }}>
                    {promo.title}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 14, color: theme.textSecondary, marginBottom: Spacing.md }}>
                    {promo.description}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <ThemedText style={{ fontSize: 14 }}>
                        Used: {promo.usedCount} times
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                        Valid until {new Date(promo.validUntil).toLocaleDateString()}
                      </ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: promo.isActive ? theme.success + '20' : theme.error + '20' 
                    }]}>
                      <View style={[styles.statusDot, { 
                        backgroundColor: promo.isActive ? theme.success : theme.error 
                      }]} />
                      <ThemedText style={{ fontSize: 12, color: promo.isActive ? theme.success : theme.error }}>
                        {promo.isActive ? 'Active' : 'Inactive'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}