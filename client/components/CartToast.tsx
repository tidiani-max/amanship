import React, { useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 1. FIXED: Added hasItems to the interface
interface CartToastProps {
  visible: boolean;
  hasItems: boolean; 
  productName: string;
  onDismiss: () => void;
}

export function CartToast({ visible, hasItems, productName, onDismiss }: CartToastProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  
  // 0 = Mini Bubble, 1 = Fully Expanded
  const expansion = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      expansion.value = withSpring(1, { damping: 15 });
      // Auto-shrink back to bubble after 4s
      const timer = setTimeout(() => {
        expansion.value = withSpring(0);
        onDismiss(); 
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // FIXED: Function was missing in the previous snippet
  const handleGoToCart = () => {
    navigation.navigate("Cart");
  };

  const animatedStyle = useAnimatedStyle(() => ({
    width: expansion.value === 1 ? '90%' : 60,
    borderRadius: expansion.value === 1 ? 12 : 30,
    transform: [{ translateX: withSpring(expansion.value === 1 ? 0 : -10) }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: expansion.value,
    display: expansion.value < 0.1 ? 'none' : 'flex',
  }));

  // Only show if there are items in the cart
  if (!hasItems) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          bottom: insets.bottom + 100, 
          backgroundColor: theme.cardBackground 
        },
        Shadows.medium,
        animatedStyle,
      ]}
    >
      <Pressable 
        style={styles.mainArea} 
        onPress={() => (expansion.value = expansion.value === 0 ? withSpring(1) : withSpring(0))}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
          <Feather name="shopping-cart" size={20} color="#fff" />
          {/* Badge dot shows when minimized */}
          <View style={[styles.dot, { backgroundColor: theme.success }]} />
        </View>
        
        <Animated.View style={[styles.textContainer, contentStyle]}>
          <ThemedText type="small" style={{ fontWeight: "700" }}>Added to Cart</ThemedText>
          <ThemedText type="caption" numberOfLines={1} style={{ color: theme.textSecondary }}>
            {productName}
          </ThemedText>
        </Animated.View>
      </Pressable>

      <Animated.View style={contentStyle}>
         <Pressable onPress={handleGoToCart} style={[styles.goBtn, { backgroundColor: theme.primary }]}>
            <ThemedText style={{ color: '#fff', fontWeight: '600' }}>View</ThemedText>
         </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    zIndex: 1000,
    overflow: 'hidden',
  },
  mainArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white'
  },
  goBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10
  }
});
