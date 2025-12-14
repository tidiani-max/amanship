import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Category, Product } from "@/types";
import { mockPromotions } from "@/data/mockData";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { getImageUrl } from "@/lib/image-url";
import { useLanguage } from "@/context/LanguageContext";

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
  const {
    locationStatus,
    store,
    storeAvailable,
    estimatedDeliveryMinutes,
    isCheckingAvailability,
    requestLocationPermission,
  } = useLocation();

  const { data: apiCategories = [], isLoading: categoriesLoading } = useQuery<APICategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: apiProducts = [], isLoading: productsLoading } = useQuery<APIProduct[]>({
    queryKey: ["/api/products"],
  });

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
    inStock: p.inStock,
    stockCount: p.stockCount,
  }));

  const handleCategoryPress = (category: Category) => {
    navigation.navigate("Category", { category });
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate("ProductDetail", { product });
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const isLoading = categoriesLoading || productsLoading;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl + 80,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.searchContainer, { paddingHorizontal: Spacing.lg }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t.home.searchPlaceholder}
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        <Pressable
          style={[styles.micButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate("VoiceOrderModal")}
        >
          <Feather name="mic" size={20} color={theme.buttonText} />
        </Pressable>
      </View>

      {locationStatus === "denied" ? (
        <Pressable
          style={[styles.locationBanner, { backgroundColor: theme.warning + "20" }]}
          onPress={requestLocationPermission}
        >
          <Feather name="map-pin" size={16} color={theme.warning} />
          <View style={styles.locationBannerText}>
            <ThemedText type="caption" style={{ fontWeight: "600" }}>
              {t.home.enableLocationTitle}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t.home.enableLocationSubtitle}
            </ThemedText>
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
            <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
              {store.name}
            </ThemedText>
          </View>
        </View>
      ) : isCheckingAvailability ? (
        <View style={[styles.deliveryBadge, { backgroundColor: theme.backgroundDefault }]}>
          <ActivityIndicator size="small" color={theme.primary} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {t.home.findingStore}
          </ThemedText>
        </View>
      ) : locationStatus === "granted" && !storeAvailable ? (
        <View style={[styles.unavailableBanner, { backgroundColor: theme.error + "20" }]}>
          <Feather name="alert-circle" size={16} color={theme.error} />
          <View style={styles.locationBannerText}>
            <ThemedText type="caption" style={{ fontWeight: "600", color: theme.error }}>
              {t.home.noStoresNearby}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t.home.notAvailableInArea}
            </ThemedText>
          </View>
        </View>
      ) : (
        <View style={[styles.deliveryBadge, { backgroundColor: theme.primary }]}>
          <Feather name="zap" size={16} color={theme.buttonText} />
          <ThemedText type="caption" style={{ color: theme.buttonText, fontWeight: "600" }}>
            {`15-${t.home.minuteDelivery}`}
          </ThemedText>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          {t.home.categories}
        </ThemedText>
        <View style={styles.categoriesGrid}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={styles.categoryItem}
              onPress={() => handleCategoryPress(category)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: category.color + "20", overflow: "hidden" }]}>
                {category.image ? (
                  <Image source={{ uri: getImageUrl(category.image) }} style={styles.categoryImage} />
                ) : (
                  <Feather name={category.icon as any} size={24} color={category.color} />
                )}
              </View>
              <ThemedText type="small" style={styles.categoryLabel} numberOfLines={1}>
                {category.name}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          {t.home.todaysDeals}
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promotionsContainer}
        >
          {mockPromotions.map((promo, index) => (
            <Card
              key={index}
              style={{ ...styles.promoCard, backgroundColor: promo.color }}
            >
              <ThemedText type="h3" style={{ color: "#FFFFFF" }}>
                {promo.title}
              </ThemedText>
              <ThemedText type="caption" style={{ color: "#FFFFFF", opacity: 0.9 }}>
                {promo.subtitle}
              </ThemedText>
            </Card>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          {t.home.popularItems}
        </ThemedText>
        <View style={styles.productsGrid}>
          {products.slice(0, 6).map((product) => (
            <Pressable
              key={product.id}
              style={[styles.productCard, { backgroundColor: theme.cardBackground }]}
              onPress={() => handleProductPress(product)}
            >
              <View style={[styles.productImageContainer, { backgroundColor: theme.backgroundDefault }]}>
                {product.image ? (
                  <Image source={{ uri: getImageUrl(product.image) }} style={styles.productImage} />
                ) : (
                  <Feather name="package" size={32} color={theme.textSecondary} />
                )}
              </View>
              <View style={styles.productInfo}>
                <ThemedText type="caption" numberOfLines={2} style={styles.productName}>
                  {product.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {product.brand}
                </ThemedText>
                <View style={styles.productPriceRow}>
                  <ThemedText type="body" style={{ fontWeight: "600", color: theme.primary }}>
                    {formatPrice(product.price)}
                  </ThemedText>
                  <Pressable 
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                  >
                    <Feather name="plus" size={16} color={theme.buttonText} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
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
    height: 44,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  storeInfoContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
  },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
  },
  locationBannerText: {
    flex: 1,
  },
  unavailableBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  categoryItem: {
    width: "22%",
    alignItems: "center",
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  categoryImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
  },
  categoryLabel: {
    textAlign: "center",
  },
  promotionsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  promoCard: {
    width: 200,
    height: 100,
    marginRight: Spacing.md,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  productCard: {
    width: "47%",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  productImageContainer: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  productInfo: {
    padding: Spacing.sm,
  },
  productName: {
    marginBottom: Spacing.xs,
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
});
