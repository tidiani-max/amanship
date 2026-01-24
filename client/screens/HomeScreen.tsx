// ============================================
// 1. UPDATE HomeScreen.tsx - Enhanced Version
// ============================================

import React, { useState, useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, TextInput, ActivityIndicator, Dimensions, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { CartToast } from "@/components/CartToast";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Category, Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { getImageUrl } from "@/lib/image-url";

const { width } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Enhanced product type with store information
type UIProduct = Product & {
  inStock: boolean;
  stockCount: number;
  storeName?: string;
  storeDistance?: number;
  deliveryMinutes?: number;
  storeId?: string;
};

interface APIBanner {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  link?: string;
}

interface APIStore {
  id: string;
  name: string;
  distance: number;
  deliveryMinutes: number;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { addToCart } = useCart();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<string>("");
  const [screenWidth, setScreenWidth] = useState(width);
  const [selectedStore, setSelectedStore] = useState<APIStore | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  
  const bannerScrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const { location, store: nearestStore } = useLocation();
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  // Fetch banners
  const { data: bannersData } = useQuery<APIBanner[]>({
    queryKey: ["/api/banners"],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/banners`);
      return res.json();
    },
  });

  // Fetch nearby stores
  const { data: storesData = [] } = useQuery<APIStore[]>({
    queryKey: ["/api/stores/nearby", latitude, longitude],
    enabled: !!latitude && !!longitude,
    queryFn: async () => {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/stores/nearby?lat=${latitude}&lng=${longitude}`
      );
      const data = await res.json();
      return data.stores || [];
    },
  });

  // Fetch products (all or by store)
  const { data: apiProducts = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/home/products", latitude, longitude, selectedStore?.id],
    enabled: !!latitude && !!longitude,
    queryFn: async () => {
      let url = `${process.env.EXPO_PUBLIC_DOMAIN}/api/home/products?lat=${latitude}&lng=${longitude}`;
      if (selectedStore) {
        url += `&storeId=${selectedStore.id}`;
      }
      const res = await fetch(url);
      return res.json();
    },
  });

  // Auto-scroll banners
  useEffect(() => {
    if (!bannersData?.length) return;
    
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => {
        const next = (prev + 1) % bannersData.length;
        bannerScrollRef.current?.scrollTo({
          x: next * screenWidth,
          animated: true,
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [bannersData, screenWidth]);

  // Map products with store info
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
    storeName: p.storeName,
    storeDistance: p.distance,
    deliveryMinutes: p.deliveryMinutes,
    storeId: p.storeId,
  }));

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.brand.toLowerCase().includes(query)
    );
  }, [searchQuery, products]);

  const formatPrice = (price: number) => `₹${price.toLocaleString("en-IN")}`;

  const handleAddToCart = (product: UIProduct) => {
    if (!product.inStock) return;
    addToCart(product, 1);
    setLastAddedProduct(product.name);
    setToastVisible(true);
  };

  const renderProductCard = (product: UIProduct) => {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount 
      ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
      : 0;

    return (
      <Pressable
        key={product.id}
        style={[
          styles.productCard,
          { backgroundColor: theme.cardBackground },
          !product.inStock && { opacity: 0.5 }
        ]}
        onPress={() => navigation.navigate("ProductDetail", { product })}
      >
        {hasDiscount && product.inStock && (
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>{discountPercent}% OFF</ThemedText>
          </View>
        )}
        
        <View style={styles.productImageContainer}>
          {product.image ? (
            <Image
              source={{ uri: getImageUrl(product.image) }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <Feather name="package" size={40} color="#d1d5db" />
          )}
        </View>

        <View style={styles.productInfo}>
          {/* Store & Delivery Info */}
          <View style={styles.deliveryInfoRow}>
            <View style={styles.storeBadge}>
              <Feather name="map-pin" size={9} color="#059669" />
              <ThemedText style={styles.storeText} numberOfLines={1}>
                {product.storeName || "Store"}
              </ThemedText>
            </View>
            <View style={styles.timeBadge}>
              <Feather name="clock" size={9} color="#10b981" />
              <ThemedText style={styles.timeText}>
                {product.deliveryMinutes || 15} min
              </ThemedText>
            </View>
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      {/* Compact Header */}
      <View style={[styles.compactHeader, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.headerLeft}>
          {nearestStore && (
            <View style={styles.storeInfoCompact}>
              <Feather name="navigation" size={12} color="#10b981" />
              <ThemedText style={styles.storeNameSmall} numberOfLines={1}>
                {nearestStore.name}
              </ThemedText>
              <View style={styles.storeDot} />
              <ThemedText style={styles.storeMinutesSmall}>
                {storesData[0]?.deliveryMinutes || 15}min
              </ThemedText>
            </View>
          )}
        </View>
        
        <View style={styles.headerCenter}>
          <ThemedText style={styles.logoText}>KilatGo</ThemedText>
        </View>
        
        <View style={styles.headerRight}>
          <Pressable onPress={() => navigation.navigate("Notifications")}>
            <Feather name="bell" size={20} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: Spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search for products..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable
            style={[styles.micButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate("VoiceOrderModal")}
          >
            <Feather name="mic" size={20} color="white" />
          </Pressable>
        </View>

        {/* Dynamic Banners */}
        {bannersData && bannersData.length > 0 && (
          <View style={styles.bannerSection}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
            >
              {bannersData.map((banner) => (
                <Pressable key={banner.id} style={[styles.bannerSlide, { width: screenWidth - 32 }]}>
                  <Image 
                    source={{ uri: getImageUrl(banner.image) }} 
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                  <View style={styles.bannerOverlay}>
                    <ThemedText style={styles.bannerTitle}>{banner.title}</ThemedText>
                    <ThemedText style={styles.bannerSubtitle}>{banner.subtitle}</ThemedText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.bannerDots}>
              {bannersData.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    { backgroundColor: index === currentBannerIndex ? '#10b981' : '#d1d5db' }
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Store Selector */}
        {storesData.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="h3" style={styles.sectionTitle}>Nearby Stores</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeChips}>
              <Pressable
                style={[
                  styles.storeChip,
                  { backgroundColor: !selectedStore ? '#d1fae5' : theme.cardBackground }
                ]}
                onPress={() => setSelectedStore(null)}
              >
                <Feather name="grid" size={14} color={!selectedStore ? "#10b981" : "#6b7280"} />
                <ThemedText style={[
                  styles.storeChipText,
                  { color: !selectedStore ? "#10b981" : "#6b7280" }
                ]}>
                  All Stores
                </ThemedText>
              </Pressable>
              
              {storesData.map(store => (
  <Pressable
    key={store.id}
    style={[
      styles.storeChip,
      { backgroundColor: selectedStore?.id === store.id ? '#d1fae5' : theme.cardBackground }
    ]}
    onPress={() => setSelectedStore(store)}  // ← Just this simple line
  >
    <Feather 
      name="map-pin" 
      size={14} 
      color={selectedStore?.id === store.id ? "#10b981" : "#6b7280"} 
    />
    <ThemedText style={[
      styles.storeChipText,
      { color: selectedStore?.id === store.id ? "#10b981" : "#6b7280" }
    ]}>
      {store.name}
    </ThemedText>
    <ThemedText style={[
      styles.storeChipDistance,
      { color: selectedStore?.id === store.id ? "#10b981" : "#9ca3af" }
    ]}>
      {store.distance.toFixed(1)}km
    </ThemedText>
  </Pressable>
))}
            </ScrollView>
          </View>
        )}

        {/* Products Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3" style={styles.sectionTitle}>
              {selectedStore ? `${selectedStore.name} Products` : "All Products"}
            </ThemedText>
            {filteredProducts.length > 0 && (
              <ThemedText style={styles.productCount}>
                {filteredProducts.length} items
              </ThemedText>
            )}
          </View>
          
          {productsLoading ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(renderProductCard)
              ) : (
                <View style={styles.noResults}>
                  <Feather name="search" size={48} color={theme.textSecondary} />
                  <ThemedText style={{ color: theme.textSecondary, marginTop: 12 }}>
                    No products found
                  </ThemedText>
                </View>
              )}
            </View>
          )}
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
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  storeInfoCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    maxWidth: '100%',
  },
  storeNameSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
    flex: 1,
  },
  storeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#10b981',
  },
  storeMinutesSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10b981',
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
  bannerSection: {
    marginBottom: 24,
  },
  bannerSlide: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 0,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bannerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: '#d1fae5',
    fontSize: 13,
    fontWeight: '500',
  },
  bannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  storeChips: {
    marginTop: 12,
  },
  storeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  storeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  storeChipDistance: {
    fontSize: 11,
    fontWeight: '500',
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  productCard: {
    width: '48%',
    borderRadius: 14,
    overflow: "hidden",
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
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
  },
  productImageContainer: {
    height: 130,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#fafafa',
    padding: Spacing.sm,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    padding: Spacing.sm,
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flex: 1,
  },
  storeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#065f46',
    textTransform: 'uppercase',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#065f46',
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
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  originalPriceText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 1,
  },
  noResults: {
    width: '100%',
    alignItems: 'center',
    padding: 60,
  },
});