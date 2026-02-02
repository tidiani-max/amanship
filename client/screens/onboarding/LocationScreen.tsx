import React from "react";
import { View, StyleSheet, Platform, Linking, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Location">;

// Match the Qikly Gradient
const QIKLY_GRADIENT = ['#00d2ff', '#3a7bd5'] as const;
const BRAND_PRIMARY = '#3a7bd5';

export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [permission, requestPermission] = Location.useForegroundPermissions();

  const handleAllowLocation = async () => {
    if (!permission) return;
    
    if (permission.status === "denied" && !permission.canAskAgain) {
      if (Platform.OS !== "web") {
        try {
          await Linking.openSettings();
        } catch (error) {
          navigation.navigate("PhoneSignup");
        }
      }
      return;
    }
    
    const result = await requestPermission();
    if (result.granted) {
      navigation.navigate("PhoneSignup");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.centerWrapper}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoOuterBorder}>
             <Image 
                source={require("../../../assets/images/icon.png")} 
                style={styles.logoImage} 
                resizeMode="contain" 
              />
          </View>
        </View>
        
        <View style={styles.textContainer}>
            <ThemedText style={styles.tagline}>
                Enable Location
            </ThemedText>
            
            <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
                We need your location to show you nearby stores{"\n"}
                and ensure delivery by Aman Mart in minutes.
            </ThemedText>
        </View>
      </View>
      
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable onPress={handleAllowLocation}>
            <LinearGradient
                colors={QIKLY_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mainBtn}
            >
                <ThemedText style={styles.btnText}>Allow Location Access</ThemedText>
            </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("PhoneSignup")}
          style={styles.skipLink}
        >
          <ThemedText style={{ color: theme.textSecondary, fontWeight: '600' }}>
             Not now, I'll enter it later
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 40,
  },
  logoWrapper: { marginBottom: 60 },
  logoOuterBorder: {
    width: 180,               
    height: 180,
    borderRadius: 50,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: BRAND_PRIMARY,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  logoImage: { width: '100%', height: '100%' },
  textContainer: { alignItems: 'center' },
  tagline: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND_PRIMARY,
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  description: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  footer: { paddingHorizontal: Spacing.xl, width: '100%' },
  mainBtn: { 
    height: 60, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: BRAND_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  skipLink: { alignItems: "center", marginTop: 25 },
});