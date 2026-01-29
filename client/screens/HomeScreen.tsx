import React, { useState, useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, TextInput, ActivityIndicator, Dimensions, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from 'expo-linear-gradient';

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
  return 2; // Always 2 columns on mobile screens
};

const getResponsivePadding = (screenWidth: number) => {
  if (screenWidth >= 1200) return Spacing.xl * 2;
  if (screenWidth >= 900) return Spacing.xl;
  return Spacing.md;
};

const getProductCardWidth = (screenWidth: number, columns: number, padding: number) => {
  const totalPadding = padding * 2;
  const gapSpace = (Spacing.md + 2) * (columns - 1); // Account for gap in productsGrid
  return (screenWidth - totalPadding - gapSpace) / columns;
};

const getBannerHeight = (screenWidth: number) => {
  if (screenWidth >= 1200) return 320;
  if (screenWidth >= 900) return 280;
  if (screenWidth >= 600) return 240;
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

interface APIPromotion {
  id: string;
  title: string;
  description: string;
  type: string;
  discountValue: number | null;
  minOrder: number;
  icon: string;
  color: string;
  bannerImage: string | null;
  validFrom: string;
  validUntil: string;
  scope: string;
  storeId: string | null;
  storeName?: string;
}

export default function ImprovedHomeScreen() {
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
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { items } = useCart(); 


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

  // Track screen width changes
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

  // Debug log for responsive behavior
  useEffect(() => {
    console.log(`📱 Screen: ${screenWidth}px | Columns: ${responsiveColumns} | Mobile: ${isMobile}`);
  }, [screenWidth, responsiveColumns, isMobile]);

  // Parallax header effect
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      const opacity = Math.max(0, Math.min(1, 1 - value / 100));
      headerOpacity.setValue(opacity);
    });
    return () => scrollY.removeListener(listenerId);
  }, []);

  // Pulse animation for promotions
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const getLocationDisplayName = (): string => {
    if (isManualLocation && addressLabel) return String(addressLabel);
    if (gpsLocationName) return String(gpsLocationName);
    if (nearestStore?.name) return String(nearestStore.name);
    return "Detecting location...";
  };

  const { data: claimedPromotionsMap = {} } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/promotions/claimed-map", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_DOMAIN}/api/promotions/claimed?userId=${user?.id}`
        );
        if (!res.ok) return {};
        const claimed = await res.json();
        return claimed.reduce((map: Record<string, boolean>, p: any) => {
          map[p.id] = true;
          return map;
        }, {} as Record<string, boolean>);
      } catch (error) {
        console.error("Failed to fetch claimed promotions:", error);
        return {};
      }
    },
  });

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

  // Fetch products
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

  // Fetch promotions
  const { data: promotionsData, refetch: refetchPromotions } = useQuery<APIPromotion[]>({
    queryKey: ["/api/promotions/active", user?.id, latitude, longitude],
    enabled: !!user?.id && !!latitude && !!longitude,
    queryFn: async () => {
      const url = `${process.env.EXPO_PUBLIC_DOMAIN}/api/promotions/banners?lat=${latitude}&lng=${longitude}`;
      const res = await fetch(url);
      const data = await res.json();
      return data || [];
    },
  });

  // Fetch vouchers
  const { data: vouchersData } = useQuery({
    queryKey: ["/api/vouchers/active", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/vouchers/active?userId=${user.id}`
      );
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
    }, 5000);

    return () => clearInterval(interval);
  }, [bannersData, screenWidth, maxWidth, responsivePadding]);

  // Map products
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

  // Filter categories with products
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

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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

  const handleClaimPromotion = async (promo: APIPromotion) => {
    if (!user?.id) {
      alert("Please login to claim this promotion");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/promotions/claim`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            promotionId: promo.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to claim promotion");
        return;
      }

      if (data.alreadyClaimed) {
        alert(`Already Claimed! ✓\n\nYou've already claimed this promotion!\n\n📦 It will automatically apply at checkout when you spend ${formatPrice(promo.minOrder)} or more.`);
        return;
      }

      alert(`🎉 Promotion Claimed!\n\n${promo.title} has been added to your account!\n\n✓ Will auto-apply at checkout\n✓ Minimum order: ${formatPrice(promo.minOrder)}\n✓ Valid until ${formatDate(promo.validUntil)}`);
      refetchPromotions();
      
    } catch (error) {
      console.error("❌ Claim promotion error:", error);
      alert("Network Error. Failed to claim promotion. Please check your connection and try again.");
    }
  };

