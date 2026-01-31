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

// Strict tuple for TypeScript
const ZENDO_PURPLE = ['#4f46e5', '#7c3aed'] as const;

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
      {/* CENTERED CONTENT TO MATCH WELCOME SCREEN */}
      <View style={styles.centerWrapper}>
        
        <View style={styles.logoWrapper}>
          <View style={styles.logoOuterBorder}>
             <Image 
                source={require("../../../assets/images/icon.jpeg")} 
                style={styles.logoImage} 
                resizeMode="cover" 
              />
          </View>
        </View>
        
        <View style={styles.textContainer}>
            <ThemedText style={styles.tagline}>
                Enable Location
            </ThemedText>
            
            <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
                We need your location to show you nearby stores{"\n"}and ensure delivery by Aman Mart in minutes.
            </ThemedText>
        </View>
      </View>
      
      {/* FOOTER WITH GRADIENT BUTTON */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable onPress={handleAllowLocation}>
            <LinearGradient
                colors={ZENDO_PURPLE}
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 40,
  },
  logoWrapper: {
    marginBottom: 60, // Consistent with Welcome Screen spacing
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
    fontSize: 16,
    fontWeight: '800',
    color: '#4f46e5',
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