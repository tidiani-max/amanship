import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Image, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Category, Product } from "@/types";
import { mockCategories, mockProducts, mockPromotions } from "@/data/mockData";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const handleCategoryPress = (category: Category) => {
    navigation.navigate("Category", { category });
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate("ProductDetail", { product });
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

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
            placeholder="Search groceries..."
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

      <View style={[styles.deliveryBadge, { backgroundColor: theme.primary }]}>
        <Feather name="zap" size={16} color={theme.buttonText} />
        <ThemedText type="caption" style={{ color: theme.buttonText, fontWeight: "600" }}>
          15-minute delivery
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Categories
        </ThemedText>
        <View style={styles.categoriesGrid}>
          {mockCategories.map((category) => (
            <Pressable
              key={category.id}
              style={styles.categoryItem}
              onPress={() => handleCategoryPress(category)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: category.color + "20" }]}>
                <Feather name={category.icon as any} size={24} color={category.color} />
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
          Today's Deals
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
          Popular Items
        </ThemedText>
        <View style={styles.productsGrid}>
          {mockProducts.slice(0, 6).map((product) => (
            <Pressable
              key={product.id}
              style={[styles.productCard, { backgroundColor: theme.cardBackground }]}
              onPress={() => handleProductPress(product)}
            >
              <View style={[styles.productImageContainer, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="package" size={32} color={theme.textSecondary} />
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
                  <Pressable style={[styles.addButton, { backgroundColor: theme.primary }]}>
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
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
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
});
