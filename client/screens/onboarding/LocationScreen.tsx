import React from "react";
import { View, StyleSheet, Platform, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
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

  const handleSkip = () => {
    navigation.navigate("PhoneSignup");
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="map-pin" size={48} color={theme.primary} />
        </View>
        
        <ThemedText type="h2" style={styles.title}>
          Enable Location
        </ThemedText>
        
        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          We need your location to show you nearby stores and deliver to your address quickly.
        </ThemedText>
      </View>
      
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Button onPress={handleAllowLocation}>
          Allow Location Access
        </Button>
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
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xxl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  description: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  skipButton: {
    alignSelf: "center",
  },
});
