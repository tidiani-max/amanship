import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { useSearch } from "@/context/SearchContext";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/image-url";
import { getApiUrl } from "@/lib/query-client";
import { useLocation } from "@/context/LocationContext";
import { CartToast } from "@/components/CartToast";
import { SearchOverlayHeader } from '@/components/SearchOverlayHeader';

const { width } = Dimensions.get("window");

// Brand Colors
const BRAND_PURPLE = "#6338f2"; 
const BRAND_MINT_BG = "#e6fffa";
const BRAND_MINT_TEXT = "#00bfa5";

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

// CRITICAL FIX: Separate overlay component that manages its own lifecycle
const SearchOverlay = React.memo(({ 
  visible,
  localSearchQuery,
  setLocalSearchQuery,
  handleCloseSearch,
  filteredProducts,
  renderProduct,
  responsiveColumns,
  responsivePadding,
  insets,
  theme,
  categoryName
}: any) => {
  const mountedRef = useRef(false);
  
  // CRITICAL: Track when this component is actually mounted
  useEffect(() => {
    console.log('🎨 SearchOverlay - MOUNTING');
    mountedRef.current = true;
    
    return () => {
      console.log('🎨 SearchOverlay - UNMOUNTING');
      mountedRef.current = false;
    };
  }, []);
  
  console.log('🎨 SearchOverlay - Rendering, visible:', visible, 'mounted:', mountedRef.current);
  
  if (!visible) return null;
  
  return (
    <View style={styles.searchOverlay}>
      <Pressable style={styles.backdrop} onPress={handleCloseSearch} />
      
      <View style={[styles.searchContent, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top + 12 }]}>
        <SearchOverlayHeader
          value={localSearchQuery}
          onChangeText={setLocalSearchQuery}
          onClose={handleCloseSearch}
          placeholder={`Search in ${categoryName}...`}
          theme={theme}
        />
        
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          key={responsiveColumns}
          numColumns={responsiveColumns}
          contentContainerStyle={{
            paddingHorizontal: responsivePadding,
            paddingTop: Spacing.md,
            paddingBottom: insets.bottom + 20,
          }}
          columnWrapperStyle={{ gap: Spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="search" size={48} color="#64748b" />
              <ThemedText style={{ color: '#64748b', marginTop: 16, fontSize: 16 }}>
                No products found
              </ThemedText>
              <ThemedText style={{ color: '#9ca3af', marginTop: 8, fontSize: 13 }}>
                Try searching with different keywords
              </ThemedText>
            </View>
          }
        />
      </View>
    </View>
  );
});

