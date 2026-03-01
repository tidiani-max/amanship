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
import { GroceryChatBot } from "@/components/GroceryChatBot";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Category, Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { getImageUrl } from "@/lib/image-url";
import { useAuth } from "@/context/AuthContext";
import { Alert } from 'react-native';
import { HeaderTitle } from "@/components/HeaderTitle";
import { useLanguage } from "@/context/LanguageContext";
import { useSearch } from "@/context/SearchContext";

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
  return Spacing.md + 4;
};

const getProductCardWidth = (screenWidth: number, columns: number, padding: number) => {
  const totalPadding = padding * 2;
  const gapSpace = (Spacing.md + 2) * (columns - 1);
  return (screenWidth - totalPadding - gapSpace) / columns;
};

const getBannerHeight = (screenWidth: number) => {
  if (screenWidth >= 1200) return 340;
  if (screenWidth >= 900) return 300;
  if (screenWidth >= 600) return 260;
  return 220;
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
  const [chatBotVisible, setChatBotVisible] = useState(false);

  const { setHomeSearchRef, isSearchActive, setIsSearchActive } = useSearch();
  const searchInputRef = useRef<TextInput>(null);
  
  const bannerScrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { items } = useCart(); 
  const { language, t } = useLanguage();

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

  // Replace this in HomeScreen.tsx
useEffect(() => {
  console.log("📌 Registering home search ref:", !!searchInputRef.current);
  setHomeSearchRef(searchInputRef);
  return () => setHomeSearchRef(null);
}, [setHomeSearchRef]);
  
 

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
    color: String(c.color || '#6366f1'),
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
        Alert.alert(
          "Already Claimed! ✓",
          `You've already claimed this promotion!\n\n📦 It will automatically apply at checkout when you spend ${formatPrice(promo.minOrder)} or more.`,
          [{ text: "Got it", style: "cancel" }]
        );
        return;
      }

      Alert.alert(
        "Promotion Claimed!",
        `${promo.title} has been added to your account!\n\n Will auto-apply at checkout\n💰 Minimum order: ${formatPrice(promo.minOrder)}\n⏳ Valid until ${formatDate(promo.validUntil)}`,
        [
          { text: "Awesome!", style: "default" },
          { 
            text: "View Cart", 
            onPress: () => navigation.navigate("Cart"),
            style: "default" 
          }
        ]
      );
      refetchPromotions();
    } catch (error) {
      console.error("❌ Claim promotion error:", error);
      alert("Network Error. Failed to claim promotion. Please check your connection and try again.");
    }
  };

  // ===== PRODUCT CARD RENDER FUNCTION =====
  const renderProductCard = (product: UIProduct) => {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount 
      ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
      : 0;

    const effectiveWidth = screenWidth < 600 ? screenWidth : (screenWidth > maxWidth ? maxWidth : screenWidth);
    
    const cardWidth = getProductCardWidth(
      effectiveWidth, 
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
            <ThemedText style={styles.discountText} noTranslate>
              {String(discountPercent)}% OFF
            </ThemedText>
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
            <View style={styles.greenStoreBadge}>
              <Feather name="map-pin" size={9} color="#059669" />
              <ThemedText style={styles.greenStoreText} numberOfLines={1} noTranslate>
                {String(product.storeName || "Store")}
              </ThemedText>
            </View>
            <View style={styles.purpleTimeBadge}>
              <Feather name="clock" size={9} color="#6366f1" />
              <ThemedText style={styles.purpleTimeText} noTranslate>
                {String(product.deliveryMinutes || 15)}M
              </ThemedText>
            </View>
          </View>

          <ThemedText type="caption" numberOfLines={2} style={styles.productName} noTranslate>
            {String(product.name || 'Product')}
          </ThemedText>
          
          <ThemedText type="small" style={styles.brandText} numberOfLines={1} noTranslate>
            {String(product.brand || 'Brand')}
          </ThemedText>

          <View style={styles.productFooter}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <ThemedText 
                type="body" 
                style={styles.priceText}
                numberOfLines={2}
                noTranslate
              >
                {String(formatPrice(product.price))}
              </ThemedText>

              {hasDiscount && (
                <ThemedText
                  type="small"
                  style={styles.originalPriceText}
                  numberOfLines={1}
                  noTranslate
                >
                  {String(formatPrice(product.originalPrice!))}
                </ThemedText>
              )}
            </View>

            <Pressable
              disabled={!product.inStock}
              style={[
                styles.addToCartButton,
                !product.inStock && { opacity: 0.5 }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                handleAddToCart(product);
              }}
            >
              <LinearGradient
                colors={product.inStock ? ['#6366f1', '#8b5cf6'] : ['#e5e7eb', '#e5e7eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addToCartGradient}
              >
                <ThemedText style={styles.addButtonText} noTranslate>
                  {language === 'id' ? 'TAMBAH' : 'ADD'}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      {/* ===== HEADER ===== */}
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: theme.cardBackground,
            paddingTop: insets.top + 16, 
            paddingBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 5,
            zIndex: 100,
          },
        ]}
      >
        <View 
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            paddingHorizontal: responsivePadding 
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <LinearGradient
              colors={['#00d2ff', '#3a7bd5']}
              style={{ 
                width: 42, 
                height: 42, 
                borderRadius: 14, 
                justifyContent: 'center', 
                alignItems: 'center', 
                marginRight: 10,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)'
              }}
            >
              <ThemedText style={{ color: 'white', fontWeight: '900', fontSize: 24 }}>Q</ThemedText>
            </LinearGradient>
            <ThemedText style={{ fontSize: 26, fontWeight: '900', letterSpacing: -0.8, color: '#0f172a' }}>
              Qikly
            </ThemedText>
          </View>

          <Pressable 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              flexShrink: 1, 
              marginLeft: 12,
              backgroundColor: '#f1f5f9',
              padding: 6,
              borderRadius: 16,
            }} 
            onPress={() => navigation.navigate("EditAddress")}
          >
            <View style={{ alignItems: 'flex-end', marginRight: 10, paddingLeft: 4 }}>
              <ThemedText style={{ color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>
                DELIVERING TO
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedText 
                  numberOfLines={1} 
                  style={{ fontWeight: "800", fontSize: 15, color: '#0f172a' }}
                >
                  {getLocationDisplayName() || "Home Office"}
                </ThemedText>
                <Feather name="chevron-down" size={16} color="#3a7bd5" style={{ marginLeft: 2 }} />
              </View>
            </View>

            <LinearGradient
              colors={['#00d2ff', '#3a7bd5']}
              style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 14, 
                justifyContent: 'center', 
                alignItems: 'center',
                shadowColor: "#3a7bd5",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
              }}
            >
              <Feather name="map-pin" size={18} color="white" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: Spacing.md,
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
        {/* ===== SEARCH BAR ===== */}
        <View style={{ paddingHorizontal: responsivePadding, marginBottom: Spacing.md }}>
          <View style={[styles.searchBarWithMic, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="search" size={18} color="#9ca3af" />
            <TextInput
    ref={searchInputRef} 
    style={[styles.searchInput, { color: theme.text }]}
    placeholder="Search anything..."
    placeholderTextColor="#9ca3af"
    value={searchQuery}
    onChangeText={setSearchQuery}
  />
            <Pressable
              style={styles.micInsideSearch}
              onPress={() => navigation.navigate("VoiceOrderModal")}
            >
              <Feather name="mic" size={18} color="white" />
            </Pressable>
          </View>
        </View>

        {/* ===== AI CHATBOT BUTTON ===== */}
        <View style={{ paddingHorizontal: responsivePadding, marginBottom: Spacing.md }}>
          <Pressable
            style={styles.aiChatButton}
            onPress={() => setChatBotVisible(true)}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiChatGradient}
            >
              <Feather name="message-circle" size={20} color="white" />
              <ThemedText style={styles.aiChatText}>
                🤖 Ask AI: "Find the best recipes, healthy choices, or lowest prices".
              </ThemedText>
              <Feather name="star" size={16} color="white" />
            </LinearGradient>
          </Pressable>
        </View>

        {/* ===== HERO BANNER ===== */}
        {bannersData && bannersData.length > 0 && (
          <View style={[styles.heroBannerSection, { paddingHorizontal: responsivePadding }]}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={screenWidth > maxWidth ? maxWidth - (responsivePadding * 2) : screenWidth - (responsivePadding * 2)}
            >
              {bannersData.map((banner) => (
                <Pressable 
                  key={banner.id} 
                  style={[
                    styles.heroSlide, 
                    { 
                      width: screenWidth > maxWidth 
                        ? maxWidth - (responsivePadding * 2) 
                        : screenWidth - (responsivePadding * 2),
                      height: bannerHeight,
                      borderRadius: 24,
                      overflow: 'hidden',
                      backgroundColor: '#000',
                    }
                  ]}
                >
                  <Image 
                    source={{ uri: banner.image }} 
                    style={[styles.heroImage, { opacity: 0.85 }]}
                    resizeMode="cover"
                  />
                  
                  <LinearGradient
                    colors={['rgba(46, 16, 101, 0.3)', 'rgba(88, 28, 235, 0.5)']}
                    style={StyleSheet.absoluteFill}
                  />

                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)']}
                    locations={[0, 0.4, 0.9]}
                    style={styles.heroOverlay}
                  >
                    <View style={styles.heroContent}>
                      <View style={[styles.premiumDeliveryBadge, { backgroundColor: '#fbce1f' }]}>
                        <Feather name="zap" size={13} color="#000" />
                        <ThemedText style={[styles.premiumDeliveryText, { color: '#000', fontWeight: '800' }]}>
                           PREMIUM DELIVERY
                        </ThemedText>
                      </View>
                      
                      <View style={styles.heroHeadline}>
                        <ThemedText 
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.7}
                          style={[
                            styles.heroTitleWhite, 
                            { fontSize: isMobile ? 24 : 32 }
                          ]}
                        >
                          {banner.title || "Everything You Need,"}
                        </ThemedText>

                        <ThemedText 
                          numberOfLines={1} 
                          style={[
                            styles.heroTitlePurple, 
                            { fontSize: isMobile ? 22 : 30, color: '#a78bfa' }
                          ]}
                        >
                          {banner.subtitle || "Delivered Fast."}
                        </ThemedText>
                      </View>
                      
                      <Pressable style={styles.heroCTAContainer}>
                        <LinearGradient
                          colors={['#4f46e5', '#7c3aed']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.heroCTAButton}
                        >
                          <ThemedText style={styles.heroCTAText}>Get Started</ThemedText>
                          <Feather name="chevron-right" size={18} color="white" style={{marginLeft: 4}} />
                        </LinearGradient>
                      </Pressable>
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>
            
            <View style={styles.heroDots} />
          </View>
        )}

        {/* ===== CATEGORIES ===== */}
        {!searchQuery && availableCategories.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: responsivePadding, marginTop: 15 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <ThemedText style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>
                Categories
              </ThemedText>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 20, paddingRight: 20, paddingBottom: 10 }}
              decelerationRate="fast"
            >
              {availableCategories.map((category) => (
                <Pressable
                  key={category.id}
                  style={{ alignItems: 'center', width: 85 }}
                  onPress={() => handleCategoryPress(category)}
                >
                  <View style={{
                    width: 80,
                    height: 80,
                    borderRadius: 28,
                    backgroundColor: '#f8fafc', 
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 10,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                  }}>
                    {category.image ? (
                      <Image
                        source={{ uri: getImageUrl(category.image) ?? "" }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Feather name="grid" size={30} color="#cbd5e1" />
                    )}
                  </View>
                  
                  <ThemedText 
                    numberOfLines={1} 
                    style={{ 
                      fontSize: 13,
                      fontWeight: '800', 
                      color: '#334155',
                      textAlign: 'center',
                      letterSpacing: -0.2
                    }}
                  >
                    {category.name}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ===== PROMOTIONS ===== */}
        {promotionsData && promotionsData.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: responsivePadding, marginTop: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ 
                  backgroundColor: '#fff', 
                  padding: 8, 
                  borderRadius: 12, 
                  marginRight: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                  elevation: 2
                }}>
                  <Feather name="gift" size={20} color="#f97316" />
                </View>
                <ThemedText style={{ fontSize: 24, fontWeight: '900', color: '#1e293b' }}>
                  Special Offers
                </ThemedText>
              </View>

              <Pressable 
                onPress={() => refetchPromotions()}
                style={{ 
                  backgroundColor: '#fff', 
                  padding: 10, 
                  borderRadius: 14,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                  elevation: 2
                }}
              >
                <Feather name="refresh-cw" size={18} color="#3b82f6" />
              </Pressable>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, paddingBottom: 10 }}
              decelerationRate="fast"
              snapToInterval={screenWidth * 0.85}
            >
              {promotionsData.map((promo) => {
                const isClaimed = claimedPromotionsMap[promo.id] || false;
                
                return (
                  <Pressable
                    key={promo.id}
                    style={{
                      width: screenWidth * 0.8,
                      height: 200,
                      borderRadius: 32,
                      overflow: 'hidden',
                      backgroundColor: '#000',
                    }}
                    onPress={() => handleClaimPromotion(promo)}
                  >
                    {promo.bannerImage ? (
                      <Image
                        source={{ uri: promo.bannerImage }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#333' }]} /> 
                    )}
                    <LinearGradient
                      colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']}
                      style={StyleSheet.absoluteFill}
                    />

                    <View style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}>
                      <View style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 12, 
                        backgroundColor: 'rgba(255,255,255,0.25)', 
                        justifyContent: 'center', 
                        alignItems: 'center' 
                      }}>
                        <Feather name="shopping-bag" size={20} color="white" />
                      </View>

                      <View>
                        <ThemedText style={{ color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 4 }}>
                          {promo.title}
                        </ThemedText>
                        <ThemedText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' }}>
                          {promo.description}
                        </ThemedText>
                        
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 15 }}>
                          <View>
                            <ThemedText style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900' }}>
                              STARTS FROM
                            </ThemedText>
                            <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '800' }}>
                              Min {formatPrice(promo.minOrder)}
                            </ThemedText>
                          </View>

                          <View style={{ 
                            backgroundColor: 'white', 
                            paddingHorizontal: 20, 
                            paddingVertical: 10, 
                            borderRadius: 20,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 5,
                          }}>
                            <ThemedText style={{ color: '#2563eb', fontWeight: '900', fontSize: 14 }}>
                              {isClaimed ? "Claimed" : "Claim Now"}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
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
              decelerationRate="fast"
            >
              <Pressable
                style={[
                  styles.storeChip,
                  { 
                    backgroundColor: !selectedStore ? '#eef2ff' : theme.cardBackground,
                    borderColor: !selectedStore ? '#6366f1' : '#e5e7eb',
                  }
                ]}
                onPress={() => setSelectedStore(null)}
              >
                <Feather name="grid" size={13} color={!selectedStore ? "#6366f1" : "#6b7280"} />
                <ThemedText style={[
                  styles.storeChipText,
                  { color: !selectedStore ? "#6366f1" : "#6b7280" }
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
                      backgroundColor: selectedStore?.id === store.id ? '#eef2ff' : theme.cardBackground,
                      borderColor: selectedStore?.id === store.id ? '#6366f1' : '#e5e7eb',
                    }
                  ]}
                  onPress={() => setSelectedStore(store)}
                >
                  <Feather 
                    name="map-pin" 
                    size={13} 
                    color={selectedStore?.id === store.id ? "#6366f1" : "#6b7280"} 
                  />
                  <ThemedText style={[
                    styles.storeChipText,
                    { color: selectedStore?.id === store.id ? "#6366f1" : "#6b7280" }
                  ]}>
                    {String(store.name || 'Store')}
                  </ThemedText>
                  <ThemedText style={[
                    styles.storeChipDistance,
                    { color: selectedStore?.id === store.id ? "#6366f1" : "#9ca3af" }
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
            {selectedStore ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                <ThemedText type="h3" style={styles.sectionTitle} noTranslate>
                  {String(selectedStore.name || '')}
                </ThemedText>
                <ThemedText type="h3" style={[styles.sectionTitle, { marginLeft: 6 }]}>
                  Products
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="h3" style={styles.sectionTitle}>
                All Products
              </ThemedText>
            )}
          </View>
          
          {productsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <ThemedText style={{ color: theme.textSecondary, marginTop: 12 }}>
                {language === 'id' ? 'Memuat produk...' : 'Loading products...'}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(renderProductCard)
              ) : (
                <View style={styles.noResults}>
                  <Feather 
                    name="search" 
                    size={48} 
                    color={theme.textSecondary} 
                    style={{ opacity: 0.3 }} 
                  />
                  <ThemedText style={{ color: theme.textSecondary, marginTop: 12, fontSize: 15 }}>
                    {language === 'id' ? 'Produk tidak ditemukan' : 'No products found'}
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* ===== CART TOAST ===== */}
      <CartToast
        visible={toastVisible}
        hasItems={items.length > 0}
        productName={lastAddedProduct}
        onDismiss={() => setToastVisible(false)}
      />

      {/* ===== AI CHATBOT ===== */}
      <GroceryChatBot
        visible={chatBotVisible}
        onClose={() => setChatBotVisible(false)}
        availableProducts={products.map(p => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          price: p.price,
          category: p.category || 'uncategorized',
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBarWithMic: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 24,
    paddingLeft: Spacing.md,
    paddingRight: 4,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 14, 
    fontWeight: '400',
    includeFontPadding: false,
  },
  micInsideSearch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  aiChatButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  aiChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  aiChatText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  heroBannerSection: { 
    marginBottom: Spacing.lg + 4 
  },
  heroSlide: { 
    borderRadius: 20, 
    overflow: 'hidden',
  },
  heroImage: { 
    width: '100%', 
    height: '100%' 
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 24,
  },
  heroContent: {
    gap: 12,
  },
  premiumDeliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  premiumDeliveryText: {
    color: '#1f2937',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroHeadline: {
    gap: 2,
  },
  heroTitleWhite: { 
    color: 'white', 
    fontWeight: '900', 
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroTitlePurple: {
    color: '#c084fc',
    fontWeight: '900',
  },
  heroCTAContainer: {
    marginTop: 15,
    width: 140,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#6366f1',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  heroCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  heroCTAText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  heroDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  section: { 
    marginBottom: Spacing.lg 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: Spacing.md,
  },
  sectionTitle: { 
    fontWeight: '800', 
    fontSize: 19, 
    letterSpacing: -0.3,
    flexShrink: 1,
    color: '#1f2937',
  },
  storeChipsContainer: { 
    paddingTop: Spacing.sm, 
    paddingBottom: Spacing.xs, 
    gap: 8 
  },
  storeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  storeChipText: { 
    fontSize: 13, 
    fontWeight: '700',
    flexShrink: 1,
  },
  storeChipDistance: { 
    fontSize: 11, 
    fontWeight: '600',
    flexShrink: 0,
  },
  productsGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: Spacing.md 
  },
  productCard: {
    borderRadius: 16,
    overflow: "hidden",
    position: 'relative',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
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
  discountText: { 
    color: 'white', 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 0.3,
  },
  productImageContainer: {
    height: 140,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#fafafa',
    padding: Spacing.md,
  },
  productImage: { 
    width: "100%", 
    height: "100%" 
  },
  productInfo: { 
    padding: Spacing.sm + 2, 
    paddingTop: Spacing.xs + 2,
  },
  deliveryInfoRow: { 
    flexDirection: 'row', 
    gap: 6, 
    marginBottom: 10,
  },
  greenStoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
    minWidth: 0,
  },
  greenStoreText: { 
    fontSize: 9, 
    fontWeight: '800', 
    color: '#065f46', 
    textTransform: 'uppercase', 
    letterSpacing: 0.2,
    flexShrink: 1,
    maxWidth: '100%',
  },
  purpleTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  purpleTimeText: { 
    fontSize: 9, 
    fontWeight: '800', 
    color: '#6366f1',
  },
  productName: { 
    marginBottom: 4, 
    fontWeight: '700', 
    fontSize: 13, 
    lineHeight: 17, 
    minHeight: 34, 
    color: '#1f2937',
  },
  brandText: { 
    color: '#9ca3af', 
    fontSize: 11, 
    fontWeight: '500', 
    marginBottom: 8,
  },
  productFooter: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    marginTop: 4,
    gap: 8,
  },
  priceText: { 
    fontWeight: '900', 
    fontSize: 16, 
    color: '#1f2937',
    flexShrink: 0,
  },
  addToCartButton: { 
    flexShrink: 0,
    borderRadius: 10,
    overflow: 'hidden',
  },
  addToCartGradient: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { 
    color: 'white', 
    fontSize: 11, 
    fontWeight: '900', 
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  originalPriceText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
    fontSize: 11,
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
});