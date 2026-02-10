import React from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Image, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CartItem } from "@/types";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { getImageUrl } from "@/lib/image-url";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CartItemWithId extends CartItem {
  cartItemId?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HORIZONTAL_MARGIN = 20;
const CARD_PADDING = 16;
const IMAGE_SIZE = SCREEN_WIDTH < 375 ? 75 : 85; // Slightly larger for better visibility

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { items, isLoading, updateQuantity, subtotal } = useCart();
  const { t } = useLanguage();

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const renderCartItem = ({ item }: { item: CartItemWithId }) => (
    <View style={[styles.cartCard, { backgroundColor: '#fff' }]}>
      <View style={styles.cartItemContent}>
        {/* RESPONSIVE SQUIRCLE IMAGE */}
        <View style={[styles.imageWrapper, { backgroundColor: '#f8fafc' }]}>
          {item.product.image ? (
            <Image source={{ uri: getImageUrl(item.product.image) }} style={styles.productImageContent} />
          ) : (
            <Feather name="package" size={IMAGE_SIZE * 0.3} color="#cbd5e1" />
          )}
        </View>

        <View style={styles.productDetails}>
          <ThemedText style={styles.productName} numberOfLines={2}>
            {item.product.name}
          </ThemedText>
          <ThemedText style={styles.brandText} numberOfLines={1}>
            {item.product.brand}
          </ThemedText>
          
          {/* RESPONSIVE PRICE */}
          <ThemedText numberOfLines={1} adjustsFontSizeToFit style={styles.priceText}>
             {formatPrice(item.product.price)}
          </ThemedText>
        </View>

        {/* RESPONSIVE QUANTITY SELECTOR */}
        <View style={styles.quantityContainer}>
          <Pressable
            style={[styles.qtyBtn, { borderColor: '#f1f5f9', borderWidth: 1 }]}
            onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
          >
            <Feather
              name={item.quantity === 1 ? "trash-2" : "minus"}
              size={SCREEN_WIDTH < 375 ? 12 : 14}
              color={item.quantity === 1 ? "#ef4444" : "#64748b"}
            />
          </Pressable>
          <ThemedText style={styles.qtyText}>{item.quantity}</ThemedText>
          <Pressable
            onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
          >
            <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.qtyBtnGradient}>
               <Feather name="plus" size={SCREEN_WIDTH < 375 ? 12 : 14} color="white" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items as CartItemWithId[]}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.product.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Platform.OS === 'ios' ? 16 : headerHeight + 16,
            paddingBottom: items.length > 0 ? 220 : 100,
          }
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
                <Feather name="shopping-cart" size={SCREEN_WIDTH < 375 ? 32 : 40} color="#cbd5e1" />
            </View>
            <ThemedText style={styles.emptyTitle}>Your cart is empty</ThemedText>
            <Pressable onPress={() => navigation.goBack()} style={styles.startShoppingBtn}>
                <ThemedText style={styles.startShoppingText}>Start Shopping</ThemedText>
            </Pressable>
          </View>
        }
      />
      
      {items.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.priceValue}>{formatPrice(subtotal)}</ThemedText>
            </View>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>{formatPrice(subtotal)}</ThemedText>
            </View>
          </View>

          <Pressable onPress={() => navigation.navigate("Checkout")}>
            <LinearGradient 
              colors={['#4f46e5', '#7c3aed']} 
              start={{x:0, y:0}} 
              end={{x:1, y:0}} 
              style={styles.checkoutBtn}
            >
              <ThemedText style={styles.checkoutBtnText}>Proceed to Checkout</ThemedText>
              <Feather name="arrow-right" size={SCREEN_WIDTH < 375 ? 18 : 20} color="white" />
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#f8fafc'
  },
  listContent: {
    paddingHorizontal: CARD_HORIZONTAL_MARGIN,
  },
  cartCard: {
    borderRadius: SCREEN_WIDTH < 375 ? 20 : 24,
    padding: SCREEN_WIDTH < 375 ? 14 : 16,
    marginBottom: 14,
    marginTop: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cartItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: SCREEN_WIDTH < 375 ? 16 : 20,
    overflow: "hidden",
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  productImageContent: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  productDetails: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
    justifyContent: 'center',
    minWidth: 0, // Important for text truncation
  },
  productName: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    fontWeight: "800",
    color: '#1e293b',
    marginBottom: 5,
    lineHeight: SCREEN_WIDTH < 375 ? 18 : 20,
  },
  brandText: {
    color: '#64748b',
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceText: {
    fontWeight: '900',
    color: '#4f46e5',
    fontSize: SCREEN_WIDTH < 375 ? 15 : 17,
  },
  quantityContainer: {
    alignItems: "center",
    justifyContent: 'space-between',
    height: IMAGE_SIZE,
    flexShrink: 0,
  },
  qtyBtn: {
    width: SCREEN_WIDTH < 375 ? 26 : 28,
    height: SCREEN_WIDTH < 375 ? 26 : 28,
    borderRadius: SCREEN_WIDTH < 375 ? 8 : 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#fff',
  },
  qtyBtnGradient: {
    width: SCREEN_WIDTH < 375 ? 26 : 28,
    height: SCREEN_WIDTH < 375 ? 26 : 28,
    borderRadius: SCREEN_WIDTH < 375 ? 8 : 10,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
    fontWeight: "900",
    color: '#1e293b',
    minWidth: 20,
    textAlign: 'center',
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: SCREEN_WIDTH < 375 ? 28 : 32,
    borderTopRightRadius: SCREEN_WIDTH < 375 ? 28 : 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 20,
  },
  priceContainer: {
    marginBottom: SCREEN_WIDTH < 375 ? 16 : 20,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    marginBottom: 10,
  },
  priceLabel: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
  },
  priceValue: {
    color: '#1e293b',
    fontWeight: '800',
    fontSize: SCREEN_WIDTH < 375 ? 13 : 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  totalLabel: {
    color: '#1e293b',
    fontSize: SCREEN_WIDTH < 375 ? 16 : 18,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: SCREEN_WIDTH < 375 ? 20 : 22,
    fontWeight: '900',
    color: '#4f46e5',
  },
  checkoutBtn: {
    flexDirection: 'row',
    height: SCREEN_WIDTH < 375 ? 54 : 60,
    borderRadius: SCREEN_WIDTH < 375 ? 16 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  checkoutBtnText: {
    color: 'white',
    fontSize: SCREEN_WIDTH < 375 ? 16 : 18,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 100,
  },
  emptyIconCircle: {
    width: SCREEN_WIDTH < 375 ? 90 : 100,
    height: SCREEN_WIDTH < 375 ? 90 : 100,
    borderRadius: SCREEN_WIDTH < 375 ? 36 : 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 18 : 20,
    fontWeight: '900',
    marginTop: 20,
    color: '#1e293b',
  },
  startShoppingBtn: {
    marginTop: 15,
    paddingVertical: 8,
  },
  startShoppingText: {
    color: '#4f46e5',
    fontWeight: '800',
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#f8fafc',
  },
});