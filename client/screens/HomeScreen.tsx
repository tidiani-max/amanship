import React, { useState, useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, TextInput, ActivityIndicator, Dimensions, Animated, Platform, Clipboard, Alert } from "react-native";
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
import { useAuth } from "@/context/AuthContext";

const { width } = Dimensions.get("window");

// ===== RESPONSIVE BREAKPOINTS =====
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

const getBannerHeight = (screenWidth: number) => {
  if (screenWidth >= 1200) return 300;
  if (screenWidth >= 900) return 250;
  if (screenWidth >= 600) return 220;
  return 200;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

interface APICategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  image: string | null;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<string>("");
  const [screenWidth, setScreenWidth] = useState(width);
  const [selectedStore, setSelectedStore] = useState<APIStore | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  
  const bannerScrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const {
    location,
    store: nearestStore,
    storeAvailable,
    isManualLocation,
    addressLabel,
    gpsLocationName,
  } = useLocation();
  
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  // Track screen width changes for responsiveness
  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Responsive calculations
  const responsiveColumns = getResponsiveColumns(screenWidth);
  const responsivePadding = getResponsivePadding(screenWidth);
  const bannerHeight = getBannerHeight(screenWidth);
  const isMobile = screenWidth < 600;
  const maxWidth = screenWidth > 1600 ? 1600 : screenWidth;
  const containerPadding = screenWidth > maxWidth ? (screenWidth - maxWidth) / 2 : 0;

  // Get location display name
  const getLocationDisplayName = (): string => {
    if (isManualLocation && addressLabel) return String(addressLabel);
    if (gpsLocationName) return String(gpsLocationName);
    if (nearestStore?.name) return String(nearestStore.name);
    return "Detecting location...";
  };

  // Fetch categories
  const { data: categoriesData } = useQuery<{ data: APICategory[] }>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/categories`);
      return res.json();
    },
  });

  const apiCategories = categoriesData?.data ?? [];

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

  // ✅ FIXED: Fetch active promotions/banners from both app-wide and nearby stores
  const { data: promotionsData = [] } = useQuery({
    queryKey: ["/api/promotions/banners", latitude, longitude],
    enabled: !!latitude && !!longitude,
    queryFn: async () => {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/promotions/banners?lat=${latitude}&lng=${longitude}`
      );
      if (!res.ok) return [];
      return res.json();
    },
  });

  // ✅ FIXED: Fetch active vouchers with proper null check
  const { data: vouchersData = [] } = useQuery({
    queryKey: ["/api/vouchers/active", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/vouchers/active?userId=${user.id}`
      );
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Auto-scroll banners
  useEffect(() => {
    if (!bannersData?.length) return;
    
    const bannerWidth = screenWidth > maxWidth ? maxWidth - (responsivePadding * 2) : screenWidth - (responsivePadding * 2);
    
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => {
        const next = (prev + 1) % bannersData.length;
        bannerScrollRef.current?.scrollTo({
          x: next * bannerWidth,
          animated: true,
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [bannersData, screenWidth, maxWidth, responsivePadding]);

  // Map products with store info
  const products: UIProduct[] = (apiProducts || []).map((p) => ({
    id: String(p.id || ''),
    name: String(p.name || 'Product'),
    brand: String(p.brand || 'Brand'),
    price: Number(p.price) || 0,
    originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
    image: p.image ? String(p.image) : "",
    category: String(p.categoryId || ''),
    description: p.description ? String(p.description) : "",
    nutrition: p.nutrition,
    stockCount: Number(p.stockCount) || 0,
    inStock: Number(p.stockCount) > 0,
    storeName: p.storeName ? String(p.storeName) : undefined,
    storeDistance: p.distance ? Number(p.distance) : undefined,
    deliveryMinutes: p.deliveryMinutes ? Number(p.deliveryMinutes) : undefined,
    storeId: p.storeId ? String(p.storeId) : undefined,
  }));

  // Map categories
  const categories: Category[] = (apiCategories || []).map((c) => ({
    id: String(c.id || ''),
    name: String(c.name || 'Category'),
    icon: String(c.icon || 'package'),
    color: String(c.color || '#10b981'),
    image: c.image ? String(c.image) : undefined,
  }));

  // Filter categories that have products in stock
  const availableCategories = useMemo(() => {
    const categoryIdsWithProducts = new Set(
      products.filter(p => p.inStock).map(p => p.category)
    );
    return categories.filter(c => categoryIdsWithProducts.has(c.id));
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.brand.toLowerCase().includes(query)
    );
  }, [searchQuery, products]);

  const formatPrice = (price: number): string => {
    const safePrice = Number(price) || 0;
    return `Rp ${safePrice.toLocaleString("id-ID")}`;
  };

  const handleAddToCart = (product: UIProduct) => {
    if (!product.inStock) return;
    addToCart(product, 1);
    setLastAddedProduct(product.name);
    setToastVisible(true);
  };

  const handleCategoryPress = (category: Category) => {
    navigation.navigate("Category", { category });
  };

  // ✅ FIXED: Handle promotion claim
  const handlePromotionClaim = (promo: any) => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "Please log in to claim this promotion",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => navigation.navigate("Login" as any) }
        ]
      );
      return;
    }

    // Show promotion details
    Alert.alert(
      `🌙 ${promo.title}`,
      `${promo.description}\n\n${
        promo.scope === "store" && promo.storeName 
          ? `Available at: ${promo.storeName}` 
          : "Available at all stores"
      }\n\nThis promotion will be automatically applied at checkout!`,
      [{ text: "Got it!", style: "default" }]
    );
  };

  const renderProductCard = (product: UIProduct) => {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount 
      ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
      : 0;

    const cardWidth = getProductCardWidth(
      screenWidth > maxWidth ? maxWidth : screenWidth, 
      responsiveColumns, 
      responsivePadding
    );

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
        onPress={() => navigation.navigate("ProductDetail", { product })}
      >
        {hasDiscount && product.inStock && (
          <View style={styles.discountBadge}>
            <ThemedText style={styles.discountText}>{String(discountPercent)}% OFF</ThemedText>
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
          <View style={styles.deliveryInfoRow}>
            <View style={styles.storeBadge}>
              <Feather name="map-pin" size={9} color="#059669" />
              <ThemedText style={styles.storeText} numberOfLines={1}>
                {String(product.storeName || "Store")}
              </ThemedText>
            </View>
            <View style={styles.timeBadge}>
              <Feather name="clock" size={9} color="#10b981" />
              <ThemedText style={styles.timeText}>
                {String(product.deliveryMinutes || 15)} min
              </ThemedText>
            </View>
          </View>

          <ThemedText type="caption" numberOfLines={2} style={styles.productName}>
            {String(product.name || 'Product')}
          </ThemedText>
          <ThemedText type="small" style={styles.brandText} numberOfLines={1}>
            {String(product.brand || 'Brand')}
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
      {/* ===== FIXED HEADER ===== */}
      <View style={[
        styles.compactHeader, 
        { 
          backgroundColor: theme.cardBackground,
          paddingTop: insets.top + 8,
        }
      ]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {nearestStore && (
              <View style={styles.storeInfoCompact}>
                <Feather name="navigation" size={12} color="#10b981" />
                <ThemedText style={styles.storeNameSmall} numberOfLines={1}>
                  {String(nearestStore.name || 'Store')}
                </ThemedText>
                <View style={styles.storeDot} />
                <ThemedText style={styles.storeMinutesSmall}>
                  {String((storesData[0]?.deliveryMinutes || 15))}min
                </ThemedText>
              </View>
            )}
          </View>
          
          <View style={styles.headerCenter}>
            <ThemedText style={styles.logoText}>KilatGo</ThemedText>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: containerPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== LOCATION SELECTOR ===== */}
        <View style={{ paddingHorizontal: responsivePadding, marginBottom: Spacing.lg }}>
          <Pressable 
            style={[styles.locationSelector, { backgroundColor: theme.cardBackground }]}
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
              <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
                Delivering to
              </ThemedText>
              <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "700", fontSize: 15, marginTop: 2 }}>
                {getLocationDisplayName()}
              </ThemedText>
            </View>
            <Feather name="chevron-down" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* ===== SEARCH BAR ===== */}
        <View style={{ paddingHorizontal: responsivePadding, marginBottom: Spacing.xl }}>
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="search" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search products, brands..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
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
        </View>

        {/* ===== DYNAMIC BANNERS ===== */}
        {bannersData && bannersData.length > 0 && (
          <View style={[styles.bannerSection, { paddingHorizontal: responsivePadding }]}>
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
                <Pressable 
                  key={banner.id} 
                  style={[
                    styles.bannerSlide, 
                    { 
                      width: screenWidth > maxWidth 
                        ? maxWidth - (responsivePadding * 2) 
                        : screenWidth - (responsivePadding * 2),
                      height: bannerHeight,
                    }
                  ]}
                >
                  <Image 
                    source={{ uri: banner.image }} 
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                  <View style={styles.bannerOverlay}>
                    <ThemedText style={[styles.bannerTitle, { fontSize: isMobile ? 20 : 26 }]}>
                      {banner.title}
                    </ThemedText>
                    <ThemedText style={[styles.bannerSubtitle, { fontSize: isMobile ? 14 : 17 }]}>
                      {banner.subtitle}
                    </ThemedText>
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

        {/* ===== PROMOTIONS SECTION (App-wide + Nearby Stores) ===== */}
        {promotionsData && promotionsData.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: responsivePadding }]}>
            <View style={styles.ramadanHeader}>
              <ThemedText type="h3" style={styles.sectionTitle}>
                🎉 Special Promotions
              </ThemedText>
              <Pressable onPress={() => navigation.navigate("Vouchers")}>
                <ThemedText style={{ color: theme.primary, fontWeight: '600' }}>
                  View All
                </ThemedText>
              </Pressable>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.md, paddingVertical: Spacing.sm }}
            >
              {promotionsData.map((promo: any) => (
                <Pressable
                  key={promo.id}
                  style={[styles.promoCard, { 
                    backgroundColor: (promo.color || '#10b981') + '15',
                    borderColor: promo.color || '#10b981'
                  }]}
                  onPress={() => handlePromotionClaim(promo)}
                >
                  <Feather name={promo.icon || 'gift'} size={32} color={promo.color || '#10b981'} />
                  <ThemedText style={styles.promoTitle} numberOfLines={2}>
                    {promo.title}
                  </ThemedText>
                  <ThemedText style={styles.promoDesc} numberOfLines={2}>
                    {promo.description}
                  </ThemedText>
                  {promo.scope === "store" && promo.storeName && (
                    <View style={styles.storePromoBadge}>
                      <Feather name="map-pin" size={10} color="#059669" />
                      <ThemedText style={styles.storePromoText} numberOfLines={1}>
                        {promo.storeName}
                      </ThemedText>
                    </View>
                  )}
                  <View style={[styles.promoButton, { backgroundColor: promo.color || '#10b981' }]}>
                    <ThemedText style={{ color: 'white', fontWeight: '700' }}>
                      CLAIM NOW
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ===== VOUCHERS SECTION ===== */}
        {vouchersData && vouchersData.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: responsivePadding }]}>
            <ThemedText type="h3" style={styles.sectionTitle}>
              🎫 Available Vouchers
            </ThemedText>
            
            <View style={{ gap: Spacing.sm }}>
              {vouchersData.slice(0, 3).map((voucher: any) => (
                <Pressable
                  key={voucher.id}
                  style={[styles.voucherCard, { 
                    backgroundColor: theme.cardBackground,
                    borderLeftColor: voucher.color || theme.primary,
                    borderLeftWidth: 4
                  }]}
                  onPress={() => {
                    Clipboard.setString(voucher.code);
                    Alert.alert('Copied!', `Voucher code "${voucher.code}" copied to clipboard`);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name={voucher.icon || 'tag'} size={16} color={voucher.color || theme.primary} />
                      <ThemedText style={{ fontWeight: '800', fontSize: 16 }}>
                        {voucher.code}
                      </ThemedText>
                      {voucher.isRamadanSpecial && (
                        <View style={styles.ramadanBadge}>
                          <ThemedText style={{ fontSize: 10, color: '#f59e0b' }}>
                            🌙 RAMADAN
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText style={{ color: theme.textSecondary, marginTop: 4 }}>
                      {voucher.description}
                    </ThemedText>
                  </View>
                  <Feather name="copy" size={20} color={theme.primary} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ===== CATEGORIES SECTION ===== */}
        {!searchQuery && availableCategories.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: responsivePadding }]}>
            <ThemedText type="h3" style={styles.sectionTitle}>Shop by Category</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
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

        {/* ===== STORE SELECTOR ===== */}
        {storesData.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: responsivePadding }]}>
            <ThemedText type="h3" style={styles.sectionTitle}>Nearby Stores</ThemedText>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.storeChipsContainer}
            >
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
                  onPress={() => setSelectedStore(store)}
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
                    {String(store.name || 'Store')}
                  </ThemedText>
                  <ThemedText style={[
                    styles.storeChipDistance,
                    { color: selectedStore?.id === store.id ? "#10b981" : "#9ca3af" }
                  ]}>
                    {String((store.distance || 0).toFixed(1))}km
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ===== PRODUCTS GRID (RESPONSIVE) ===== */}
        <View style={[styles.section, { paddingHorizontal: responsivePadding }]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3" style={styles.sectionTitle}>
              {selectedStore ? `${selectedStore.name} Products` : "All Products"}
            </ThemedText>
            {filteredProducts.length > 0 && (
              <ThemedText style={styles.productCount}>
                {String(filteredProducts.length)} items
              </ThemedText>
            )}
          </View>
          
          {productsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={{ color: theme.textSecondary, marginTop: 12 }}>
                Loading products...
              </ThemedText>
            </View>
          ) : (
            <View style={styles.productsGrid}>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1000,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  storeInfoCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
    maxWidth: '100%',
  },
  storeNameSmall: { fontSize: 11, fontWeight: '700', color: '#065f46', flex: 1 },
  storeDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#10b981' },
  storeMinutesSmall: { fontSize: 11, fontWeight: '800', color: '#059669' },
  logoText: { fontSize: 22, fontWeight: '900', color: '#10b981', letterSpacing: 0.5 },
  
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 14,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  locationIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  
  searchContainer: { flexDirection: "row", gap: Spacing.sm },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  
  bannerSection: { marginBottom: Spacing.xl },
  bannerSlide: { borderRadius: 18, overflow: 'hidden', marginRight: 0 },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bannerTitle: { color: 'white', fontWeight: '800', marginBottom: 6 },
  bannerSubtitle: { color: '#d1fae5', fontWeight: '600' },
  bannerDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { fontWeight: '900', fontSize: 20, letterSpacing: 0.3, marginBottom: Spacing.md },
  productCount: { fontSize: 14, color: '#6b7280', fontWeight: '700' },
  
  categoriesScroll: { 
    gap: Spacing.md, 
    paddingVertical: 4,
  },
  categoryItem: {
    alignItems: "center",
    width: 80,
  },
  categoryIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryImage: {
    width: 72,
    height: 72,
  },
  categoryLabel: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  
  storeChipsContainer: { paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  storeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  storeChipText: { fontSize: 14, fontWeight: '700' },
  storeChipDistance: { fontSize: 12, fontWeight: '600' },
  
  productsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
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
  discountText: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  productImageContainer: {
    height: 140,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#fafafa',
    padding: Spacing.md,
  },
  productImage: { width: "100%", height: "100%" },
  productInfo: { padding: Spacing.sm, paddingTop: Spacing.xs },
  deliveryInfoRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
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
  storeText: { fontSize: 9, fontWeight: '800', color: '#065f46', textTransform: 'uppercase', letterSpacing: 0.3 },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  timeText: { fontSize: 9, fontWeight: '800', color: '#065f46' },
  productName: { marginBottom: 4, fontWeight: '700', fontSize: 14, lineHeight: 17, minHeight: 34, color: '#111827' },
  brandText: { color: '#6b7280', fontSize: 11, fontWeight: '500', marginBottom: 8 },
  productFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  priceText: { fontWeight: '900', fontSize: 17, color: '#111827' },
  addButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addButtonText: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  originalPriceText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: Spacing.xxl * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  noResults: {
    width: '100%',
    alignItems: 'center',
    padding: 60,
  },
  ramadanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  promoCard: {
    width: 200,
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  promoTitle: {
    fontWeight: '800',
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  promoDesc: {
    fontSize: 12,
    color: '#666',
  },
  storePromoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  storePromoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },
  promoButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ramadanBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});