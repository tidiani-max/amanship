import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/image-url";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Purple theme colors to match your homepage design
const PURPLE_PRIMARY = "#6366F1"; 
const PURPLE_LIGHT = "#EEF2FF";

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
  const { addToCart } = useCart();

  // Updated to Indonesian Rupiah Format
  const formatPrice = (price: number): string => {
    const safePrice = Number(price) || 0;
    return `Rp ${safePrice.toLocaleString("id-ID")}`;
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

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* ===== HEADER ===== */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={28} color="#000" />
        </Pressable>
        <Pressable style={styles.iconBtn}>
          <Feather name="share-2" size={22} color="#000" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== IMAGE SECTION ===== */}
        <View style={styles.imageContainer}>
          <View style={styles.imageBg}>
            <Image 
              source={{ uri: getImageUrl(product.image) }} 
              style={styles.productImage}
              resizeMode="contain"
            />
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <ThemedText style={styles.discountText}>-{discountPercent}%</ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {/* Status Row: Purple for Brand, Emerald for Stock */}
          <View style={styles.statusRow}>
            <View style={styles.brandBadge}>
              <ThemedText style={styles.brandText}>{product.brand || 'Premium Selection'}</ThemedText>
            </View>
            <View style={styles.storeBadge}>
              <Feather name="check-circle" size={12} color="#065f46" />
              <ThemedText style={styles.storeText}>IN STOCK</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.productName}>{product.name}</ThemedText>
          
          <View style={styles.priceContainer}>
            <ThemedText style={styles.currentPrice}>{formatPrice(product.price)}</ThemedText>
            {hasDiscount && (
              <ThemedText style={styles.originalPrice}>{formatPrice(product.originalPrice!)}</ThemedText>
            )}
          </View>

          <ThemedText style={styles.descriptionText}>
            {product.description || "Indulge in the finest quality ingredients. This product is sourced responsibly to ensure peak freshness and taste for your daily needs."}
          </ThemedText>

          <View style={styles.divider} />

          {/* Quantity Selector - Pill Style with Purple Accents */}
          <View style={styles.quantitySection}>
            <ThemedText style={styles.sectionTitle}>Quantity</ThemedText>
            <View style={styles.qtyPicker}>
              <Pressable 
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={styles.qtyBtn}
              >
                <Feather name="minus" size={20} color="#000" />
              </Pressable>
              <ThemedText style={styles.qtyValue}>{quantity}</ThemedText>
              <Pressable 
                onPress={() => setQuantity(quantity + 1)}
                style={[styles.qtyBtn, { backgroundColor: PURPLE_PRIMARY }]}
              >
                <Feather name="plus" size={20} color="white" />
              </Pressable>
            </View>
          </View>

          {/* Nutrition Facts Toggle with Purple Icon */}
          {product.nutrition && (
            <Pressable 
              style={styles.nutritionToggle}
              onPress={() => setShowNutrition(!showNutrition)}
            >
              <View style={styles.row}>
                <View style={styles.infoCircle}>
                  <Feather name="info" size={16} color={PURPLE_PRIMARY} />
                </View>
                <ThemedText style={styles.nutritionTitle}>Nutrition Facts</ThemedText>
              </View>
              <Feather name={showNutrition ? "chevron-up" : "chevron-down"} size={20} color="#94A3B8" />
            </Pressable>
          )}

          {showNutrition && (
            <View style={styles.nutritionCard}>
              {Object.entries(product.nutrition || {}).map(([key, value]) => (
                <View key={key} style={styles.nutritionRow}>
                  <ThemedText style={styles.nutritionKey}>{key.toUpperCase()}</ThemedText>
                  <ThemedText style={styles.nutritionVal}>{String(value || '-')}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ===== FLOATING FOOTER ===== */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.footerInfo}>
          <ThemedText style={styles.totalLabel}>Total Price</ThemedText>
          <ThemedText style={styles.totalAmount}>{formatPrice(product.price * quantity)}</ThemedText>
        </View>
        <Button 
          onPress={handleAddToCart}
          style={[styles.addToCartBtn, { backgroundColor: PURPLE_PRIMARY }]}
          disabled={isOutOfStock}
        >
          <Feather name="shopping-bag" size={20} color="white" style={{ marginRight: 8 }} />
          Add to Basket
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  imageBg: {
    width: '100%',
    height: SCREEN_WIDTH * 0.85,
    backgroundColor: '#F8FAFC',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  productImage: {
    width: '85%',
    height: '85%',
  },
  discountBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  discountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    padding: 24,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandBadge: {
    backgroundColor: PURPLE_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '800',
    color: PURPLE_PRIMARY,
    textTransform: 'uppercase',
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  storeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#065f46',
  },
  productName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  currentPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000',
  },
  originalPrice: {
    fontSize: 18,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  descriptionText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 24,
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  qtyPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 6,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  qtyValue: {
    fontSize: 20,
    fontWeight: '900',
    paddingHorizontal: 20,
  },
  nutritionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  nutritionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  nutritionKey: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  nutritionVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  footerInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
  },
  addToCartBtn: {
    flex: 1.5,
    height: 58,
    borderRadius: 20,
  },
});