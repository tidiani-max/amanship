import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CartItem } from "@/types";
import { useCart } from "@/context/CartContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type VoiceConfirmRouteProp = RouteProp<RootStackParamList, "VoiceConfirm">;

export default function VoiceConfirmScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VoiceConfirmRouteProp>();
  
  const { items: detectedItems } = route.params;
  const { addToCart } = useCart();
  const [items, setItems] = useState<CartItem[]>(detectedItems);
  const [isAdding, setIsAdding] = useState(false);

  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // --- NEW: Remove Item Logic ---
  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const handleAddToCart = async () => {
    if (items.length === 0) return;
    setIsAdding(true);
    try {
      items.forEach(item => addToCart(item.product, item.quantity));
      navigation.navigate("Cart");
    } catch (error) {
      Alert.alert("Error", "Could not add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.product.id}
        contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + Spacing.lg, paddingBottom: 140 }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="mic-off" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
              No items in this voice order.
            </ThemedText>
            <Button variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: Spacing.lg }}>
              Go Back
            </Button>
          </View>
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.listHeader}>
               <ThemedText type="h3">{items.length} Items Detected</ThemedText>
               <ThemedText type="body" style={{ color: theme.textSecondary }}>Review and edit before adding to cart.</ThemedText>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.itemCard}>
            <View style={styles.itemContent}>
              <View style={[styles.itemImage, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="shopping-bag" size={24} color={theme.primary} />
              </View>
              
              <View style={styles.itemDetails}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>{item.product.name}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.primary }}>{formatPrice(item.product.price)}</ThemedText>
              </View>

              <View style={styles.itemActions}>
                {/* Quantity Controls */}
                <View style={styles.qtyContainer}>
                  <Pressable onPress={() => handleUpdateQuantity(item.product.id, -1)} style={styles.qtyBtn}>
                    <Feather name="minus" size={14} color={theme.text} />
                  </Pressable>
                  <ThemedText style={styles.qtyText}>{item.quantity}</ThemedText>
                  <Pressable onPress={() => handleUpdateQuantity(item.product.id, 1)} style={styles.qtyBtn}>
                    <Feather name="plus" size={14} color={theme.text} />
                  </Pressable>
                </View>

                {/* DELETE BUTTON */}
                <Pressable 
                  onPress={() => handleRemoveItem(item.product.id)} 
                  style={[styles.deleteBtn, { backgroundColor: theme.error + '15' }]}
                >
                  <Feather name="trash-2" size={18} color={theme.error} />
                </Pressable>
              </View>
            </View>
          </Card>
        )}
      />
      
      {items.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }, Shadows.medium]}>
          <View style={styles.footerRow}>
            <View>
              <ThemedText type="caption">Total Value</ThemedText>
              <ThemedText type="h2" style={{ color: theme.primary }}>{formatPrice(total)}</ThemedText>
            </View>
            <Button onPress={handleAddToCart} loading={isAdding} style={styles.submitBtn}>
              Add All to Cart
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: Spacing.lg },
  listHeader: { marginBottom: Spacing.xl },
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 100 },
  itemCard: { marginBottom: Spacing.md, padding: Spacing.md },
  itemContent: { flexDirection: "row", alignItems: "center" },
  itemImage: { width: 48, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  itemDetails: { flex: 1, marginLeft: Spacing.md },
  itemActions: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  qtyContainer: { flexDirection: "row", alignItems: "center", backgroundColor: '#f5f5f5', borderRadius: 20, padding: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', ...Shadows.small },
  qtyText: { marginHorizontal: Spacing.md, fontWeight: "bold", fontSize: 14 },
  deleteBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: Spacing.lg, borderTopWidth: 1, borderTopColor: '#eee' },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  submitBtn: { flex: 1, marginLeft: 24 },
});