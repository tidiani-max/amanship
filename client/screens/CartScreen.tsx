import React from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Image, Platform } from "react-native";
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
        {/* NEW SQUIRCLE IMAGE DESIGN */}
        <View style={[styles.imageWrapper, { backgroundColor: '#f8fafc' }]}>
          {item.product.image ? (
            <Image source={{ uri: getImageUrl(item.product.image) }} style={styles.productImageContent} />
          ) : (
            <Feather name="package" size={24} color="#cbd5e1" />
          )}
        </View>

        <View style={styles.productDetails}>
          <ThemedText style={{ fontSize: 16, fontWeight: "800", color: '#1e293b' }} numberOfLines={1}>
            {item.product.name}
          </ThemedText>
          <ThemedText style={{ color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
            {item.product.brand}
          </ThemedText>
          
          {/* ONE-LINE PRICE DESIGN */}
          <ThemedText numberOfLines={1} adjustsFontSizeToFit style={{ fontWeight: '900', color: '#4f46e5', fontSize: 16 }}>
             {formatPrice(item.product.price)}
          </ThemedText>
        </View>

        {/* MODERN QUANTITY SELECTOR */}
        <View style={styles.quantityContainer}>
          <Pressable
            style={[styles.qtyBtn, { borderColor: '#f1f5f9', borderWidth: 1 }]}
            onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
          >
            <Feather
              name={item.quantity === 1 ? "trash-2" : "minus"}
              size={14}
              color={item.quantity === 1 ? "#ef4444" : "#64748b"}
            />
          </Pressable>
          <ThemedText style={styles.qtyText}>{item.quantity}</ThemedText>
          <Pressable
            onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
          >
            <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.qtyBtnGradient}>
               <Feather name="plus" size={14} color="white" />
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
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <FlatList
        data={items as CartItemWithId[]}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.product.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: headerHeight + 10,
          paddingBottom: 250,
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
                <Feather name="shopping-cart" size={40} color="#cbd5e1" />
            </View>
            <ThemedText style={{ fontSize: 20, fontWeight: '900', marginTop: 20 }}>Your cart is empty</ThemedText>
            <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 15 }}>
                <ThemedText style={{ color: '#4f46e5', fontWeight: '800' }}>Start Shopping</ThemedText>
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
            <View style={[styles.priceRow, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}>
              <ThemedText style={[styles.priceLabel, { color: '#1e293b', fontSize: 18 }]}>Total</ThemedText>
              <ThemedText style={{ fontSize: 22, fontWeight: '900', color: '#4f46e5' }}>{formatPrice(subtotal)}</ThemedText>
            </View>
          </View>

          <Pressable onPress={() => navigation.navigate("Checkout")}>
            <LinearGradient colors={['#4f46e5', '#7c3aed']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.checkoutBtn}>
              <ThemedText style={styles.checkoutBtnText}>Proceed to Checkout</ThemedText>
              <Feather name="arrow-right" size={20} color="white" />
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cartCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cartItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: 'center',
    alignItems: 'center'
  },
  productImageContent: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  productDetails: {
    flex: 1,
    marginLeft: 16,
  },
  quantityContainer: {
    alignItems: "center",
    justifyContent: 'space-between',
    height: 80,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#fff'
  },
  qtyBtnGradient: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "900",
    color: '#1e293b'
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 20,
  },
  priceContainer: {
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center'
  },
  priceLabel: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 14
  },
  priceValue: {
    color: '#1e293b',
    fontWeight: '800',
    fontSize: 14
  },
  checkoutBtn: {
    flexDirection: 'row',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },
  checkoutBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900'
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 100,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#f8fafc'
  },
});