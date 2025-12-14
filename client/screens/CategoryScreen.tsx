import React from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/image-url";
import { getApiUrl } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CategoryRouteProp = RouteProp<RootStackParamList, "Category">;

interface APIProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  image: string | null;
  categoryId: string;
  description: string | null;
  nutrition: any;
  inStock: boolean;
  stockCount: number;
}

export default function CategoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CategoryRouteProp>();
  const { category } = route.params;
  const { addToCart } = useCart();

  const { data: apiProducts = [], isLoading } = useQuery<APIProduct[]>({
    queryKey: ["/api/products", `categoryId=${category.id}`],
    queryFn: async () => {
      const url = new URL(`/api/products?categoryId=${category.id}`, getApiUrl());
      const res = await fetch(url.toString());
      return res.json();
    },
  });

  const products: Product[] = apiProducts.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    originalPrice: p.originalPrice || undefined,
    image: p.image || "",
    category: p.categoryId,
    description: p.description || "",
    nutrition: p.nutrition,
    inStock: p.inStock,
    stockCount: p.stockCount,
  }));

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate("ProductDetail", { product });
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Pressable
      style={[styles.productCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => handleProductPress(item)}
    >
      <View style={[styles.productImageContainer, { backgroundColor: theme.backgroundDefault }]}>
        {item.image ? (
          <Image source={{ uri: getImageUrl(item.image) }} style={styles.productImage} />
        ) : (
          <Feather name="package" size={32} color={theme.textSecondary} />
        )}
        {!item.inStock ? (
          <View style={[styles.outOfStock, { backgroundColor: theme.error }]}>
            <ThemedText type="small" style={{ color: "#FFFFFF", fontSize: 10 }}>
              {t.product.outOfStock}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.productInfo}>
        <ThemedText type="caption" numberOfLines={2} style={styles.productName}>
          {item.name}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {item.brand}
        </ThemedText>
        <View style={styles.priceRow}>
          <View>
            <ThemedText type="body" style={{ fontWeight: "600", color: theme.primary }}>
              {formatPrice(item.price)}
            </ThemedText>
            {item.originalPrice ? (
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, textDecorationLine: "line-through" }}
              >
                {formatPrice(item.originalPrice)}
              </ThemedText>
            ) : null}
          </View>
          {item.inStock ? (
            <Pressable 
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={(e) => {
                e.stopPropagation();
                handleAddToCart(item);
              }}
            >
              <Feather name="plus" size={16} color={theme.buttonText} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
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
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="package" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              {t.category.noProducts}
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
  row: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  productCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  productImageContainer: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  outOfStock: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  productInfo: {
    padding: Spacing.md,
  },
  productName: {
    marginBottom: Spacing.xs,
    minHeight: 36,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: Spacing.sm,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
