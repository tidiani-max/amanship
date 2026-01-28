import React from "react";
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

export default function VouchersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();

  // ✅ FIXED: Fetch real vouchers from API instead of mock data
  const { data: vouchersData = [], isLoading } = useQuery({
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

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDiscount = (voucher: any) => {
    if (voucher.discountType === "percentage") {
      return `${voucher.discount}% OFF`;
    }
    return `Rp ${voucher.discount.toLocaleString("id-ID")}`;
  };

  const handleCopyCode = (voucher: any) => {
    Clipboard.setString(voucher.code);
    Alert.alert(
      'Copied! 🎉',
      `Voucher code "${voucher.code}" copied to clipboard.\n\nUse it at checkout to get ${formatDiscount(voucher)} off!`
    );
  };

  const renderVoucher = ({ item }: { item: any }) => (
    <Pressable onPress={() => handleCopyCode(item)}>
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
            {/* Usage info */}
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="tag" size={48} color={theme.textSecondary} style={{ opacity: 0.3 }} />
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
          Loading vouchers...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <FlatList
        data={vouchersData}
        renderItem={renderVoucher}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="tag" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              No vouchers available
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs, textAlign: 'center', paddingHorizontal: Spacing.xl }}>
              Check back later for special offers and discounts!
            </ThemedText>
          </View>
        }
        ListHeaderComponent={
          vouchersData.length > 0 ? (
            <View style={styles.headerInfo}>
              <ThemedText type="h3" style={{ marginBottom: Spacing.xs }}>
                Available Vouchers
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Tap any voucher to copy the code, then paste it at checkout
              </ThemedText>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
  },
});