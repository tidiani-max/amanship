import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

export function HeaderTitle() {
  return (
    <View style={styles.container}>
      <LinearGradient
        // UPDATED: Changed colors to match the blue/indigo in your icon
        colors={["#1e3a8a", "#3b82f6"]} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logo}
      >
        <ThemedText style={styles.logoText}>Z</ThemedText>
      </LinearGradient>

      <ThemedText style={styles.title}>ZendO</ThemedText>
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
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  logoText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    // UPDATED: Changed from #5B5BFF to a matching Blue
    color: "#1e3a8a", 
    letterSpacing: 0.2,
  },
});