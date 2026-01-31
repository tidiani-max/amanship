import React from "react";
import { View, StyleSheet, Platform, Linking, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Location">;

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
      {/* Decorative Background Elements */}
      <View style={styles.bgDecoration}>
        <View style={[styles.mapCircle, { top: '10%', left: -50, backgroundColor: '#4f46e508' }]} />
        <View style={[styles.mapCircle, { bottom: '20%', right: -80, backgroundColor: '#7c3aed08', width: 400, height: 400 }]} />
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Zendo Squircle Icon */}
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={['#f5f3ff', '#ede9fe']}
            style={styles.squircleContainer}
          >
            <Feather name="map-pin" size={50} color="#4f46e5" />
          </LinearGradient>
          <View style={styles.pulseRing} />
        </View>
        
        <ThemedText style={styles.title}>
          Find Stores Near You
        </ThemedText>
        
        <ThemedText style={styles.description}>
          Zendo needs your location to show available stores and provide accurate 15-minute delivery estimates.
        </ThemedText>
      </View>
      
      {/* Bottom Action Area */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.infoCard}>
          <Feather name="shield" size={16} color="#10b981" />
          <ThemedText style={styles.infoText}>Your data is secure and never shared.</ThemedText>
        </View>

        <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
        >
            <Pressable 
                onPress={handleAllowLocation}
                style={styles.mainBtn}
            >
                <ThemedText style={styles.btnText}>Allow Location Access</ThemedText>
            </Pressable>
        </LinearGradient>

        <Pressable onPress={() => navigation.navigate("PhoneSignup")} style={styles.skipBtn}>
           <ThemedText style={styles.skipText}>Not now, I'll enter it manually</ThemedText>
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
    zIndex: 0,
  },
  mapCircle: {
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
    zIndex: 1,
  },
  iconWrapper: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squircleContainer: {
    width: 120,
    height: 120,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#f5f3ff',
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: '#1e293b',
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: '#64748b',
    lineHeight: 24,
    fontWeight: '600',
    paddingHorizontal: 10,
  },
  footer: {
    paddingHorizontal: 32,
    zIndex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '700',
  },
  btnGradient: {
    borderRadius: 20,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  mainBtn: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  skipBtn: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  }
});