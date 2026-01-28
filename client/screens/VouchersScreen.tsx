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
    return dateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDiscount = (item: any) => {
    if (item.discountType === "percentage" || item.type === "percentage") {
      const value = item.discount || item.discountValue;
      return `${value}% OFF`;
    }
    const value = item.discount || item.discountValue;
    return `Rp ${value.toLocaleString("id-ID")}`;
  };

  const handleCopyVoucherCode = (voucher: any) => {
    Clipboard.setString(voucher.code);
    Alert.alert(
      'Copied! 🎉',
      `Voucher code "${voucher.code}" copied to clipboard.\n\nUse it at checkout to get ${formatDiscount(voucher)} off!`
    );
  };

  const renderVoucher = ({ item }: { item: any }) => (
    <Pressable onPress={() => handleCopyVoucherCode(item)}>
      <Card style={styles.voucherCard}>
        <View style={styles.voucherContent}>
          <View style={[styles.voucherBadge, { backgroundColor: item.color || theme.primary }]}>
            <Feather name={item.icon || "tag"} size={24} color={theme.buttonText} />
          </View>
          <View style={styles.voucherDetails}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ThemedText type="h3" style={{ color: item.color || theme.primary }}>
                {formatDiscount(item)}
              </ThemedText>
              {item.isRamadanSpecial && (
                <View style={styles.ramadanBadge}>
                  <ThemedText style={{ fontSize: 10, color: '#f59e0b', fontWeight: '700' }}>
                    🌙 RAMADAN
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText type="body" style={{ marginVertical: Spacing.xs }}>
              {item.description}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Min. order Rp {item.minOrder.toLocaleString("id-ID")}
            </ThemedText>
            <View style={styles.voucherFooter}>
              <View style={[styles.codeContainer, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText type="caption" style={{ fontWeight: "600" }}>
                  {item.code}
                </ThemedText>
                <Feather name="copy" size={12} color={theme.textSecondary} style={{ marginLeft: 6 }} />
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Valid until {formatDate(item.validUntil)}
              </ThemedText>
            </View>
            {item.usageLimit && (
              <View style={styles.usageInfo}>
                <Feather name="users" size={12} color="#6b7280" />
                <ThemedText type="small" style={{ color: '#6b7280', fontSize: 11 }}>
                  {item.usageLimit - item.usedCount} left • Max {item.userLimit} per user
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );

  const renderPromotion = ({ item }: { item: any }) => (
    <Card style={styles.voucherCard}>
      <View style={styles.voucherContent}>
        <View style={[styles.voucherBadge, { backgroundColor: item.color || theme.primary }]}>
          <Feather name={item.icon || "gift"} size={24} color={theme.buttonText} />
        </View>
        <View style={styles.voucherDetails}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemedText type="h3" style={{ color: item.color || theme.primary }}>
              {item.title}
            </ThemedText>
            {item.isRamadanSpecial && (
              <View style={styles.ramadanBadge}>
                <ThemedText style={{ fontSize: 10, color: '#f59e0b', fontWeight: '700' }}>
                  🌙 RAMADAN
                </ThemedText>
              </View>
            )}
          </View>
          
          <ThemedText type="body" style={{ marginVertical: Spacing.xs }}>
            {item.description}
          </ThemedText>
          
          {/* Discount info */}
          {item.discountValue && (
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: '700' }}>
              {formatDiscount(item)}
            </ThemedText>
          )}
          
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Min. order Rp {item.minOrder.toLocaleString("id-ID")}
          </ThemedText>

          {/* Store tag for store-specific promotions */}
          {item.storeName && (
            <View style={styles.storeTag}>
              <Feather name="map-pin" size={10} color="#059669" />
              <ThemedText style={styles.storeTagText}>
                {item.storeName}
              </ThemedText>
            </View>
          )}

          {/* Claimed date */}
          <View style={styles.claimedBadge}>
            <Feather name="check-circle" size={14} color="#065f46" />
            <ThemedText style={styles.claimedText}>
              Claimed on {formatDate(item.claimedAt)}
            </ThemedText>
          </View>

          <View style={styles.voucherFooter}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Valid until {formatDate(item.validUntil)}
            </ThemedText>
          </View>
        </View>
      </View>
    </Card>
  );

  const isLoading = activeTab === "vouchers" ? vouchersLoading : promotionsLoading;
  const data = activeTab === "vouchers" ? vouchersData : claimedPromotions;

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { paddingTop: headerHeight + Spacing.md }]}>
        <Pressable
          style={[
            styles.tab,
            activeTab === "vouchers" && { backgroundColor: theme.primary }
          ]}
          onPress={() => setActiveTab("vouchers")}
        >
          <Feather 
            name="tag" 
            size={20} 
            color={activeTab === "vouchers" ? "white" : theme.textSecondary} 
          />
          <ThemedText 
            style={[
              styles.tabText,
              { color: activeTab === "vouchers" ? "white" : theme.textSecondary }
            ]}
          >
            Vouchers
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            activeTab === "promotions" && { backgroundColor: theme.primary }
          ]}
          onPress={() => setActiveTab("promotions")}
        >
          <Feather 
            name="gift" 
            size={20} 
            color={activeTab === "promotions" ? "white" : theme.textSecondary} 
          />
          <ThemedText 
            style={[
              styles.tabText,
              { color: activeTab === "promotions" ? "white" : theme.textSecondary }
            ]}
          >
            My Promotions
          </ThemedText>
        </Pressable>
      </View>

      {/* Content */}
      <FlatList
        data={data}
        renderItem={activeTab === "vouchers" ? renderVoucher : renderPromotion}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Loading...
              </ThemedText>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Feather 
                name={activeTab === "vouchers" ? "tag" : "gift"} 
                size={48} 
                color={theme.textSecondary} 
              />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                {activeTab === "vouchers" 
                  ? "No vouchers available" 
                  : "No claimed promotions yet"}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs, textAlign: 'center', paddingHorizontal: Spacing.xl }}>
                {activeTab === "vouchers"
                  ? "Check back later for special offers and discounts!"
                  : "Go to the home page and claim promotions to see them here!"}
              </ThemedText>
            </View>
          )
        }
        ListHeaderComponent={
          data.length > 0 ? (
            <View style={styles.headerInfo}>
              <ThemedText type="h3" style={{ marginBottom: Spacing.xs }}>
                {activeTab === "vouchers" ? "Available Vouchers" : "My Claimed Promotions"}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {activeTab === "vouchers"
                  ? "Tap any voucher to copy the code, then paste it at checkout"
                  : "These promotions will automatically apply at checkout when conditions are met"}
              </ThemedText>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: '#f3f4f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  headerInfo: {
    marginBottom: Spacing.lg,
  },
  voucherCard: {
    marginBottom: Spacing.md,
  },
  voucherContent: {
    flexDirection: "row",
  },
  voucherBadge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  voucherDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  voucherFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  usageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  ramadanBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  storeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  storeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  claimedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
  },
});