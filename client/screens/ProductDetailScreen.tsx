import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/image-url";

const { width } = Dimensions.get("window");

type ProductDetailRouteProp = RouteProp<RootStackParamList, "ProductDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { product } = route.params;
  const [quantity, setQuantity] = useState(1);
  const [showNutrition, setShowNutrition] = useState(false);
  const { addToCart } = useCart();

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    navigation.navigate("Cart");
  };

  const isOutOfStock = (product as any).stockCount <= 0;
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
    : 0;

  // Get store info if available
  const storeName = (product as any).storeName;
  const deliveryMinutes = (product as any).deliveryMinutes || 15;

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== ENHANCED IMAGE SECTION ===== */}
        <View style={styles.imageSection}>
          <View style={[styles.imageContainer, { backgroundColor: '#fafafa' }]}>
            {product.image ? (
              <Image 
                source={{ uri: getImageUrl(product.image) }} 
                style={styles.productImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Feather name="package" size={100} color="#d1d5db" />
              </View>
            )}
            
            {/* Discount Badge */}
            {hasDiscount && !isOutOfStock && (
              <View style={styles.discountBadge}>
                <ThemedText style={styles.discountText}>
                  {discountPercent}% OFF
                </ThemedText>
              </View>
            )}

            {/* Out of Stock Badge */}
            {isOutOfStock && (
              <View style={styles.outOfStockOverlay}>
                <View style={styles.outOfStockBadge}>
                  <ThemedText style={styles.outOfStockText}>
                    OUT OF STOCK
                  </ThemedText>
                </View>
              </View>
            )}
          </View>

          {/* Store & Delivery Info */}
          {storeName && (
            <View style={styles.deliveryInfoBar}>
              <View style={styles.deliveryInfoItem}>
                <Feather name="map-pin" size={16} color="#10b981" />
                <ThemedText style={styles.deliveryInfoText}>
                  {storeName}
                </ThemedText>
              </View>
              <View style={styles.deliveryDivider} />
              <View style={styles.deliveryInfoItem}>
                <Feather name="clock" size={16} color="#10b981" />
                <ThemedText style={styles.deliveryInfoText}>
                  {deliveryMinutes} mins delivery
                </ThemedText>
              </View>
            </View>
          )}
        </View>
        
        {/* ===== PRODUCT INFO SECTION ===== */}
        <View style={styles.content}>
          {/* Brand */}
          <View style={styles.brandBadge}>
            <ThemedText style={styles.brandText}>{product.brand}</ThemedText>
          </View>

          {/* Product Name */}
          <ThemedText type="h2" style={styles.productName}>
            {product.name}
          </ThemedText>
          
          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceContainer}>
              <ThemedText style={styles.currentPrice}>
                {formatPrice(product.price)}
              </ThemedText>
              {hasDiscount && (
                <ThemedText style={styles.originalPrice}>
                  {formatPrice(product.originalPrice!)}
                </ThemedText>
              )}
            </View>
            {hasDiscount && (
              <View style={styles.savingsBadge}>
                <ThemedText style={styles.savingsText}>
                  Save Rp {(product.originalPrice! - product.price).toLocaleString("id-ID")}
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.divider} />
          
          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <ThemedText type="h3" style={styles.sectionLabel}>
              Quantity
            </ThemedText>
            <View style={styles.quantityControls}>
              <Pressable
                style={[styles.quantityButton, { backgroundColor: theme.backgroundDefault }]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={isOutOfStock}
              >
                <Feather name="minus" size={20} color={isOutOfStock ? "#d1d5db" : theme.text} />
              </Pressable>
              <View style={styles.quantityDisplay}>
                <ThemedText style={styles.quantityText}>{quantity}</ThemedText>
              </View>
              <Pressable
                style={[styles.quantityButton, { backgroundColor: theme.primary }]}
                onPress={() => setQuantity(quantity + 1)}
                disabled={isOutOfStock}
              >
                <Feather name="plus" size={20} color="white" />
              </Pressable>
            </View>
          </View>

          {/* Stock Info */}
          {!isOutOfStock && (product as any).stockCount && (
            <View style={styles.stockInfo}>
              <Feather name="package" size={14} color="#059669" />
              <ThemedText style={styles.stockText}>
                {(product as any).stockCount} items available
              </ThemedText>
            </View>
          )}

          <View style={styles.divider} />
          
          {/* Description */}
          <View style={styles.descriptionSection}>
            <ThemedText type="h3" style={styles.sectionLabel}>
              Description
            </ThemedText>
            <ThemedText style={styles.descriptionText}>
              {product.description || "No description available for this product."}
            </ThemedText>
          </View>
          
          {/* Nutrition Facts */}
          {product.nutrition && (
            <View style={styles.nutritionSection}>
              <Pressable
                style={styles.nutritionHeader}
                onPress={() => setShowNutrition(!showNutrition)}
              >
                <View style={styles.nutritionHeaderLeft}>
                  <Feather name="info" size={20} color={theme.primary} />
                  <ThemedText type="h3" style={styles.sectionLabel}>
                    Nutrition Facts
                  </ThemedText>
                </View>
                <Feather
                  name={showNutrition ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={theme.textSecondary}
                />
              </Pressable>
              
              {showNutrition && (
                <View style={[styles.nutritionCard, { backgroundColor: theme.backgroundDefault }]}>
                  <View style={styles.nutritionRow}>
                    <View style={styles.nutritionLabel}>
                      <Feather name="activity" size={16} color="#6b7280" />
                      <ThemedText style={styles.nutritionLabelText}>Calories</ThemedText>
                    </View>
                    <ThemedText style={styles.nutritionValue}>
                      {product.nutrition.calories}
                    </ThemedText>
                  </View>
                  <View style={styles.nutritionDivider} />
                  <View style={styles.nutritionRow}>
                    <View style={styles.nutritionLabel}>
                      <Feather name="zap" size={16} color="#6b7280" />
                      <ThemedText style={styles.nutritionLabelText}>Protein</ThemedText>
                    </View>
                    <ThemedText style={styles.nutritionValue}>
                      {product.nutrition.protein}
                    </ThemedText>
                  </View>
                  <View style={styles.nutritionDivider} />
                  <View style={styles.nutritionRow}>
                    <View style={styles.nutritionLabel}>
                      <Feather name="pie-chart" size={16} color="#6b7280" />
                      <ThemedText style={styles.nutritionLabelText}>Carbs</ThemedText>
                    </View>
                    <ThemedText style={styles.nutritionValue}>
                      {product.nutrition.carbs}
                    </ThemedText>
                  </View>
                  <View style={styles.nutritionDivider} />
                  <View style={styles.nutritionRow}>
                    <View style={styles.nutritionLabel}>
                      <Feather name="droplet" size={16} color="#6b7280" />
                      <ThemedText style={styles.nutritionLabelText}>Fat</ThemedText>
                    </View>
                    <ThemedText style={styles.nutritionValue}>
                      {product.nutrition.fat}
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* ===== FOOTER WITH ADD TO CART ===== */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.lg,
            borderTopColor: 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View style={styles.footerContent}>
          <View style={styles.footerPriceSection}>
            <ThemedText style={styles.footerLabel}>Total Price</ThemedText>
            <ThemedText style={styles.footerPrice}>
              {formatPrice(product.price * quantity)}
            </ThemedText>
          </View>
          <Button
            onPress={handleAddToCart}
            style={[
              styles.addToCartButton,
              isOutOfStock && styles.disabledButton,
            ]}
            disabled={isOutOfStock}
          >
            <Feather 
              name={isOutOfStock ? "x-circle" : "shopping-cart"} 
              size={20} 
              color="white" 
              style={{ marginRight: 8 }}
            />
            {isOutOfStock ? "Out of Stock" : "Add to Cart"}
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

  // ===== IMAGE SECTION =====
  imageSection: {
    backgroundColor: 'white',
  },
  imageContainer: {
    width: '100%',
    height: 400,
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  discountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  outOfStockText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // ===== DELIVERY INFO BAR =====
  deliveryInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#d1fae5',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  deliveryInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryInfoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46',
  },
  deliveryDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#10b981',
    marginHorizontal: 20,
    opacity: 0.4,
  },

  // ===== CONTENT SECTION =====
  content: {
    padding: Spacing.xl,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: Spacing.lg,
    lineHeight: 32,
    color: '#111827',
  },

  // ===== PRICE SECTION =====
  priceSection: {
    marginBottom: Spacing.xl,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '900',
    color: '#10b981',
  },
  originalPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#9ca3af',
    textDecorationLine: "line-through",
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },

  // ===== DIVIDER =====
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: Spacing.xl,
  },

  // ===== QUANTITY SECTION =====
  quantitySection: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: Spacing.md,
    color: '#111827',
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  quantityDisplay: {
    minWidth: 60,
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  quantityText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
  },

  // ===== STOCK INFO =====
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },

  // ===== DESCRIPTION =====
  descriptionSection: {
    marginBottom: Spacing.xl,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#6b7280',
  },

  // ===== NUTRITION =====
  nutritionSection: {
    marginTop: Spacing.md,
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  nutritionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nutritionCard: {
    marginTop: Spacing.sm,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  nutritionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nutritionLabelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  nutritionDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },

  // ===== FOOTER =====
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.lg,
  },
  footerPriceSection: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  footerPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10b981',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
});