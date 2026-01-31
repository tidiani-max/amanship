import React, { useEffect } from "react";
import { View, StyleSheet, Image, Pressable, Dimensions } from "react-native";
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

const ZENDO_PURPLE = ['#4f46e5', '#7c3aed'] as const;

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
      {/* CONTENT AREA */}
      <View style={styles.centerWrapper}>
        
        {/* LOGO POSITIONED LOWER */}
        <Animated.View style={[styles.logoWrapper, animatedStyle]}>
          <View style={styles.logoOuterBorder}>
             <Image 
                source={require("../../../assets/images/icon.jpeg")} 
                style={styles.logoImage} 
                resizeMode="cover" 
              />
          </View>
        </Animated.View>
        
        {/* TEXT CONTAINER WITH MORE TOP SPACING */}
        <View style={styles.textContainer}>
            <ThemedText style={styles.tagline}>
                send order online by Aman Mart
            </ThemedText>
            
            <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
                Fresh groceries and essentials delivered{"\n"}to your doorstep in minutes.
            </ThemedText>
        </View>
      </View>
      
      {/* FOOTER */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable onPress={() => navigation.navigate("Location")}>
            <LinearGradient
                colors={ZENDO_PURPLE}
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
             Already have an account? <ThemedText style={{ color: '#4f46e5', fontWeight: 'bold' }}>Login</ThemedText>
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    // Moving the whole group slightly down to avoid looking "top-heavy"
    paddingTop: 40, 
  },
  logoWrapper: {
    // Large bottom margin to create breathing room between logo and text
    marginBottom: 60, 
  },
  logoOuterBorder: {
    width: 180,               
    height: 180,
    borderRadius: 60,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 15,
    borderWidth: 6,
    borderColor: '#fff',
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
    color: '#4f46e5',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1.5, // Increased letter spacing for a modern look
    textAlign: 'center',
  },
  description: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 30,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  mainBtn: { 
    height: 65, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '800' 
  },
  skipLink: {
    alignItems: "center",
    marginTop: 25,
  },
});