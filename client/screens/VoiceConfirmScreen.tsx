import React from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CartItem } from "@/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type VoiceConfirmRouteProp = RouteProp<RootStackParamList, "VoiceConfirm">;

export default function VoiceConfirmScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VoiceConfirmRouteProp>();
  const { items } = route.params;

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handleAddToCart = () => {
    navigation.navigate("Cart");
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemContent}>
        <View style={[styles.itemImage, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="package" size={24} color={theme.textSecondary} />
        </View>
        <View style={styles.itemDetails}>
          <ThemedText type="body" style={{ fontWeight: "500" }}>
            {item.product.name}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {item.product.brand}
          </ThemedText>
          <View style={styles.quantityRow}>
            <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
              {formatPrice(item.product.price)}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              x {item.quantity}
            </ThemedText>
          </View>
        </View>
        <View style={styles.itemActions}>
          <Pressable style={[styles.actionButton, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="edit-2" size={16} color={theme.text} />
          </Pressable>
          <Pressable style={[styles.actionButton, { backgroundColor: theme.error + "20" }]}>
            <Feather name="trash-2" size={16} color={theme.error} />
          </Pressable>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.product.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={[styles.successBadge, { backgroundColor: theme.success + "20" }]}>
              <Feather name="check-circle" size={16} color={theme.success} />
              <ThemedText type="caption" style={{ color: theme.success, fontWeight: "500" }}>
                {items.length} items detected from voice
              </ThemedText>
            </View>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Review and edit your order before adding to cart
            </ThemedText>
          </View>
        }
      />
      
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.lg,
          },
          Shadows.medium,
        ]}
      >
        <View style={styles.footerContent}>
          <View>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Total ({items.length} items)
            </ThemedText>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {formatPrice(total)}
            </ThemedText>
          </View>
          <Button onPress={handleAddToCart} style={styles.addButton}>
            Add to Cart
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  listHeader: {
    marginBottom: Spacing.xl,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    gap: Spacing.sm,
  },
  itemCard: {
    marginBottom: Spacing.md,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  itemDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  itemActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addButton: {
    flex: 1,
    marginLeft: Spacing.xl,
  },
});
