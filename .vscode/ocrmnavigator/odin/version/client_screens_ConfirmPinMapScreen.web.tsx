// screens/ConfirmPinMapScreen.web.tsx
// Web stub — this screen is native-only (uses react-native-maps)

import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";

export default function ConfirmPinMapScreen() {
  return (
    <View style={styles.container}>
      <ThemedText>Map confirmation is only available on mobile.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});