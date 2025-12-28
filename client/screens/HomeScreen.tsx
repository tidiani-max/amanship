import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, TextInput, ActivityIndicator, Dimensions } from "react-native";
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
import { mockPromotions } from "@/data/mockData";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { getImageUrl } from "@/lib/image-url";
import { useLanguage } from "@/context/LanguageContext";

const { width } = Dimensions.get("window");
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
  
  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<string>("");

  const {
    locationStatus,
    store,
    storeAvailable,
    estimatedDeliveryMinutes,
    isCheckingAvailability,
    requestLocationPermission,
  } = useLocation();

  // --- DATA FETCHING ---
  const { data: apiCategories = [], isLoading: categoriesLoading } = useQuery<APICategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: apiProducts = [], isLoading: productsLoading } = useQuery<APIProduct[]>({
    queryKey: ["/api/products"],
  });

  // --- TRANSFORMATIONS ---
  const categories: Category[] = apiCategories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    image: c.image || undefined,
  }));

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
    inStock: p.inStock && p.stockCount > 0,
    stockCount: p.stockCount,
  }));

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.brand.toLowerCase().includes(query)
    );
  }, [searchQuery, products]);

  // --- HANDLERS ---
  const handleCategoryPress = (category: Category) => navigation.navigate("Category", { category });
  const handleProductPress = (product: Product) => navigation.navigate("ProductDetail", { product });
  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;

  const handleAddToCart = (product: Product) => {
    if (!product.inStock) return;
    addToCart(product, 1);
    setLastAddedProduct(product.name);
    setToastVisible(true);
  };

  // Advertisement Banners
  const adsBanners = [
    { id: 1, title: "AmanMart Fresh", subtitle: "Premium groceries delivered", color: "#2ecc71", img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800" },
    { id: 2, title: "AmanMart Deals", subtitle: "Best prices in town", color: theme.primary, img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800" },
    { id: 3, title: "AmanMart Express", subtitle: "Under 15 mins delivery", color: "#f1c40f", img: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800" },
  ];

  // --- REUSABLE PRODUCT CARD COMPONENT ---
  const renderProductCard = (product: Product) => {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) : 0;

    return (
      <Pressable
        key={product.id}
        style={[styles.productCard, { backgroundColor: theme.cardBackground }, !product.inStock && { opacity: 0.6 }]}
        onPress={() => handleProductPress(product)}
      >
        {hasDiscount && product.inStock && (
          <View style={[styles.discountBadge, { backgroundColor: theme.error }]}>
            <ThemedText style={styles.discountText}>{discountPercent}% OFF</ThemedText>
          </View>
        )}
        <View style={[styles.productImageContainer, { backgroundColor: theme.backgroundDefault }]}>
          {product.image ? <Image source={{ uri: getImageUrl(product.image) }} style={styles.productImage} /> : <Feather name="package" size={32} color={theme.textSecondary} />}
          {!product.inStock && (
            <View style={styles.outOfStockOverlay}>
              <ThemedText style={styles.outOfStockText}>OUT OF STOCK</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <ThemedText type="caption" numberOfLines={2} style={styles.productName}>{product.name}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>{product.brand}</ThemedText>
          <View style={styles.productPriceRow}>
            <View>
              <ThemedText type="body" style={{ fontWeight: "700", color: theme.primary }}>{formatPrice(product.price)}</ThemedText>
              {hasDiscount && <ThemedText type="small" style={styles.originalPriceText}>{formatPrice(product.originalPrice!)}</ThemedText>}
            </View>
            <Pressable disabled={!product.inStock} style={[styles.addButton, { backgroundColor: product.inStock ? theme.primary : '#ccc' }]} onPress={(e) => { e.stopPropagation(); handleAddToCart(product); }}>
              <Feather name={product.inStock ? "plus" : "slash"} size={16} color={theme.buttonText} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const isLoading = categoriesLoading || productsLoading;

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* --- SEARCH BAR --- */}
        <View style={[styles.searchContainer, { paddingHorizontal: Spacing.lg }]}>
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
          <Pressable style={[styles.micButton, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate("VoiceOrderModal")}>
            <Feather name="mic" size={20} color={theme.buttonText} />
          </Pressable>
        </View>

        {/* --- LOCATION / STORE STATUS --- */}
        {locationStatus === "denied" ? (
          <Pressable style={[styles.locationBanner, { backgroundColor: theme.warning + "20" }]} onPress={requestLocationPermission}>
            <Feather name="map-pin" size={16} color={theme.warning} />
            <View style={styles.locationBannerText}>
              <ThemedText type="caption" style={{ fontWeight: "600" }}>{t.home.enableLocationTitle}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>{t.home.enableLocationSubtitle}</ThemedText>
            </View>
            <Feather name="chevron-right" size={16} color={theme.textSecondary} />
          </Pressable>
        ) : storeAvailable && store ? (
          <View style={styles.storeInfoContainer}>
            <View style={[styles.deliveryBadge, { backgroundColor: theme.primary }]}>
              <Feather name="zap" size={16} color={theme.buttonText} />
              <ThemedText type="caption" style={{ color: theme.buttonText, fontWeight: "600" }}>
                {estimatedDeliveryMinutes ? `${estimatedDeliveryMinutes}-${t.home.minuteDelivery}` : `15-${t.home.minuteDelivery}`}
              </ThemedText>
            </View>
            <View style={[styles.storeBadge, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="map-pin" size={14} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>{store.name}</ThemedText>
            </View>
          </View>
        ) : isCheckingAvailability ? (
          <View style={[styles.deliveryBadge, { backgroundColor: theme.backgroundDefault, marginLeft: 20, marginBottom: 10 }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>{t.home.findingStore}</ThemedText>
          </View>
        ) : null}

        {isLoading && <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.primary} /></View>}

        {/* --- CATEGORIES (Hidden on Search) --- */}
        {!searchQuery && (
          <View style={styles.section}>
            <ThemedText type="h3" style={styles.sectionTitle}>{t.home.categories}</ThemedText>
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <Pressable key={category.id} style={styles.categoryItem} onPress={() => handleCategoryPress(category)}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + "20", overflow: "hidden" }]}>
                    {category.image ? <Image source={{ uri: getImageUrl(category.image) }} style={styles.categoryImage} /> : <Feather name={category.icon as any} size={24} color={category.color} />}
                  </View>
                  <ThemedText type="small" style={styles.categoryLabel} numberOfLines={1}>{category.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* --- POPULAR ITEMS --- */}
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            {searchQuery ? `Results for "${searchQuery}"` : t.home.popularItems}
          </ThemedText>
          <View style={styles.productsGrid}>
            {filteredProducts.slice(0, 4).map(renderProductCard)}
          </View>
        </View>

        {/* --- AMANMART ADVERTISEMENT BAR (Swipe Left/Right) --- */}
        {!searchQuery && (
          <View style={styles.section}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adsScrollContainer}>
              {adsBanners.map((ad) => (
                <View key={ad.id} style={[styles.adCard, { backgroundColor: ad.color }]}>
                  <Image source={{ uri: ad.img }} style={styles.adBackgroundImage} />
                  <View style={styles.adContent}>
                    <ThemedText style={styles.adTitle}>{ad.title}</ThemedText>
                    <ThemedText style={styles.adSubtitle}>{ad.subtitle}</ThemedText>
                    <View style={styles.adBadge}><ThemedText style={styles.adBadgeText}>Shop Now</ThemedText></View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* --- ALL PRODUCTS --- */}
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            {searchQuery ? "All Matches" : "Explore All Products"}
          </ThemedText>
          <View style={styles.productsGrid}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map(renderProductCard)
            ) : (
              <View style={styles.noResults}>
                <Feather name="search" size={40} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                <ThemedText style={{ color: theme.textSecondary, marginTop: 10 }}>No items found</ThemedText>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <CartToast visible={toastVisible} productName={lastAddedProduct} onDismiss={() => setToastVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", height: 44, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: 16 },
  micButton: { width: 44, height: 44, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center" },
  storeInfoContainer: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.sm },
  deliveryBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xs, gap: Spacing.xs },
  storeBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xs, gap: Spacing.xs },
  locationBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.sm, gap: Spacing.md },
  locationBannerText: { flex: 1 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  categoriesGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: Spacing.lg, gap: Spacing.md },
  categoryItem: { width: "22%", alignItems: "center" },
  categoryIcon: { width: 56, height: 56, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center", marginBottom: Spacing.xs },
  categoryImage: { width: 56, height: 56, borderRadius: BorderRadius.sm },
  categoryLabel: { textAlign: "center" },
  productsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: Spacing.lg, gap: Spacing.md },
  productCard: { width: "47%", borderRadius: BorderRadius.md, overflow: "hidden", position: 'relative' },
  productImageContainer: { height: 100, alignItems: "center", justifyContent: "center", overflow: "hidden", position: 'relative' },
  productImage: { width: "100%", height: "100%", resizeMode: "cover" },
  productInfo: { padding: Spacing.sm },
  productName: { marginBottom: 2, fontWeight: '500' },
  productPriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.xs },
  addButton: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  loadingContainer: { padding: Spacing.xxl, alignItems: "center", justifyContent: "center" },
  originalPriceText: { textDecorationLine: 'line-through', color: '#999', fontSize: 11 },
  discountBadge: { position: 'absolute', top: 5, left: 5, zIndex: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  outOfStockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
  outOfStockText: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  noResults: { width: '100%', alignItems: 'center', padding: 40 },
  adsScrollContainer: { paddingHorizontal: Spacing.lg },
  adCard: { width: width - Spacing.lg * 2, height: 160, borderRadius: BorderRadius.md, overflow: 'hidden', marginRight: Spacing.md, position: 'relative' },
  adBackgroundImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.7 },
  adContent: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', padding: Spacing.lg, justifyContent: 'center' },
  adTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  adSubtitle: { color: 'white', fontSize: 14, marginTop: 4, opacity: 0.9 },
  adBadge: { alignSelf: 'flex-start', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  adBadgeText: { fontSize: 12, fontWeight: 'bold', color: 'black' }
});