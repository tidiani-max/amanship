import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ProductDetailRouteProp = RouteProp<RootStackParamList, "ProductDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { product } = route.params;
  const [quantity, setQuantity] = useState(1);
  const [showNutrition, setShowNutrition] = useState(false);

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const handleAddToCart = () => {
    navigation.navigate("Cart");
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.imageContainer, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="package" size={80} color={theme.textSecondary} />
          {product.originalPrice ? (
            <View style={[styles.discountBadge, { backgroundColor: theme.error }]}>
              <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
              </ThemedText>
            </View>
          ) : null}
        </View>
        
        <View style={styles.content}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {product.brand}
          </ThemedText>
          <ThemedText type="h2" style={styles.productName}>
            {product.name}
          </ThemedText>
          
          <View style={styles.priceContainer}>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {formatPrice(product.price)}
            </ThemedText>
            {product.originalPrice ? (
              <ThemedText
                type="body"
                style={{ color: theme.textSecondary, textDecorationLine: "line-through", marginLeft: Spacing.sm }}
              >
                {formatPrice(product.originalPrice)}
              </ThemedText>
            ) : null}
          </View>
          
          <View style={styles.quantityContainer}>
            <ThemedText type="body">Quantity:</ThemedText>
            <View style={styles.quantityControls}>
              <Pressable
                style={[styles.quantityButton, { backgroundColor: theme.backgroundDefault }]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Feather name="minus" size={18} color={theme.text} />
              </Pressable>
              <ThemedText type="h3" style={styles.quantityText}>
                {quantity}
              </ThemedText>
              <Pressable
                style={[styles.quantityButton, { backgroundColor: theme.primary }]}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Feather name="plus" size={18} color={theme.buttonText} />
              </Pressable>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <ThemedText type="h3" style={styles.sectionTitle}>
            Description
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {product.description}
          </ThemedText>
          
          {product.nutrition ? (
            <>
              <Pressable
                style={styles.nutritionHeader}
                onPress={() => setShowNutrition(!showNutrition)}
              >
                <ThemedText type="h3">Nutrition Facts</ThemedText>
                <Feather
                  name={showNutrition ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.text}
                />
              </Pressable>
              {showNutrition ? (
                <Card style={styles.nutritionCard}>
                  <View style={styles.nutritionRow}>
                    <ThemedText type="body">Calories</ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {product.nutrition.calories}
                    </ThemedText>
                  </View>
                  <View style={styles.nutritionRow}>
                    <ThemedText type="body">Protein</ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {product.nutrition.protein}
                    </ThemedText>
                  </View>
                  <View style={styles.nutritionRow}>
                    <ThemedText type="body">Carbs</ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {product.nutrition.carbs}
                    </ThemedText>
                  </View>
                  <View style={styles.nutritionRow}>
                    <ThemedText type="body">Fat</ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {product.nutrition.fat}
                    </ThemedText>
                  </View>
                </Card>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
      
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
              Total
            </ThemedText>
            <ThemedText type="h3" style={{ color: theme.primary }}>
              {formatPrice(product.price * quantity)}
            </ThemedText>
          </View>
          <Button
            onPress={handleAddToCart}
            style={styles.addToCartButton}
            disabled={!product.inStock}
          >
            {product.inStock ? "Add to Cart" : "Out of Stock"}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  discountBadge: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  content: {
    padding: Spacing.lg,
  },
  productName: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    minWidth: 32,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  nutritionCard: {
    marginTop: Spacing.sm,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
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
  addToCartButton: {
    flex: 1,
    marginLeft: Spacing.xl,
  },
});
