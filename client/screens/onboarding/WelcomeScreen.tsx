import React from "react";
import { View, StyleSheet, Image, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Welcome">;
const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.05], [0.9, 1]),
  }));

  return (
    <ThemedView style={styles.container}>
      {/* Background Decorative Gradients */}
      <View style={styles.bgDecoration}>
        <View style={[styles.circle, { backgroundColor: '#4f46e5', opacity: 0.05, top: -50, right: -50 }]} />
        <View style={[styles.circle, { backgroundColor: '#7c3aed', opacity: 0.05, bottom: 100, left: -100 }]} />
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            style={styles.squircleIcon}
          >
            <Feather name="zap" size={60} color="#FFFFFF" />
          </LinearGradient>
          {/* Shadow Glow */}
          <View style={styles.glow} />
        </Animated.View>
        
        <View style={styles.textGroup}>
          <ThemedText style={styles.brandTitle}>Zendo</ThemedText>
          <ThemedText style={styles.tagline}>
            Fresh groceries delivered to your door in <ThemedText style={styles.highlight}>15 minutes</ThemedText>
          </ThemedText>
        </View>
      </View>
      
      <View style={[styles.footer, { paddingBottom: insets.bottom + 40 }]}>
        <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
        >
            <Pressable 
                onPress={() => navigation.navigate("Location")}
                style={styles.mainBtn}
            >
                <ThemedText style={styles.btnText}>Get Started</ThemedText>
                <Feather name="arrow-right" size={20} color="#fff" />
            </Pressable>
        </LinearGradient>

        <Pressable
          onPress={() => navigation.navigate("PhoneSignup")}
          style={styles.loginLink}
        >
          <ThemedText style={styles.loginText}>
            Already have an account? <ThemedText style={styles.loginHighlight}>Sign In</ThemedText>
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  bgDecoration: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 40,
    position: 'relative',
  },
  squircleIcon: {
    width: 130,
    height: 130,
    borderRadius: 45, // Modern Zendo Squircle
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  glow: {
    position: 'absolute',
    width: 100,
    height: 100,
    backgroundColor: '#4f46e5',
    borderRadius: 50,
    bottom: 0,
    alignSelf: 'center',
    opacity: 0.3,
    filter: 'blur(20px)', // Note: standard RN uses shadowProp, for web/expo-blur use blur
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  textGroup: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: "900",
    color: '#1e293b',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    textAlign: "center",
    color: '#64748b',
    marginTop: 12,
    lineHeight: 26,
    fontWeight: '600',
    paddingHorizontal: 20,
  },
  highlight: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 32,
  },
  btnGradient: {
    borderRadius: 22,
    elevation: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  loginLink: {
    alignItems: "center",
    marginTop: 24,
  },
  loginText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  loginHighlight: {
    color: '#1e293b',
    fontWeight: '800',
  },
});