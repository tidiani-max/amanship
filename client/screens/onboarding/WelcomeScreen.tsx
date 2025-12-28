import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, animatedStyle]}>
          <View style={[styles.lightningCircle, { backgroundColor: theme.primary }]}>
            <Feather name="zap" size={64} color={theme.buttonText} />
          </View>
        </Animated.View>
        
        <Image
          source={require("../../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <ThemedText type="h1" style={styles.title}>
          AmanShip
        </ThemedText>
        
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Fresh groceries delivered to your door in 15 minutes
        </ThemedText>
      </View>
      
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Button onPress={() => navigation.navigate("Location")}>
          Get Started
        </Button>
        <Pressable
          onPress={() => navigation.navigate("PhoneSignup")}
          style={styles.skipLink}
        >
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Skip for Demo
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.xxl,
  },
  lightningCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
  },
  skipLink: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
});
