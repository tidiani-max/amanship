import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, TextInput, ActivityIndicator, Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { CartToast } from "@/components/CartToast";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Category, Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { getImageUrl } from "@/lib/image-url";
import { useLanguage } from "@/context/LanguageContext";

const { width } = Dimensions.get("window");

// Responsive breakpoints - FIXED for mobile
const getResponsiveColumns = (screenWidth: number) => {
  if (screenWidth >= 1400) return 6;
  if (screenWidth >= 1200) return 5;
  if (screenWidth >= 900) return 4;
  if (screenWidth >= 600) return 3;
  return 2; // Mobile always 2 columns
};

const getResponsivePadding = (screenWidth: number) => {
  if (screenWidth >= 1200) return Spacing.xl * 2;
  if (screenWidth >= 900) return Spacing.xl;
  return Spacing.md; // Slightly tighter on mobile
};

const getProductCardWidth = (screenWidth: number, columns: number, padding: number) => {
  const totalPadding = padding * 2;
  const gapSpace = Spacing.sm * (columns - 1);
  return (screenWidth - totalPadding - gapSpace) / columns;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type UIProduct = Product & {
  inStock: boolean;
  stockCount: number;
};

interface APICategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  image: string | null;
}

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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { addToCart } = useCart();
  const { t } = useLanguage();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<string>("");
  const [screenWidth, setScreenWidth] = useState(width);

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const responsiveColumns = getResponsiveColumns(screenWidth);
  const responsivePadding = getResponsivePadding(screenWidth);
  const isMobile = screenWidth < 600;

  const {
    locationStatus,
    store,
    storeAvailable,
    estimatedDeliveryMinutes,
    isCheckingAvailability,
    requestLocationPermission,
    isManualLocation,
    addressLabel,
    gpsLocationName,
    location,
  } = useLocation();

  const getLocationDisplayName = () => {
    if (isManualLocation && addressLabel) {
      return addressLabel;
    }
    if (gpsLocationName) {
      return gpsLocationName;
    }
    if (store?.name) {
      return store.name;
    }
    return "Detecting location...";
  };

  const { data, isLoading: categoriesLoading } = useQuery<{ data: APICategory[] }>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/categories`);
      return res.json();
    },
  });

  const apiCategories = data?.data ?? [];
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  const { data: apiProducts = [], isLoading: productsLoading } = useQuery<APIProduct[]>({
    queryKey: ["/api/home/products", latitude, longitude],
    enabled: !!latitude && !!longitude,
    queryFn: async () => {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/home/products?lat=${latitude}&lng=${longitude}`
      );
      if (!res.ok) throw new Error("Failed to fetch home products");
      return res.json();
    },
  });

  const categories: Category[] = apiCategories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    image: c.image || undefined,
  }));

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
    inStock: p.stockCount > 0,
  }));

  const availableCategories = useMemo(() => {
    const categoryIdsWithProducts = new Set(
      products.filter(p => p.inStock).map(p => p.category)
    );
    return categories.filter(c => categoryIdsWithProducts.has(c.id));
  }, [categories, products]);

  const filteredProducts = useMemo<UIProduct[]>(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.brand.toLowerCase().includes(query)
    );
  }, [searchQuery, products]);

  const handleCategoryPress = (category: Category) => navigation.navigate("Category", { category });
  const handleProductPress = (product: UIProduct) => navigation.navigate("ProductDetail", { product });
  const formatPrice = (price: number) => `₹${price.toLocaleString("en-IN")}`;

  const handleAddToCart = (product: UIProduct) => {
    if (!product.inStock) return;
    addToCart(product, 1);
    setLastAddedProduct(product.name);
    setToastVisible(true);
  };

  const renderProductCard = (product: UIProduct) => {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) : 0;
    const cardWidth = getProductCardWidth(screenWidth, responsiveColumns, responsivePadding);

    return (
      <Pressable
        key={product.id}
        style={[
          styles.productCard,
          { 
            backgroundColor: theme.cardBackground,
            width: cardWidth,
          },
          !product.inStock && { opacity: 0.5 }
        ]}
        onPress={() => handleProductPress(product)}
      >
        {hasDiscount && product.inStock && (
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>{discountPercent}% OFF</ThemedText>
          </View>
        )}
        <View style={[styles.productImageContainer, { backgroundColor: '#fafafa' }]}>
          {product.image ? (
            <Image
              source={{ uri: getImageUrl(product.image) }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <Feather name="package" size={40} color="#d1d5db" />
          )}
          {!product.inStock && (
            <View style={styles.outOfStockOverlay}>
              <View style={styles.outOfStockBadge}>
                <ThemedText style={styles.outOfStockText}>OUT OF STOCK</ThemedText>
              </View>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <View style={styles.timerBadge}>
            <Feather name="clock" size={10} color="#10b981" />
            <ThemedText style={styles.timerText}>{estimatedDeliveryMinutes || 15} mins</ThemedText>
          </View>
          <ThemedText type="caption" numberOfLines={2} style={styles.productName}>
            {product.name}
          </ThemedText>
          <ThemedText type="small" style={styles.brandText} numberOfLines={1}>
            {product.brand}
          </ThemedText>
          <View style={styles.productFooter}>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={styles.priceText}>
                {formatPrice(product.price)}
              </ThemedText>
              {hasDiscount && (
                <ThemedText type="small" style={styles.originalPriceText}>
                  {formatPrice(product.originalPrice!)}
                </ThemedText>
              )}
            </View>
            <Pressable
              disabled={!product.inStock}
              style={[
                styles.addButton,
                { backgroundColor: product.inStock ? theme.primary : '#e5e7eb' }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handleAddToCart(product);
              }}
            >
              <ThemedText style={styles.addButtonText}>ADD</ThemedText>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const isLoading = categoriesLoading || productsLoading;
  const maxWidth = screenWidth > 1600 ? 1600 : screenWidth;
  const containerPadding = screenWidth > maxWidth ? (screenWidth - maxWidth) / 2 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      {/* STICKY DELIVERY TIMER HEADER */}
      {storeAvailable && store && !searchQuery && (
        <View style={[styles.stickyHeader, { backgroundColor: theme.primary, top: headerHeight }]}>
          <Feather name="zap" size={16} color="white" />
          <ThemedText style={styles.stickyHeaderText}>
            Delivery in {estimatedDeliveryMinutes || 15} minutes
          </ThemedText>
          <View style={styles.stickyHeaderDot} />
          <Feather name="map-pin" size={12} color="white" />
          <ThemedText style={styles.stickyHeaderStore} numberOfLines={1}>
            {store.name}
          </ThemedText>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerHeight + (storeAvailable && store && !searchQuery ? 40 : 0) + Spacing.md,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: containerPadding,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* SEARCH BAR */}
        <View style={[styles.searchContainer, { paddingHorizontal: responsivePadding }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search for products..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
          {isMobile && (
            <Pressable
              style={[styles.micButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate("VoiceOrderModal")}
            >
              <Feather name="mic" size={20} color="white" />
            </Pressable>
          )}
        </View>

        {/* LOCATION SELECTOR */}
        <Pressable 
          style={[styles.locationSelector, { backgroundColor: theme.cardBackground, marginHorizontal: responsivePadding }]}
          onPress={() => navigation.navigate("EditAddress")}
        >
          <View style={[styles.locationIcon, { backgroundColor: theme.primary + "15" }]}>
            <Feather 
              name={isManualLocation ? "home" : "navigation"}
              size={16} 
              color={theme.primary} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>
              Delivering to
            </ThemedText>
            <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "700", fontSize: 14, marginTop: 1 }}>
              {getLocationDisplayName()}
            </ThemedText>
          </View>
          <Feather name="chevron-down" size={18} color={theme.textSecondary} />
        </Pressable>

        {!storeAvailable && location && (
          <View style={[styles.warningBanner, { backgroundColor: "#fef3c7", marginHorizontal: responsivePadding }]}>
            <Feather name="alert-circle" size={16} color="#f59e0b" />
            <ThemedText type="caption" style={{ color: "#92400e", flex: 1, fontSize: 12 }}>
              No stores available in your area
            </ThemedText>
          </View>
        )}

        {locationStatus === "denied" && (
          <Pressable
            style={[styles.warningBanner, { backgroundColor: "#fef3c7", marginHorizontal: responsivePadding }]}
            onPress={requestLocationPermission}
          >
            <Feather name="map-pin" size={16} color="#f59e0b" />
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" style={{ fontWeight: "700", color: "#92400e" }}>
                Enable location for faster delivery
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={16} color="#f59e0b" />
          </Pressable>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={{ color: theme.textSecondary, marginTop: 12 }}>
              Loading products...
            </ThemedText>
          </View>
        )}

        {/* CATEGORIES */}
        {!searchQuery && availableCategories.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { paddingHorizontal: responsivePadding }]}>
              <ThemedText type="h3" style={styles.sectionTitle}>
                Shop by Category
              </ThemedText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.categoriesScroll, { paddingHorizontal: responsivePadding }]}
            >
              {availableCategories.map((category) => (
                <Pressable
                  key={category.id}
                  style={styles.categoryItem}
                  onPress={() => handleCategoryPress(category)}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + "15" }]}>
                    {category.image ? (
                      <Image
                        source={{ uri: getImageUrl(category.image) }}
                        style={styles.categoryImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Feather name={category.icon as any} size={28} color={category.color} />
                    )}
                  </View>
                  <ThemedText type="small" style={styles.categoryLabel} numberOfLines={1}>
                    {category.name}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* PRODUCTS GRID */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { paddingHorizontal: responsivePadding }]}>
            <ThemedText type="h3" style={styles.sectionTitle}>
              {searchQuery ? `"${searchQuery}"` : "Products"}
            </ThemedText>
            {filteredProducts.length > 0 && (
              <ThemedText style={styles.productCount}>
                {filteredProducts.length} items
              </ThemedText>
            )}
          </View>
          <View style={[styles.productsGrid, { paddingHorizontal: responsivePadding }]}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map(renderProductCard)
            ) : (
              <View style={styles.noResults}>
                <Feather name="search" size={48} color={theme.textSecondary} style={{ opacity: 0.3 }} />
                <ThemedText style={{ color: theme.textSecondary, marginTop: 12, fontSize: 15 }}>
                  No products found
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <CartToast
        visible={toastVisible}
        productName={lastAddedProduct}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    gap: 6,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  stickyHeaderText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  stickyHeaderDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'white',
    opacity: 0.6,
  },
  stickyHeaderStore: {
    color: 'white',
    fontSize: 11,
    opacity: 0.9,
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  loadingContainer: {
    padding: Spacing.xxl * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 18,
  },
  productCount: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  categoriesScroll: {
    gap: Spacing.md,
    paddingVertical: 4,
  },
  categoryItem: {
    alignItems: "center",
    width: 75,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  categoryImage: {
    width: 64,
    height: 64,
  },
  categoryLabel: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: '600',
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  productCard: {
    borderRadius: 14,
    overflow: "hidden",
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  productImageContainer: {
    height: 130,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: 'relative',
    padding: Spacing.sm,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    padding: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
    marginBottom: 6,
  },
  timerText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#065f46',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  productName: {
    marginBottom: 3,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 16,
    minHeight: 32,
    color: '#111827',
  },
  brandText: {
    color: '#6b7280',
    fontSize: 11,
    marginBottom: 6,
  },
  productFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  priceText: {
    fontWeight: '800',
    fontSize: 16,
    color: '#111827',
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  originalPriceText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 1,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  noResults: {
    width: '100%',
    alignItems: 'center',
    padding: 60,
  },
});