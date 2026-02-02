import React, { useEffect } from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Welcome">;

// Updated to match the Qikly Logo Gradient (Cyan to Deep Blue/Purple)
const QIKLY_GRADIENT = ['#00d2ff', '#3a7bd5'] as const;
const BRAND_PRIMARY = '#3a7bd5';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ThemedView style={styles.container}>
      <View style={styles.centerWrapper}>
        
        {/* LOGO AREA */}
        <Animated.View style={[styles.logoWrapper, animatedStyle]}>
          <View style={styles.logoOuterBorder}>
             <Image 
                source={require("../../../assets/images/icon.png")} 
                style={styles.logoImage} 
                resizeMode="contain" 
              />
          </View>
        </Animated.View>
        
        {/* TEXT CONTENT */}
        <View style={styles.textContainer}>
            <ThemedText style={styles.tagline}>
                Quick Groceries by Aman Mart
            </ThemedText>
            
            <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
                Fresh essentials delivered from Indonesia's{"\n"}trusted shops to your door in minutes.
            </ThemedText>
        </View>
      </View>
      
      {/* FOOTER */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable onPress={() => navigation.navigate("Location")}>
            <LinearGradient
                colors={QIKLY_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mainBtn}
            >
                <ThemedText style={styles.btnText}>Get Started</ThemedText>
            </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("PhoneSignup")}
          style={styles.skipLink}
        >
          <ThemedText style={{ color: theme.textSecondary, fontWeight: '600' }}>
             Already have an account? <ThemedText style={{ color: BRAND_PRIMARY, fontWeight: 'bold' }}>Login</ThemedText>
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Clean white background to make the logo pop
  },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 40, 
  },
  logoWrapper: {
    marginBottom: 60, 
  },
  logoOuterBorder: {
    width: 200,               
    height: 200,
    borderRadius: 40,
    backgroundColor: '#fff',
    overflow: 'hidden',
    // Shadow color updated to match blue brand
    shadowColor: BRAND_PRIMARY,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND_PRIMARY,
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 2, 
    textAlign: 'center',
  },
  description: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  mainBtn: { 
    height: 60, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: BRAND_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  btnText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '700' 
  },
  skipLink: {
    alignItems: "center",
    marginTop: 25,
  },
});