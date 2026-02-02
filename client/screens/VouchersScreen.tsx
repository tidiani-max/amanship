import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Clipboard, Alert, Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

type Tab = "vouchers" | "promotions";

const PURPLE_PRIMARY = "#6366F1";
const PURPLE_LIGHT = "#EEF2FF";

export default function VouchersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("vouchers");

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
      {/* FIXED RESPONSIVE HEADER - This part fixes your visibility issue */}
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
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="gift" size={50} color="#E2E8F0" />
            <ThemedText style={{ color: '#94A3B8', marginTop: 10 }}>No vouchers found</ThemedText>
          </View>
        }
      />
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
    // High Z-Index to stay on top
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
  metaRow: { marginTop: 10 },
  emptyState: { alignItems: 'center', marginTop: 100 }
});