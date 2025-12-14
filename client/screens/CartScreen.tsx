import React from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CartItem } from "@/types";
import { useCart } from "@/context/CartContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CartItemWithId extends CartItem {
  cartItemId?: string;
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { items, isLoading, updateQuantity, subtotal } = useCart();

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    updateQuantity(productId, newQuantity);
  };

  const deliveryFee = 10000;
  const total = subtotal + deliveryFee;

  const renderCartItem = ({ item }: { item: CartItemWithId }) => (
    <Card style={styles.cartItemCard}>
      <View style={styles.cartItemContent}>
        <View style={[styles.productImage, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="package" size={24} color={theme.textSecondary} />
        </View>
        <View style={styles.productDetails}>
          <ThemedText type="body" numberOfLines={2} style={{ fontWeight: "500" }}>
            {item.product.name}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {item.product.brand}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
            {formatPrice(item.product.price)}
          </ThemedText>
        </View>
        <View style={styles.quantityContainer}>
          <Pressable
            style={[styles.quantityBtn, { backgroundColor: theme.backgroundDefault }]}
            onPress={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
          >
            <Feather
              name={item.quantity === 1 ? "trash-2" : "minus"}
              size={14}
              color={item.quantity === 1 ? theme.error : theme.text}
            />
          </Pressable>
          <ThemedText type="body" style={styles.quantityText}>
            {item.quantity}
          </ThemedText>
          <Pressable
            style={[styles.quantityBtn, { backgroundColor: theme.primary }]}
            onPress={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
          >
            <Feather name="plus" size={14} color={theme.buttonText} />
          </Pressable>
        </View>
      </View>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <FlatList
        data={items as CartItemWithId[]}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.product.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: 200,
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="shopping-cart" size={64} color={theme.textSecondary} />
            <ThemedText type="h3" style={{ marginTop: Spacing.lg }}>
              Your cart is empty
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Add some items to get started
            </ThemedText>
            <Button
              variant="secondary"
              onPress={() => navigation.goBack()}
              style={{ marginTop: Spacing.xl }}
            >
              Browse Products
            </Button>
          </View>
        }
      />
      
      {items.length > 0 ? (
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
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Subtotal
              </ThemedText>
              <ThemedText type="body">{formatPrice(subtotal)}</ThemedText>
            </View>
            <View style={styles.priceRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Delivery Fee
              </ThemedText>
              <ThemedText type="body">{formatPrice(deliveryFee)}</ThemedText>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <ThemedText type="h3">Total</ThemedText>
              <ThemedText type="h3" style={{ color: theme.primary }}>
                {formatPrice(total)}
              </ThemedText>
            </View>
          </View>
          <Button onPress={() => navigation.navigate("Checkout")}>
            Proceed to Checkout
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  cartItemCard: {
    marginBottom: Spacing.md,
  },
  cartItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  productDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    minWidth: 24,
    textAlign: "center",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  priceBreakdown: {
    marginBottom: Spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  totalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
