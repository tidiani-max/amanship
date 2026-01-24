import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
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
import { useLocation } from "@/context/LocationContext";
import { CartToast } from "@/components/CartToast";

const { width } = Dimensions.get("window");

// Responsive breakpoints
const getResponsiveColumns = (screenWidth: number) => {
  if (screenWidth >= 1400) return 6;
  if (screenWidth >= 1200) return 5;
  if (screenWidth >= 900) return 4;
  if (screenWidth >= 600) return 3;
  return 2;
};

const getResponsivePadding = (screenWidth: number) => {
  if (screenWidth >= 1200) return Spacing.xl * 2;
  if (screenWidth >= 900) return Spacing.xl;
  return Spacing.md;
};

const getProductCardWidth = (screenWidth: number, columns: number, padding: number) => {
  const totalPadding = padding * 2;
  const gapSpace = Spacing.md * (columns - 1);
  return (screenWidth - totalPadding - gapSpace) / columns;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CategoryRouteProp = RouteProp<RootStackParamList, "Category">;

type UIProduct = Product & {
  inStock: boolean;
  stockCount: number;
  storeName?: string;
  storeDistance?: number;
  deliveryMinutes?: number;
  storeId?: string;
};

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
  stockCount: number;
  isAvailable: boolean;
  storeName?: string;
  distance?: number;
  deliveryMinutes?: number;
  storeId?: string;
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
  
  const [screenWidth, setScreenWidth] = useState(width);
  const [toastVisible, setToastVisible] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<string>("");

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const responsiveColumns = getResponsiveColumns(screenWidth);
  const responsivePadding = getResponsivePadding(screenWidth);

  const { location } = useLocation();
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  const { data: apiProducts = [], isLoading } = useQuery<APIProduct[]>({
    queryKey: ["/api/category/products", category.id, latitude, longitude],
    enabled: !!latitude && !!longitude && !!category.id,
    queryFn: async () => {
      const url = new URL("/api/category/products", getApiUrl());
      url.searchParams.set("categoryId", category.id);
      url.searchParams.set("lat", String(latitude));
      url.searchParams.set("lng", String(longitude));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch category products");
      return res.json();
    },
  });

  const products: UIProduct[] = apiProducts.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    originalPrice: p.originalPrice || undefined,
    image: p.image || "",
    category: p.categoryId,
    description: p.description || "",
    nutrition: p.nutrition,
    stockCount: p.stockCount,
    inStock: p.isAvailable && p.stockCount > 0,
    storeName: p.storeName,
    storeDistance: p.distance,
    deliveryMinutes: p.deliveryMinutes,
    storeId: p.storeId,
  }));

  // ✅ FORMAT AS INDONESIAN RUPIAH
  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;

  const handleProductPress = (product: UIProduct) =>
    navigation.navigate("ProductDetail", { product });

  const handleAddToCart = (product: UIProduct) => {
    if (!product.inStock) return;
    addToCart(product, 1);
    setLastAddedProduct(product.name);
    setToastVisible(true);
  };

  const renderProduct = ({ item }: { item: UIProduct }) => {
    const hasDiscount = item.originalPrice && item.originalPrice > item.price;
    const discountPercent = hasDiscount 
      ? Math.round(((item.originalPrice! - item.price) / item.originalPrice!) * 100) 
      : 0;
    const cardWidth = getProductCardWidth(screenWidth, responsiveColumns, responsivePadding);

    return (
      <Pressable
        style={[
          styles.productCard,
          { 
            backgroundColor: theme.cardBackground,
            width: cardWidth,
          },
          !item.inStock && { opacity: 0.5 }
        ]}
        onPress={() => handleProductPress(item)}
      >
        {hasDiscount && item.inStock && (
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>{discountPercent}% OFF</ThemedText>
          </View>
        )}
        
        <View style={styles.productImageContainer}>
          {item.image ? (
            <Image
              source={{ uri: getImageUrl(item.image) }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <Feather name="package" size={40} color="#d1d5db" />
          )}

          {!item.inStock && (
            <View style={styles.outOfStockOverlay}>
              <View style={styles.outOfStockBadge}>
                <ThemedText style={styles.outOfStockText}>OUT OF STOCK</ThemedText>
              </View>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          {/* Store and delivery info */}
          <View style={styles.deliveryInfoRow}>
            <View style={styles.storeBadge}>
              <Feather name="map-pin" size={9} color="#059669" />
              <ThemedText style={styles.storeText} numberOfLines={1}>
                {item.storeName || "Store"}
              </ThemedText>
            </View>
            <View style={styles.timeBadge}>
              <Feather name="clock" size={9} color="#10b981" />
              <ThemedText style={styles.timeText}>
                {item.deliveryMinutes || 15} min
              </ThemedText>
            </View>
          </View>
          
          <ThemedText type="caption" numberOfLines={2} style={styles.productName}>
            {item.name}
          </ThemedText>
          
          <ThemedText type="small" style={styles.brandText} numberOfLines={1}>
            {item.brand}
          </ThemedText>

          <View style={styles.productFooter}>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={styles.priceText}>
                {formatPrice(item.price)}
              </ThemedText>
              {hasDiscount && (
                <ThemedText type="small" style={styles.originalPriceText}>
                  {formatPrice(item.originalPrice!)}
                </ThemedText>
              )}
            </View>

            <Pressable
              disabled={!item.inStock}
              style={[
                styles.addButton,
                { backgroundColor: item.inStock ? theme.primary : '#e5e7eb' }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handleAddToCart(item);
              }}
            >
              <ThemedText style={styles.addButtonText}>ADD</ThemedText>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ color: theme.textSecondary, marginTop: 12 }}>
          Loading products...
        </ThemedText>
      </View>
    );
  }

  const maxWidth = screenWidth > 1600 ? 1600 : screenWidth;
  const containerPadding = screenWidth > maxWidth ? (screenWidth - maxWidth) / 2 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <View style={[styles.header, { paddingHorizontal: responsivePadding + containerPadding }]}>
        <View style={[styles.categoryBanner, { backgroundColor: category.color + "15" }]}>
          <View style={[styles.categoryIconLarge, { backgroundColor: category.color + "20" }]}>
            {category.image ? (
              <Image
                source={{ uri: getImageUrl(category.image) }}
                style={styles.categoryImageLarge}
                resizeMode="cover"
              />
            ) : (
              <Feather name={category.icon as any} size={32} color={category.color} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="h2" style={styles.categoryTitle}>
              {category.name}
            </ThemedText>
            <ThemedText style={styles.productCount}>
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.productsGrid, { paddingHorizontal: responsivePadding + containerPadding }]}>
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          key={responsiveColumns}
          numColumns={responsiveColumns}
          contentContainerStyle={{
            paddingTop: Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl + 80,
          }}
          columnWrapperStyle={{ gap: Spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="package" size={48} color={theme.textSecondary} style={{ opacity: 0.3 }} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, fontSize: 15 }}>
                No products found in this category
              </ThemedText>
            </View>
          }
        />
      </View>

      <CartToast
        visible={toastVisible}
        productName={lastAddedProduct}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  categoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 16,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryImageLarge: {
    width: 56,
    height: 56,
  },
  categoryTitle: {
    fontWeight: '800',
    fontSize: 22,
    marginBottom: 2,
  },
  productCount: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  productsGrid: {
    flex: 1,
  },
  productCard: {
    borderRadius: 16,
    overflow: "hidden",
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    height: 140,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#fafafa',
    overflow: "hidden",
    position: 'relative',
    padding: Spacing.md,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    padding: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    flex: 1,
  },
  storeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065f46',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  timeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065f46',
  },
  productName: {
    marginBottom: 4,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 17,
    minHeight: 34,
    color: '#111827',
  },
  brandText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  priceText: {
    fontWeight: '900',
    fontSize: 17,
    color: '#111827',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  originalPriceText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  discountText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 3,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});