const renderProductCard = (product: UIProduct) => {
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
    : 0;

  // Use actual screenWidth for mobile, maxWidth for larger screens
  const effectiveWidth = screenWidth < 600 ? screenWidth : (screenWidth > maxWidth ? maxWidth : screenWidth);
  
  const cardWidth = getProductCardWidth(
    effectiveWidth, 
    responsiveColumns, 
    responsivePadding
  );

  // Remove the useRef hook from here - animation will work without refs for this use case
  // Or use a CSS-based animation instead

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
      // Remove the animation handlers or use a simpler approach
    >
      {hasDiscount && product.inStock && (
        <LinearGradient
          colors={['#ef4444', '#dc2626']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.discountBadge}
        >
          <ThemedText style={styles.discountText}>{String(discountPercent)}% OFF</ThemedText>
        </LinearGradient>
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
      {/* ===== ANIMATED HEADER ===== */}
      <Animated.View style={[
        styles.compactHeader, 
        { 
          backgroundColor: theme.cardBackground,
          paddingTop: insets.top + 8,
          opacity: headerOpacity,
        }
      ]}>
        <View style={styles.headerRow}>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.logoText}></ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: containerPadding,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* ===== LOCATION SELECTOR ===== */}
        <View style={{ paddingHorizontal: responsivePadding, marginBottom: Spacing.lg }}>
          <Pressable 
            style={[styles.locationSelector, { backgroundColor: theme.cardBackground }]}
            onPress={() => navigation.navigate("EditAddress")}
          >
            <LinearGradient
              colors={[theme.primary + "15", theme.primary + "25"]}
              style={styles.locationIcon}
            >
              <Feather 
                name={isManualLocation ? "home" : "navigation"}
                size={18} 
                color={theme.primary} 
              />
            </LinearGradient>
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
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={screenWidth > maxWidth ? maxWidth - (responsivePadding * 2) : screenWidth - (responsivePadding * 2)}
            >
              {bannersData.map((banner, index) => (
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
                  <LinearGradient
                    colors={[
                      'transparent',
                      'rgba(0,0,0,0.3)',
                      'rgba(0,0,0,0.6)',
                      'rgba(0,0,0,0.85)'
                    ]}
                    locations={[0, 0.4, 0.7, 1]}
                    style={styles.bannerOverlay}
                  >
                    <View style={styles.bannerContent}>
                      <View style={styles.bannerBadge}>
                        <Feather name="zap" size={14} color="#fbbf24" />
                        <ThemedText style={styles.bannerBadgeText}>FEATURED</ThemedText>
                      </View>
                      <ThemedText style={[styles.bannerTitle, { fontSize: isMobile ? 22 : 28 }]}>
                        {banner.title}
                      </ThemedText>
                      <ThemedText style={[styles.bannerSubtitle, { fontSize: isMobile ? 14 : 17 }]}>
                        {banner.subtitle}
                      </ThemedText>
                      <View style={styles.bannerCTA}>
                        <ThemedText style={styles.bannerCTAText}>Shop Now</ThemedText>
                        <Feather name="arrow-right" size={16} color="white" />
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.bannerDotsContainer}>
              <View style={styles.bannerDots}>
                {bannersData.map((_, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      { 
                        backgroundColor: index === currentBannerIndex ? '#10b981' : '#d1d5db',
                        width: index === currentBannerIndex ? 24 : 8,
                      }
                    ]}
                  />
                ))}
              </View>
              <ThemedText style={styles.bannerCounter}>
                {currentBannerIndex + 1} / {bannersData.length}
              </ThemedText>
            </View>
          </View>
        )}

        {/* ===== PROMOTIONS SECTION ===== */}
        {promotionsData && promotionsData.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: responsivePadding }]}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  style={styles.sectionIconBadge}
                >
                  <Feather name="gift" size={18} color="white" />
                </LinearGradient>
                <ThemedText type="h3" style={styles.sectionTitle}>
                  Special Offers
                </ThemedText>
              </View>
              <Pressable 
                onPress={() => refetchPromotions()}
                style={styles.refreshButton}
              >
                <Feather name="refresh-cw" size={18} color={theme.primary} />
              </Pressable>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.md + 2, paddingVertical: Spacing.sm }}
              decelerationRate="fast"
              snapToInterval={isMobile ? 260 : 280}
            >
              {promotionsData.map((promo) => {
                const isClaimed = claimedPromotionsMap[promo.id] || false;
                const now = new Date();
                const validFrom = new Date(promo.validFrom);
                const validUntil = new Date(promo.validUntil);
                const isNotStarted = now < validFrom;
                const isExpired = now > validUntil;
                
                return (
                  <Pressable
                    key={promo.id}
                    style={[
                      styles.promoCard,
                      {
                        backgroundColor: theme.cardBackground,
                        borderColor: promo.color,
                        opacity: isClaimed ? 0.85 : isNotStarted || isExpired ? 0.6 : 1,
                      },
                    ]}
                    onPress={() => handleClaimPromotion(promo)}
                    disabled={isClaimed && !isNotStarted && !isExpired}
                  >
                    {promo.bannerImage ? (
                      <View style={styles.promoImageContainer}>
                        <Image
                          source={{ uri: promo.bannerImage }}
                          style={styles.promoImageFull}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.4)']}
                          style={styles.promoImageOverlay}
                        >
                          <View style={[styles.promoIconBadge, { backgroundColor: promo.color }]}>
                            <Feather name={promo.icon as any} size={20} color="white" />
                          </View>
                        </LinearGradient>
                      </View>
                    ) : (
                      <LinearGradient
                        colors={[promo.color + "20", promo.color + "40"]}
                        style={styles.promoIconContainer}
                      >
                        <Feather name={promo.icon as any} size={36} color={promo.color} />
                      </LinearGradient>
                    )}
                    
                    <View style={styles.promoContent}>
                      <ThemedText style={styles.promoTitle} numberOfLines={2}>
                        {promo.title}
                      </ThemedText>
                      
                      <ThemedText style={styles.promoDesc} numberOfLines={2}>
                        {promo.description}
                      </ThemedText>
                      
                      <View style={styles.promoDetailsRow}>
                        {promo.scope === 'store' && promo.storeName && (
                          <View style={styles.storeTag}>
                            <Feather name="map-pin" size={10} color="#059669" />
                            <ThemedText style={styles.storeTagText}>
                              {promo.storeName}
                            </ThemedText>
                          </View>
                        )}
                        
                        {promo.minOrder > 0 && (
                          <View style={[styles.minOrderTag, { backgroundColor: promo.color + '15' }]}>
                            <Feather name="shopping-bag" size={10} color={promo.color} />
                            <ThemedText style={[styles.minOrderText, { color: promo.color }]}>
                              Min {formatPrice(promo.minOrder)}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      
                      {isNotStarted && (
                        <View style={[styles.statusBadge, { backgroundColor: '#fbbf24' + '20' }]}>
                          <Feather name="clock" size={11} color="#f59e0b" />
                          <ThemedText style={{ fontSize: 10, color: '#f59e0b', marginLeft: 4, fontWeight: '700' }}>
                            Opens {formatDate(promo.validFrom)}
                          </ThemedText>
                        </View>
                      )}
                      
                      {isExpired && (
                        <View style={[styles.statusBadge, { backgroundColor: '#ef4444' + '20' }]}>
                          <Feather name="x-circle" size={11} color="#ef4444" />
                          <ThemedText style={{ fontSize: 10, color: '#ef4444', marginLeft: 4, fontWeight: '700' }}>
                            Expired
                          </ThemedText>
                        </View>
                      )}
                      
                      <LinearGradient
                        colors={
                          isNotStarted 
                            ? ['#6b7280', '#4b5563']
                            : isExpired 
                            ? ['#ef4444', '#dc2626'] 
                            : isClaimed 
                            ? ['#10b981', '#059669'] 
                            : [promo.color, promo.color]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.promoButton}
                      >
                        <ThemedText style={styles.promoButtonText}>
                          {isNotStarted 
                            ? "🔒 COMING SOON" 
                            : isExpired 
                            ? "❌ EXPIRED" 
                            : isClaimed 
                            ? "✓ CLAIMED" 
                            : "CLAIM NOW"}
                        </ThemedText>
                        {!isNotStarted && !isExpired && !isClaimed && (
                          <Feather name="arrow-right" size={14} color="white" />
                        )}
                      </LinearGradient>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ===== CATEGORIES SECTION ===== */}
        {!searchQuery && availableCategories.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: responsivePadding }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
              <ThemedText type="h3" style={styles.sectionTitle}>Shop by Category</ThemedText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
              decelerationRate="fast"
            >
              {availableCategories.map((category) => (
  <Pressable
    key={category.id}
    style={styles.categoryItem}
    onPress={() => handleCategoryPress(category)}
  >
    <LinearGradient
      colors={[category.color + "15", category.color + "25"]}
      style={styles.categoryIcon}
    >
      {/* 
        Strictly only render the image. 
        The Feather icon component has been deleted entirely.
      */}
      {category.image && (
        <Image
          source={{ uri: getImageUrl(category.image) }}
          style={styles.categoryImage}
          resizeMode="cover"
        />
      )}
    </LinearGradient>
    
    {/* Removed numberOfLines to allow vertical wrapping */}
    <ThemedText type="small" style={styles.categoryLabel}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md }}>
              <ThemedText type="h3" style={styles.sectionTitle}>Nearby Stores</ThemedText>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.storeChipsContainer}
              decelerationRate="fast"
            >
              <Pressable
                style={[
                  styles.storeChip,
                  { 
                    backgroundColor: !selectedStore ? theme.primary + '20' : theme.cardBackground,
                    borderColor: !selectedStore ? theme.primary : '#e5e7eb',
                  }
                ]}
                onPress={() => setSelectedStore(null)}
              >
                <Feather name="grid" size={14} color={!selectedStore ? theme.primary : "#6b7280"} />
                <ThemedText style={[
                  styles.storeChipText,
                  { color: !selectedStore ? theme.primary : "#6b7280" }
                ]}>
                  All Stores
                </ThemedText>
              </Pressable>
              
              {storesData.map(store => (
                <Pressable
                  key={store.id}
                  style={[
                    styles.storeChip,
                    { 
                      backgroundColor: selectedStore?.id === store.id ? theme.primary + '20' : theme.cardBackground,
                      borderColor: selectedStore?.id === store.id ? theme.primary : '#e5e7eb',
                    }
                  ]}
                  onPress={() => setSelectedStore(store)}
                >
                  <Feather 
                    name="map-pin" 
                    size={14} 
                    color={selectedStore?.id === store.id ? theme.primary : "#6b7280"} 
                  />
                  <ThemedText style={[
                    styles.storeChipText,
                    { color: selectedStore?.id === store.id ? theme.primary : "#6b7280" }
                  ]}>
                    {String(store.name || 'Store')}
                  </ThemedText>
                  <ThemedText style={[
                    styles.storeChipDistance,
                    { color: selectedStore?.id === store.id ? theme.primary : "#9ca3af" }
                  ]}>
                    {String((store.distance || 0).toFixed(1))}km
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ===== PRODUCTS GRID ===== */}
        <View style={[styles.section, { paddingHorizontal: responsivePadding }]}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ThemedText type="h3" style={styles.sectionTitle}>
                {selectedStore ? `${selectedStore.name} Products` : "All Products"}
              </ThemedText>
            </View>
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
      </Animated.ScrollView>

      <CartToast
  visible={toastVisible}
  hasItems={items.length > 0} // <--- Pass this now!
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  storeInfoCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 6,
    maxWidth: '100%',
  },
  storeNameSmall: { fontSize: 11, fontWeight: '700', color: '#065f46', flex: 1 },
  storeDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#10b981' },
  storeMinutesSmall: { fontSize: 11, fontWeight: '800', color: '#059669' },
  logoText: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#10b981', 
    letterSpacing: 0.5,
    textShadowColor: 'rgba(16, 185, 129, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md + 2,
    borderRadius: 16,
    gap: Spacing.sm + 2,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  locationIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  
  searchContainer: { flexDirection: "row", gap: Spacing.sm + 2 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    borderRadius: 16,
    paddingHorizontal: Spacing.md + 2,
    gap: Spacing.sm + 2,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  micButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  
  bannerSection: { marginBottom: Spacing.xl + 4 },
  bannerSlide: { borderRadius: 24, overflow: 'hidden', marginRight: 0 },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 28,
  },
  bannerContent: {
    gap: 6,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    marginBottom: 8,
  },
  bannerBadgeText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerTitle: { 
    color: 'white', 
    fontWeight: '900', 
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bannerSubtitle: { 
    color: '#d1fae5', 
    fontWeight: '600',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  bannerCTAText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bannerDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 4,
  },
  bannerDots: { 
    flexDirection: 'row', 
    gap: 8,
  },
  dot: { 
    height: 8, 
    borderRadius: 4,
  },
  bannerCounter: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  
  section: { marginBottom: Spacing.xl + 4 },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: Spacing.md + 2,
  },
  sectionTitle: { 
    fontWeight: '900', 
    fontSize: 21, 
    letterSpacing: 0.3,
  },
  productCountBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  productCount: { 
    fontSize: 13, 
    color: 'white', 
    fontWeight: '800',
  },
  
  categoriesScroll: { 
    gap: Spacing.md + 2, 
    paddingVertical: 6,
  },
  categoryItem: {
    alignItems: "center",
    width: 84,
  },
  categoryIcon: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs + 2,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryImage: {
    width: 76,
    height: 76,
  },
  categoryLabel: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  
  storeChipsContainer: { paddingTop: Spacing.sm, paddingBottom: Spacing.xs, gap: 10 },
  storeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  storeChipText: { fontSize: 14, fontWeight: '700' },
  storeChipDistance: { fontSize: 12, fontWeight: '600' },
  
  productsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md + 2 },
  productCard: {
    borderRadius: 18,
    overflow: "hidden",
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  discountText: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  productImageContainer: {
    height: 150,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#fafafa',
    padding: Spacing.md + 2,
  },
  productImage: { width: "100%", height: "100%" },
  productInfo: { padding: Spacing.sm + 2, paddingTop: Spacing.xs + 2 },
  deliveryInfoRow: { flexDirection: 'row', gap: 7, marginBottom: 11 },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    flex: 1,
  },
  storeText: { fontSize: 9, fontWeight: '800', color: '#065f46', textTransform: 'uppercase', letterSpacing: 0.3 },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timeText: { fontSize: 9, fontWeight: '800', color: '#065f46' },
  productName: { marginBottom: 5, fontWeight: '700', fontSize: 14, lineHeight: 18, minHeight: 36, color: '#111827' },
  brandText: { color: '#6b7280', fontSize: 11, fontWeight: '500', marginBottom: 9 },
  productFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5 },
  priceText: { fontWeight: '900', fontSize: 17, color: '#111827' },
  addButton: { 
    paddingHorizontal: 18, 
    paddingVertical: 9, 
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  addButtonText: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  originalPriceText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 3,
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
    padding: 70,
  },
  promoCard: {
    width: 260,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  promoImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  promoImageFull: {
    width: '100%',
    height: '100%',
  },
  promoImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 12,
  },
  promoIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  promoIconContainer: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoContent: {
    padding: Spacing.md + 2,
    gap: Spacing.sm,
  },
  promoTitle: {
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 20,
    color: '#111827',
  },
  promoDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  promoDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  storeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  storeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },
  minOrderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  minOrderText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  promoButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  sectionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
});