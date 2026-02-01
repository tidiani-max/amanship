import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Clipboard, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

type Tab = "vouchers" | "promotions";

export default function VouchersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("vouchers");

  // ===== FETCH VOUCHERS =====
  const { data: vouchersData = [], isLoading: vouchersLoading } = useQuery({
    queryKey: ["/api/vouchers/active", user?.id],
    queryFn: async () => {
      const url = user?.id 
        ? `${process.env.EXPO_PUBLIC_DOMAIN}/api/vouchers/active?userId=${user.id}`
        : `${process.env.EXPO_PUBLIC_DOMAIN}/api/vouchers/active`;
      
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // ===== FETCH CLAIMED PROMOTIONS =====
  const { data: claimedPromotions = [], isLoading: promotionsLoading } = useQuery({
    queryKey: ["/api/promotions/claimed", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/promotions/claimed?userId=${user.id}`
      );
      if (!res.ok) return [];
      return res.json();
    },
  });

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDiscount = (item: any) => {
    const value = item.discount || item.discountValue || 0;
    if (item.discountType === "percentage" || item.type === "percentage") {
      return `${value}% OFF`;
    }
    return `€${value}`;
  };

  const handleCopyVoucherCode = (voucher: any) => {
    Clipboard.setString(voucher.code);
    Alert.alert('Success', 'Code copied to clipboard!');
  };

  const renderVoucher = ({ item }: { item: any }) => (
    <Card style={styles.voucherCard}>
      <View style={styles.voucherContent}>
        {/* Icon Container with subtle background tint */}
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '10' }]}>
          <Feather name="tag" size={24} color={theme.primary} />
        </View>

        <View style={styles.voucherDetails}>
          <View style={styles.headerRow}>
            <View>
              <ThemedText type="h3" style={styles.voucherTitle}>
                {formatDiscount(item)}
              </ThemedText>
              <ThemedText style={styles.descriptionText}>
                {item.description}
              </ThemedText>
            </View>
            <Pressable onPress={() => handleCopyVoucherCode(item)} style={styles.copyBtn}>
              <ThemedText style={[styles.copyText, { color: theme.primary }]}>COPY</ThemedText>
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.storeTag}>
              <Feather name="shopping-bag" size={10} color="#065f46" />
              <ThemedText style={styles.storeTagText}>OFFICIAL STORE</ThemedText>
            </View>
            <ThemedText style={styles.expiryText}>
              Ends {formatDate(item.validUntil)}
            </ThemedText>
          </View>

          <View style={styles.usageBarContainer}>
             <View style={[styles.usageBar, { width: '40%', backgroundColor: theme.primary }]} />
          </View>
          <ThemedText style={styles.minSpendText}>
            Min. spend €{item.minOrder || 0}
          </ThemedText>
        </View>
      </View>
    </Card>
  );

  const renderPromotion = ({ item }: { item: any }) => (
    <Card style={styles.voucherCard}>
      <View style={styles.voucherContent}>
        <View style={[styles.iconContainer, { backgroundColor: '#ecfdf5' }]}>
          <Feather name="gift" size={24} color="#059669" />
        </View>
        <View style={styles.voucherDetails}>
          <View style={styles.headerRow}>
            <ThemedText type="h3" style={styles.voucherTitle}>{item.title}</ThemedText>
            <View style={styles.claimedBadge}>
              <Feather name="check-circle" size={12} color="#059669" />
              <ThemedText style={styles.claimedBadgeText}>Claimed</ThemedText>
            </View>
          </View>
          
          <ThemedText style={styles.descriptionText}>{item.description}</ThemedText>
          
          <View style={styles.storeTag}>
            <Feather name="zap" size={10} color="#065f46" />
            <ThemedText style={styles.storeTagText}>{item.storeName || 'PLATFORM WIDE'}</ThemedText>
          </View>

          <ThemedText style={[styles.expiryText, { marginTop: 8 }]}>
            Used on {formatDate(item.claimedAt)}
          </ThemedText>
        </View>
      </View>
    </Card>
  );

  const isLoading = activeTab === "vouchers" ? vouchersLoading : promotionsLoading;
  const data = activeTab === "vouchers" ? vouchersData : claimedPromotions;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header Tabs */}
      <View style={[styles.tabOuterContainer, { paddingTop: headerHeight + Spacing.sm }]}>
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
              Claimed
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={data}
        renderItem={activeTab === "vouchers" ? renderVoucher : renderPromotion}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="pocket" size={64} color="#D1D5DB" />
            <ThemedText style={styles.emptyTitle}>No rewards found</ThemedText>
            <ThemedText style={styles.emptySub}>Check back later for new deals!</ThemedText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabOuterContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 21,
  },
  activeTab: {
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabLabel: {
    color: '#000',
  },
  listContent: {
    padding: Spacing.lg,
  },
  voucherCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 0,
  },
  voucherContent: {
    flexDirection: 'row',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherDetails: {
    flex: 1,
    marginLeft: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  voucherTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  copyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  copyText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  storeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  storeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  expiryText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  usageBarContainer: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  usageBar: {
    height: '100%',
    borderRadius: 2,
  },
  minSpendText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  claimedBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    color: '#1E293B',
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
});