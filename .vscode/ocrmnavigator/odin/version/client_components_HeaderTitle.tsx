import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient"; 

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

// Brand Colors for Qikly
const QIKLY_GRADIENT = ["#00d2ff", "#3a7bd5"] as const;
const QIKLY_DEEP_BLUE = "#1e3a8a";

export function HeaderTitle() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={QIKLY_GRADIENT} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logo}
      >
        <ThemedText style={styles.logoText}>Q</ThemedText>
      </LinearGradient>

      <ThemedText style={styles.title}>Qikly</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    width: 32,
    height: 32,
    borderRadius: 8, // Slightly more modern curve
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
    shadowColor: QIKLY_DEEP_BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  logoText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: QIKLY_DEEP_BLUE, 
    letterSpacing: 0.5, // Better legibility for "Qikly"
  },
});