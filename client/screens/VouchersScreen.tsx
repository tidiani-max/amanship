import React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Voucher } from "@/types";
import { mockVouchers } from "@/data/mockData";

export default function VouchersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDiscount = (voucher: Voucher) => {
    if (voucher.discountType === "percentage") {
      return `${voucher.discount}% OFF`;
    }
    return `Rp ${voucher.discount.toLocaleString("id-ID")}`;
  };

  const renderVoucher = ({ item }: { item: Voucher }) => (
    <Card style={styles.voucherCard}>
      <View style={styles.voucherContent}>
        <View style={[styles.voucherBadge, { backgroundColor: theme.primary }]}>
          <Feather name="tag" size={24} color={theme.buttonText} />
        </View>
        <View style={styles.voucherDetails}>
          <ThemedText type="h3" style={{ color: theme.primary }}>
            {formatDiscount(item)}
          </ThemedText>
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
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Valid until {formatDate(item.validUntil)}
            </ThemedText>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <FlatList
        data={mockVouchers}
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
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.lg,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
  },
});
