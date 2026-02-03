import React, { useState, useMemo } from "react";
import { View, StyleSheet, FlatList, Pressable, Clipboard, Alert, Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useSearch } from "@/context/SearchContext";

type Tab = "vouchers" | "promotions";

const PURPLE_PRIMARY = "#6366F1";
const PURPLE_LIGHT = "#EEF2FF";

export default function VouchersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("vouchers");
  
  // Search state
  const { isSearchActive, setIsSearchActive, searchScope } = useSearch();
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Force a minimum top padding so it never hides behind the notch
  const dynamicTopPadding = Platform.OS === 'ios' ? insets.top : insets.top + 10;

  const formatPrice = (price: number) => `Rp ${(price || 0).toLocaleString("id-ID")}`;

  const { data: vouchersData = [] } = useQuery({
    queryKey: ["/api/vouchers/active", user?.id],
    queryFn: async () => {
      const url = `${process.env.EXPO_PUBLIC_DOMAIN}/api/vouchers/active${user?.id ? `?userId=${user.id}` : ''}`;
      const res = await fetch(url);
      return res.ok ? res.json() : [];
    },
  });

  const { data: historyData = [] } = useQuery({
    queryKey: ["/api/promotions/claimed", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/promotions/claimed?userId=${user?.id}`);
      return res.ok ? res.json() : [];
    },
  });

  // Filter data based on search query
  const filteredData = useMemo(() => {
    const currentData = activeTab === "vouchers" ? vouchersData : historyData;
    
    if (!localSearchQuery.trim()) return currentData;
    
    const query = localSearchQuery.toLowerCase();
    return currentData.filter((item: any) => 
      item.code?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.title?.toLowerCase().includes(query)
    );
  }, [vouchersData, historyData, localSearchQuery, activeTab]);

  const handleCloseSearch = () => {
    setIsSearchActive(false);
    setLocalSearchQuery('');
  };

  const renderVoucher = ({ item }: { item: any }) => (
    <Card style={styles.voucherCard}>
      <View style={styles.voucherContent}>
        <View style={[styles.iconContainer, { backgroundColor: PURPLE_LIGHT }]}>
          <Feather name="tag" size={22} color={PURPLE_PRIMARY} />
        </View>
        <View style={styles.voucherDetails}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.voucherTitle}>
                {item.discountType === "percentage" ? `${item.discount}% OFF` : formatPrice(item.discount || item.discountValue)}
              </ThemedText>
              <ThemedText style={styles.descriptionText} numberOfLines={2}>{item.description}</ThemedText>
            </View>
            <Pressable 
              onPress={() => { Clipboard.setString(item.code); Alert.alert('Copied', 'Voucher code ready to use!'); }} 
              style={styles.copyBtn}
            >
              <ThemedText style={styles.copyText}>COPY</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.root}>
      {/* FIXED RESPONSIVE HEADER */}
      <View style={[styles.tabOuterContainer, { paddingTop: dynamicTopPadding }]}>
        <View style={styles.headerTitleRow}>
          <ThemedText style={styles.mainTitle}>My Rewards</ThemedText>
        </View>
        
        <View style={styles.tabWrapper}>
          <Pressable
            style={[styles.tab, activeTab === "vouchers" && styles.activeTab]}
            onPress={() => setActiveTab("vouchers")}
          >
            <ThemedText style={[styles.tabLabel, activeTab === "vouchers" && styles.activeTabLabel]}>
              Available
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "promotions" && styles.activeTab]}
            onPress={() => setActiveTab("promotions")}
          >
            <ThemedText style={[styles.tabLabel, activeTab === "promotions" && styles.activeTabLabel]}>
              History
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={activeTab === "vouchers" ? vouchersData : historyData}
        renderItem={renderVoucher}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="gift" size={50} color="#E2E8F0" />
            <ThemedText style={{ color: '#94A3B8', marginTop: 10 }}>No vouchers found</ThemedText>
          </View>
        }
      />

      {/* SEARCH OVERLAY */}
      {isSearchActive && searchScope === 'deals' && (
        <View style={styles.searchOverlay}>
          {/* Backdrop */}
          <Pressable 
            style={styles.backdrop} 
            onPress={handleCloseSearch}
          />
          
          {/* Search Content */}
          <View style={[styles.searchContent, { backgroundColor: theme.backgroundRoot, paddingTop: dynamicTopPadding }]}>
            {/* Search Header */}
            <View style={[styles.searchHeader, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.searchInputWrapper}>
                <Feather name="search" size={20} color="#64748b" />
                <input
                  type="text"
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  placeholder="Search vouchers and deals..."
                  autoFocus
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: 16,
                    marginLeft: 12,
                    backgroundColor: 'transparent',
                    color: theme.text,
                  }}
                />
                {localSearchQuery.length > 0 && (
                  <Pressable
                    onPress={() => setLocalSearchQuery('')}
                    style={styles.clearButton}
                  >
                    <Feather name="x-circle" size={18} color="#64748b" />
                  </Pressable>
                )}
              </View>
              
              <Pressable onPress={handleCloseSearch} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            
            {/* Search Results */}
            <FlatList
              data={filteredData}
              renderItem={renderVoucher}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="search" size={48} color="#64748b" />
                  <ThemedText style={{ color: '#64748b', marginTop: 16, fontSize: 16 }}>
                    No vouchers found
                  </ThemedText>
                  <ThemedText style={{ color: '#9ca3af', marginTop: 8, fontSize: 13 }}>
                    Try searching with different keywords
                  </ThemedText>
                </View>
              }
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  tabOuterContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 999,
  },
  headerTitleRow: {
    marginBottom: 16,
    marginTop: 10,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B'
  },
  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    height: 52,
    width: '100%',
  },
  tab: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 10 
  },
  activeTab: { 
    backgroundColor: '#FFF', 
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3 
  },
  tabLabel: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  activeTabLabel: { color: PURPLE_PRIMARY },
  listContent: { padding: 20 },
  voucherCard: { padding: 16, marginBottom: 12, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  voucherContent: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  voucherDetails: { flex: 1, marginLeft: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voucherTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  descriptionText: { fontSize: 13, color: '#64748B' },
  copyBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: PURPLE_LIGHT, borderRadius: 8 },
  copyText: { fontSize: 11, fontWeight: '900', color: PURPLE_PRIMARY },
  emptyState: { alignItems: 'center', marginTop: 100 },
  
  // Search Overlay Styles
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  searchContent: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  clearButton: {
    padding: 4,
  },
  closeButton: {
    padding: 8,
  },
});