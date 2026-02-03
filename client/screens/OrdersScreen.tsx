import React, { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, FlatList, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

// Components & Hooks
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useSearch } from "@/context/SearchContext";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { SearchOverlayHeader } from '@/components/SearchOverlayHeader';

// BRAND COLORS
const BRAND_PURPLE = "#6338f2"; 
const BRAND_MINT_TEXT = "#00bfa5";
const STATUS_BLUE = "#3b82f6";
const STATUS_ORANGE = "#f59e0b";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  
  // Search state
  const { isSearchActive, setIsSearchActive, searchScope } = useSearch();
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // DEBUG: Log when search state changes
  useEffect(() => {
    console.log('📊 OrdersScreen - isSearchActive:', isSearchActive);
    console.log('📊 OrdersScreen - searchScope:', searchScope);
    console.log('📊 OrdersScreen - Should show overlay:', isSearchActive && searchScope === 'history');
  }, [isSearchActive, searchScope]);

  const userId = user?.id;

  const { data: allOrders = [], isLoading, refetch } = useQuery({
    queryKey: ["orders", userId], 
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders?userId=${userId}&role=customer`);
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });

  const activeOrders = allOrders.filter((o: any) => 
    ["pending", "picking", "packing", "packed", "delivering", "created", "confirmed"].includes(o.status?.toLowerCase())
  );
  const completedOrders = allOrders.filter((o: any) => o.status === "delivered");
  const orders = activeTab === "active" ? activeOrders : completedOrders;

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!localSearchQuery.trim()) return orders;
    
    const query = localSearchQuery.toLowerCase();
    return orders.filter((order: any) => 
      order.orderNumber?.toLowerCase().includes(query) ||
      order.id?.toLowerCase().includes(query) ||
      order.status?.toLowerCase().includes(query) ||
      order.items?.some((item: any) => 
        item.productName?.toLowerCase().includes(query)
      )
    );
  }, [orders, localSearchQuery]);

  const formatPrice = (price: any) => `Rp ${(Number(price) || 0).toLocaleString("id-ID")}`;

  const formatDate = (dateInput: Date | string) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const getStatusTheme = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case "pending": 
      case "created": return { color: "#94a3b8", icon: "clock-outline", label: "PENDING", progress: 0.2 };
      case "confirmed": return { color: BRAND_PURPLE, icon: "check-circle-outline", label: "PREPARING", progress: 0.4 };
      case "picking": 
      case "packing": return { color: STATUS_BLUE, icon: "package-variant", label: "PACKING", progress: 0.6 };
      case "packed": return { color: STATUS_ORANGE, icon: "package-variant-closed", label: "READY TO GO", progress: 0.8 };
      case "delivering": return { color: BRAND_MINT_TEXT, icon: "flash", label: "ON THE WAY", progress: 0.95 };
      case "delivered": return { color: "#059669", icon: "check-decagram", label: "DELIVERED", progress: 1 };
      default: return { color: BRAND_PURPLE, icon: "dots-horizontal", label: status.toUpperCase(), progress: 0.1 };
    }
  };

  const handleCloseSearch = () => {
    console.log('🔴 Closing search overlay');
    setIsSearchActive(false);
    setLocalSearchQuery('');
  };

  const renderOrder = ({ item }: { item: any }) => {
    const firstItem = item.items?.[0];
    const isActiveOrder = item.status !== "delivered";
    const statusTheme = getStatusTheme(item.status);

    return (
      <Card style={styles.orderCard} onPress={() => handleOrderPress(item)}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={styles.imageContainer}>
            {firstItem?.productImage ? (
              <Image source={{ uri: firstItem.productImage }} style={styles.productImage} />
            ) : (
              <Feather name="package" size={24} color="#999" />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <ThemedText style={{ fontWeight: "800", flex: 1, marginRight: 8, fontSize: 15 }}>
                {firstItem?.productName || "Order"}{item.items?.length > 1 ? ` (+${item.items.length - 1})` : ""}
              </ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: statusTheme.color + '15' }]}>
                <ThemedText style={[styles.statusBadgeText, { color: statusTheme.color }]}>{statusTheme.label}</ThemedText>
              </View>
            </View>
            
            <ThemedText type="caption" style={{ color: "#94a3b8", marginTop: 4, fontWeight: "600" }}>{formatDate(item.createdAt)}</ThemedText>
            
            {isActiveOrder && (
              <View style={{ marginTop: 12 }}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${statusTheme.progress * 100}%`, backgroundColor: statusTheme.color }]} />
                </View>
                <View style={[styles.activeIndicator, { backgroundColor: statusTheme.color + '10', marginTop: 8 }]}>
                  <MaterialCommunityIcons name={statusTheme.icon as any} size={12} color={statusTheme.color} />
                  <ThemedText type="small" style={{ color: statusTheme.color, fontWeight: '800', fontSize: 11 }}>
                    {item.status === "delivering" ? "ARRIVING SOON" : "TRACKING STATUS"}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>
        </View>

        {isActiveOrder && (
          <View style={styles.trackButtonContainer}>
            <View style={styles.trackButtonInner}>
              <Feather name="navigation" size={14} color={BRAND_PURPLE} />
              <ThemedText style={{ color: BRAND_PURPLE, fontWeight: '800', fontSize: 13 }}>Track Order</ThemedText>
            </View>
          </View>
        )}
      </Card>
    );
  };

  const handleOrderPress = (order: any) => {
    order.status === "delivered" ? navigation.navigate("OrderDetail", { order }) : navigation.navigate("OrderTracking", { orderId: order.id });
  };

  const shouldShowOverlay = isSearchActive && searchScope === 'history';

  console.log('🎨 Rendering OrdersScreen, shouldShowOverlay:', shouldShowOverlay);

  return (
    <>
      <ThemedView style={[styles.container, { backgroundColor: '#F8F9FB' }]}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
        </View>
        
        <View style={styles.tabsContainer}>
          <Pressable style={[styles.tab, activeTab === "active" && styles.activeTabBorder]} onPress={() => setActiveTab("active")}>
            <ThemedText style={[styles.tabText, activeTab === "active" ? styles.activeTabText : { color: '#94a3b8' }]}>Active ({activeOrders.length})</ThemedText>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === "completed" && styles.activeTabBorder]} onPress={() => setActiveTab("completed")}>
            <ThemedText style={[styles.tabText, activeTab === "completed" ? styles.activeTabText : { color: '#94a3b8' }]}>History ({completedOrders.length})</ThemedText>
          </Pressable>
        </View>
        
        <FlatList
          data={orders}
          renderItem={renderOrder}
          onRefresh={refetch}
          refreshing={isLoading}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        />
      </ThemedView>

      {/* SEARCH OVERLAY - MOVED OUTSIDE ThemedView */}
      {shouldShowOverlay && (
        <View style={styles.searchOverlay} pointerEvents="box-none">
          <Pressable 
            style={styles.backdrop} 
            onPress={handleCloseSearch}
          />
          
          <View style={[styles.searchContent, { backgroundColor: theme.backgroundRoot || '#F8F9FB', paddingTop: insets.top + 20 }]}>
            <SearchOverlayHeader
              value={localSearchQuery}
              onChangeText={setLocalSearchQuery}
              onClose={handleCloseSearch}
              placeholder="Search your orders..."
              theme={theme}
            />

            <FlatList
              data={filteredOrders}
              renderItem={renderOrder}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="search" size={48} color="#64748b" />
                  <ThemedText style={{ color: '#64748b', marginTop: 16, fontSize: 16 }}>
                    No orders found
                  </ThemedText>
                  <ThemedText style={{ color: '#9ca3af', marginTop: 8, fontSize: 13 }}>
                    Try searching by order number or product name
                  </ThemedText>
                </View>
              }
            />
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  tabsContainer: { flexDirection: "row", paddingHorizontal: 24, backgroundColor: '#fff', marginBottom: 12 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 16 },
  activeTabBorder: { borderBottomColor: BRAND_PURPLE, borderBottomWidth: 3 },
  tabText: { fontSize: 14, fontWeight: '700' },
  activeTabText: { color: BRAND_PURPLE },
  listContent: { paddingHorizontal: 16, gap: 12 },
  orderCard: { borderRadius: 24, padding: 16, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  imageContainer: { width: 70, height: 70, borderRadius: 18, backgroundColor: '#f1f5f9', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  productImage: { width: '100%', height: '100%' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontWeight: '900', fontSize: 10 },
  progressTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  activeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  trackButtonContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  trackButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  
  // Search Overlay Styles - CRITICAL FIXES
  searchOverlay: {
    ...StyleSheet.absoluteFillObject, // Use absoluteFillObject instead of individual properties
    zIndex: 99999, // Increased z-index
    elevation: 99999, // Android elevation
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  searchContent: {
    flex: 1,
    zIndex: 100000,
  },
});