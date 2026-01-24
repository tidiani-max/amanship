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
const BASE_DELIVERY_MINUTES = 10;
const SPEED_KM_PER_MIN = 0.5;

// Responsive breakpoints
const getResponsiveColumns = (screenWidth: number) => {
  if (screenWidth >= 1400) return 6; // Extra large desktop
  if (screenWidth >= 1200) return 5; // Large desktop
  if (screenWidth >= 900) return 4;  // Desktop/Tablet landscape
  if (screenWidth >= 600) return 3;  // Tablet portrait
  return 2; // Mobile
};

const getResponsivePadding = (screenWidth: number) => {
  if (screenWidth >= 1200) return Spacing.xl * 2;
  if (screenWidth >= 900) return Spacing.xl;
  return Spacing.lg;
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

  // Handle screen resize
  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const responsiveColumns = getResponsiveColumns(screenWidth);
  const responsivePadding = getResponsivePadding(screenWidth);

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
  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;

  const handleAddToCart = (product: UIProduct) => {
    if (!product.inStock) return;
    addToCart(product, 1);
    setLastAddedProduct(product.name);
    setToastVisible(true);
  };

  const adsBanners = [
    { id: 1, title: "Fresh Groceries", subtitle: "Farm to doorstep delivery", color: "#10b981", img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800" },
    { id: 2, title: "Best Deals", subtitle: "Save up to 40% today", color: "#3b82f6", img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800" },
    { id: 3, title: "Express Delivery", subtitle: "Super fast to your door", color: "#f59e0b", img: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800" },
  ];

  const renderProductCard = (product: UIProduct) => {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) : 0;

    return (
      <Pressable
        key={product.id}
        style={[
          styles.productCard,
          { 
            backgroundColor: theme.cardBackground,
            width: `${(100 / responsiveColumns) - 1.5}%`,
          },
          !product.inStock && { opacity: 0.6 }
        ]}
        onPress={() => handleProductPress(product)}
      >
        {hasDiscount && product.inStock && (
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>-{discountPercent}%</ThemedText>
          </View>
        )}
        <View style={[styles.productImageContainer, { backgroundColor: '#f9fafb' }]}>
          {product.image ? (
            <Image
              source={{ uri: getImageUrl(product.image) }}
              style={styles.productImage}
              resizeMode="cover"
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
          <ThemedText type="small" style={styles.brandText} numberOfLines={1}>
            {product.brand}
          </ThemedText>
          <ThemedText type="caption" numberOfLines={2} style={styles.productName}>
            {product.name}
          </ThemedText>
          <View style={styles.productPriceRow}>
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
              <Feather 
                name={product.inStock ? "plus" : "slash"} 
                size={20} 
                color={product.inStock ? "white" : "#9ca3af"} 
              />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const isLoading = categoriesLoading || productsLoading;

  // Max width for very large screens
  const maxWidth = screenWidth > 1600 ? 1600 : screenWidth;
  const containerPadding = screenWidth > maxWidth ? (screenWidth - maxWidth) / 2 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
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
              placeholder={t.home.searchPlaceholder}
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
          <Pressable
            style={[styles.micButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate("VoiceOrderModal")}
          >
            <Feather name="mic" size={20} color="white" />
          </Pressable>
        </View>

        {/* LOCATION SELECTOR BANNER */}
        <View style={[styles.locationSelector, { backgroundColor: theme.cardBackground, marginHorizontal: responsivePadding }]}>
          <Pressable 
            style={styles.locationSelectorButton}
            onPress={() => navigation.navigate("EditAddress")}
          >
            <View style={[styles.locationIcon, { backgroundColor: theme.primary + "15" }]}>
              <Feather 
                name={isManualLocation ? "home" : "navigation"}
                size={18} 
                color={theme.primary} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 12 }}>
                Delivering to
              </ThemedText>
              <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "700", marginTop: 2 }}>
                {getLocationDisplayName()}
              </ThemedText>
              {!isManualLocation && gpsLocationName && (
                <View style={styles.gpsContainer}>
                  <View style={[styles.gpsBadge, { backgroundColor: "#10b981" + "20" }]}>
                    <Feather name="navigation" size={9} color="#10b981" />
                    <ThemedText type="small" style={{ color: "#10b981", fontSize: 10, marginLeft: 3, fontWeight: "600" }}>
                      GPS Active
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
          
          {!storeAvailable && location && (
            <View style={[styles.noStoreWarning, { backgroundColor: "#f59e0b" + "15" }]}>
              <Feather name="alert-circle" size={16} color="#f59e0b" />
              <ThemedText type="caption" style={{ color: "#f59e0b", flex: 1, fontSize: 12 }}>
                No stores available in this area
              </ThemedText>
            </View>
          )}
        </View>

        {/* LOCATION / STORE STATUS */}
        {locationStatus === "denied" ? (
          <Pressable
            style={[styles.locationBanner, { backgroundColor: "#f59e0b" + "15", marginHorizontal: responsivePadding }]}
            onPress={requestLocationPermission}
          >
            <Feather name="map-pin" size={18} color="#f59e0b" />
            <View style={styles.locationBannerText}>
              <ThemedText type="caption" style={{ fontWeight: "700" }}>
                {t.home.enableLocationTitle}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {t.home.enableLocationSubtitle}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : storeAvailable && store ? (
          <View style={[styles.storeInfoContainer, { marginHorizontal: responsivePadding }]}>
            <View style={[styles.deliveryBadge, { backgroundColor: theme.primary }]}>
              <Feather name="zap" size={18} color="white" />
              <ThemedText type="caption" style={{ color: "white", fontWeight: "700", fontSize: 13 }}>
                {estimatedDeliveryMinutes ? `${estimatedDeliveryMinutes}-${t.home.minuteDelivery}` : `15-${t.home.minuteDelivery}`}
              </ThemedText>
            </View>
            <View style={[styles.storeBadge, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="map-pin" size={14} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                {store.name}
              </ThemedText>
            </View>
          </View>
        ) : isCheckingAvailability ? (
          <View style={[styles.deliveryBadge, { backgroundColor: theme.backgroundDefault, marginLeft: responsivePadding, marginBottom: 10 }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {t.home.findingStore}
            </ThemedText>
          </View>
        ) : null}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}

        {/* CATEGORIES - Horizontal Scroll */}
        {!searchQuery && availableCategories.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="h3" style={[styles.sectionTitle, { paddingHorizontal: responsivePadding }]}>
              {t.home.categories}
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.categoriesScroll, { paddingHorizontal: responsivePadding }]}
            >
              {availableCategories.map((category) => (
                <Pressable
                  key={category.id}
                  style={styles.categoryItemHorizontal}
                  onPress={() => handleCategoryPress(category)}
                >
                  <View style={[styles.categoryIconLarge, { backgroundColor: category.color + "15" }]}>
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
                  <ThemedText type="small" style={styles.categoryLabel} numberOfLines={1}>
                    {category.name}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* POPULAR ITEMS */}
        <View style={styles.section}>
          <ThemedText type="h3" style={[styles.sectionTitle, { paddingHorizontal: responsivePadding }]}>
            {searchQuery ? `Results for "${searchQuery}"` : t.home.popularItems}
          </ThemedText>
          <View style={[styles.productsGrid, { paddingHorizontal: responsivePadding }]}>
            {filteredProducts.slice(0, responsiveColumns * 2).map(renderProductCard)}
          </View>
        </View>

        {/* ADVERTISEMENT BANNERS */}
        {!searchQuery && (
          <View style={styles.section}>
            <ScrollView
              horizontal
              pagingEnabled={screenWidth < 900}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.adsScrollContainer, { paddingHorizontal: responsivePadding }]}
            >
              {adsBanners.map((ad) => (
                <View key={ad.id} style={[
                  styles.adCard,
                  { 
                    backgroundColor: ad.color,
                    width: screenWidth >= 900 ? (maxWidth - responsivePadding * 2 - Spacing.md * 2) / 3 : maxWidth - responsivePadding * 2,
                  }
                ]}>
                  <Image source={{ uri: ad.img }} style={styles.adBackgroundImage} />
                  <View style={styles.adContent}>
                    <ThemedText style={styles.adTitle}>{ad.title}</ThemedText>
                    <ThemedText style={styles.adSubtitle}>{ad.subtitle}</ThemedText>
                    <View style={styles.adBadge}>
                      <ThemedText style={styles.adBadgeText}>Shop Now</ThemedText>
                      <Feather name="arrow-right" size={14} color="black" style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ALL PRODUCTS */}
        <View style={styles.section}>
          <ThemedText type="h3" style={[styles.sectionTitle, { paddingHorizontal: responsivePadding }]}>
            {searchQuery ? "All Matches" : "Explore All Products"}
          </ThemedText>
          <View style={[styles.productsGrid, { paddingHorizontal: responsivePadding }]}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map(renderProductCard)
            ) : (
              <View style={styles.noResults}>
                <Feather name="search" size={48} color={theme.textSecondary} style={{ opacity: 0.3 }} />
                <ThemedText style={{ color: theme.textSecondary, marginTop: 12, fontSize: 15 }}>
                  No items found
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
  searchContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  locationSelector: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  locationSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  noStoreWarning: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  locationBannerText: {
    flex: 1,
  },
  storeInfoContainer: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    fontWeight: '700',
  },
  categoriesScroll: {
    gap: Spacing.md,
  },
  categoryItemHorizontal: {
    alignItems: "center",
    width: 90,
  },
  categoryIconLarge: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
    overflow: "hidden",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryImageLarge: {
    width: 72,
    height: 72,
  },
  categoryLabel: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: '600',
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  productCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    position: 'relative',
    marginBottom: Spacing.sm,
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
    overflow: "hidden",
    position: 'relative',
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    padding: Spacing.md,
  },
  brandText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    marginBottom: 6,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
    minHeight: 36,
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  priceText: {
    fontWeight: '800',
    fontSize: 17,
    color: '#111827',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  discountText: {
    color: 'white',
    fontSize: 12,
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  noResults: {
    width: '100%',
    alignItems: 'center',
    padding: 60,
  },
  adsScrollContainer: {
    gap: Spacing.md,
  },
  adCard: {
    height: 180,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  adBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  adContent: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: Spacing.lg,
    justifyContent: 'flex-end',
  },
  adTitle: {
    color: 'white',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adSubtitle: {
    color: 'white',
    fontSize: 15,
    marginTop: 6,
    opacity: 0.95,
    fontWeight: '500',
  },
  adBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  adBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'black',
  },
});