export default function CategoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CategoryRouteProp>();
  const { category } = route.params;
  const { addToCart } = useCart();
  
  const [screenWidth, setScreenWidth] = useState(width);
  const [toastVisible, setToastVisible] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<string>("");
  const { items } = useCart(); 
  
  // Search state
  const { isSearchActive, setIsSearchActive, searchScope, setSearchScope, setActiveCategoryId } = useSearch();
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  
  // Track component lifecycle
  const componentMountedRef = useRef(false);
  const cleanupTimerRef = useRef<any>(null);

  // CRITICAL FIX: Only run cleanup when component ACTUALLY unmounts
  useEffect(() => {
    console.log('📂 CategoryScreen - MOUNTING');
    componentMountedRef.current = true;
    
    // Set scope on mount
    setSearchScope('category');
    setActiveCategoryId(category.id);
    
    return () => {
      console.log('📂 CategoryScreen - UNMOUNTING (will cleanup in 100ms)');
      componentMountedRef.current = false;
      
      // CRITICAL: Delay cleanup to prevent race condition
      // This ensures we don't reset state while the overlay is mounting
      cleanupTimerRef.current = setTimeout(() => {
        console.log('📂 CategoryScreen - Executing delayed cleanup');
        setActiveCategoryId(null);
        setIsSearchActive(false);
      }, 100);
    };
  }, []); // Run once on mount

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }
    };
  }, []);

  // Update category ID if it changes
  useEffect(() => {
    if (componentMountedRef.current) {
      setActiveCategoryId(category.id);
    }
  }, [category.id]);

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
    inStock: p.isAvailable && Number(p.stockCount) > 0,
    storeName: p.storeName ? String(p.storeName) : undefined,
    storeDistance: p.distance ? Number(p.distance) : undefined,
    deliveryMinutes: p.deliveryMinutes ? Number(p.deliveryMinutes) : undefined,
    storeId: p.storeId ? String(p.storeId) : undefined,
  }));

  const filteredProducts = useMemo(() => {
    if (!localSearchQuery.trim()) return products;
    
    const query = localSearchQuery.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(query) ||
      p.brand?.toLowerCase().includes(query)
    );
  }, [products, localSearchQuery]);

  const formatPrice = (price: number): string => {
    const safePrice = Number(price) || 0;
    return `Rp ${safePrice.toLocaleString("id-ID")}`;
  };

  const handleProductPress = useCallback((product: UIProduct) => {
    navigation.navigate("ProductDetail", { product });
  }, [navigation]);

  const handleAddToCart = useCallback((product: UIProduct) => {
    if (!product.inStock) return;
    addToCart(product, 1);
    setLastAddedProduct(product.name);
    setToastVisible(true);
  }, [addToCart]);

  const handleCloseSearch = useCallback(() => {
    console.log('🔴 CategoryScreen - Closing search overlay');
    setIsSearchActive(false);
    setLocalSearchQuery('');
  }, [setIsSearchActive]);

  const renderProduct = useCallback(({ item }: { item: UIProduct }) => {
    const hasDiscount = item.originalPrice && item.originalPrice > item.price;
    const discountPercent = hasDiscount 
      ? Math.round(((item.originalPrice! - item.price) / item.originalPrice!) * 100) 
      : 0;
    
    const maxWidth = screenWidth > 1600 ? 1600 : screenWidth;
    const effectiveWidth = screenWidth > maxWidth ? maxWidth : screenWidth;
    const cardWidth = getProductCardWidth(effectiveWidth, responsiveColumns, responsivePadding);

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
            <ThemedText style={styles.discountText}>{String(discountPercent)}% OFF</ThemedText>
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
          <View style={styles.deliveryInfoRow}>
            <View style={styles.storeBadge}>
              <Feather name="map-pin" size={9} color="#64748b" />
              <ThemedText style={styles.storeText} numberOfLines={1}>
                {String(item.storeName || "Store")}
              </ThemedText>
            </View>
            <View style={styles.timeBadge}>
              <Feather name="zap" size={9} color={BRAND_MINT_TEXT} />
              <ThemedText style={styles.timeText}>
                {String(item.deliveryMinutes || 15)} min
              </ThemedText>
            </View>
          </View>
          
          <ThemedText type="caption" numberOfLines={2} style={styles.productName}>
            {String(item.name || 'Product')}
          </ThemedText>
          
          <ThemedText type="small" style={styles.brandText} numberOfLines={1}>
            {String(item.brand || 'Brand')}
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
                { backgroundColor: item.inStock ? BRAND_PURPLE : '#e5e7eb' }
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
  }, [screenWidth, responsiveColumns, responsivePadding, theme, handleProductPress, handleAddToCart]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={BRAND_PURPLE} />
        <ThemedText style={{ color: theme.textSecondary, marginTop: 12 }}>
          Loading products...
        </ThemedText>
      </View>
    );
  }

  const maxWidth = screenWidth > 1600 ? 1600 : screenWidth;
  const containerPadding = screenWidth > maxWidth ? (screenWidth - maxWidth) / 2 : 0;
  
  const shouldShowOverlay = isSearchActive && searchScope === 'category';

  console.log('🎨 CategoryScreen - Rendering:', {
    isSearchActive,
    searchScope,
    shouldShowOverlay,
    componentMounted: componentMountedRef.current,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <View style={[
        styles.headerContainer,
        { 
          backgroundColor: theme.cardBackground,
          paddingTop: insets.top + 12,
        }
      ]}>
        <Pressable 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3" style={{ flex: 1, marginLeft: 12 }}>
          {category.name}
        </ThemedText>
      </View>

      <View style={[styles.bannerSection, { paddingHorizontal: responsivePadding + containerPadding }]}>
        <View style={[styles.categoryBanner, { backgroundColor: BRAND_PURPLE }]}>
          <View style={[styles.categoryIconLarge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            {category.image ? (
              <Image
                source={{ uri: getImageUrl(category.image) }}
                style={styles.categoryImageLarge}
                resizeMode="cover"
              />
            ) : (
              <Feather name={category.icon as any} size={32} color="white" />
            )}
          </View>
          
          <View style={{ flex: 1 }}>
            <ThemedText type="h2" style={[styles.categoryTitle, { color: 'white' }]}>
              {String(category.name || 'Category')}
            </ThemedText>
          </View>

          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: containerPadding }}>
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          key={responsiveColumns}
          numColumns={responsiveColumns}
          contentContainerStyle={{
            paddingHorizontal: responsivePadding,
            paddingTop: Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl + 120,
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
        hasItems={items.length > 0} 
        productName={lastAddedProduct}
        onDismiss={() => setToastVisible(false)}
      />

      {/* OVERLAY: Render when needed */}
      <SearchOverlay
        visible={shouldShowOverlay}
        localSearchQuery={localSearchQuery}
        setLocalSearchQuery={setLocalSearchQuery}
        handleCloseSearch={handleCloseSearch}
        filteredProducts={filteredProducts}
        renderProduct={renderProduct}
        responsiveColumns={responsiveColumns}
        responsivePadding={responsivePadding}
        insets={insets}
        theme={theme}
        categoryName={category.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1000,
  },
  backButton: {
    padding: 4,
  },
  bannerSection: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  categoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 18,
    gap: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryIconLarge: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryImageLarge: {
    width: 72,
    height: 72,
  },
  categoryTitle: {
    fontWeight: '900',
    fontSize: 24,
    marginBottom: 4,
    letterSpacing: 0.3,
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
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    flex: 1,
  },
  storeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND_MINT_BG,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  timeText: {
    fontSize: 9,
    fontWeight: '800',
    color: BRAND_MINT_TEXT,
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
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  searchContent: {
    flex: 1,
  },
});