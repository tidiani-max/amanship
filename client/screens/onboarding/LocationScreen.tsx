import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useLocation } from "@/context/LocationContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ChangeLocationScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const { 
    isManualLocation, 
    manualAddress,
    useCurrentLocation,
    setManualLocation,
    isCheckingAvailability 
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    lat: string;
    lng: string;
  } | null>(null);

  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const searchOpenStreetMap = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setPredictions([]);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            text
          )}&countrycodes=id&limit=8&addressdetails=1`,
          { headers: { "User-Agent": "KilatGoApp" } }
        );
        const data = await response.json();
        setPredictions(data);
      } catch (error) {
        console.error("OSM Error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const selectPlace = (item: any) => {
    setSelectedLocation({
      address: item.display_name,
      lat: item.lat,
      lng: item.lon,
    });
    setSearchQuery(item.display_name);
    setPredictions([]);
  };

  const handleUseCurrentLocation = async () => {
    await useCurrentLocation();
    navigation.goBack();
  };

  const handleApplyNewLocation = () => {
    if (!selectedLocation) return;

    setManualLocation({
      latitude: parseFloat(selectedLocation.lat),
      longitude: parseFloat(selectedLocation.lng),
      address: selectedLocation.address,
      isManual: true,
    });

    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Current Location Option */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Location Options
          </ThemedText>

          <Pressable
            style={[
              styles.locationOption,
              {
                backgroundColor: theme.cardBackground,
                borderColor: !isManualLocation ? theme.primary : theme.border,
                borderWidth: !isManualLocation ? 2 : 1,
              },
            ]}
            onPress={handleUseCurrentLocation}
          >
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <Feather name="navigation" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Use Current Location
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary }}
              >
                GPS will detect your location automatically
              </ThemedText>
            </View>
            {!isManualLocation && (
              <Feather name="check-circle" size={20} color={theme.primary} />
            )}
          </Pressable>
        </View>

        {/* Manual Address Entry */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Or Enter New Address
          </ThemedText>

          <View
            style={[
              styles.searchContainer,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Feather name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search street, area, or landmark..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={searchOpenStreetMap}
            />
            {isSearching && (
              <ActivityIndicator size="small" color={theme.primary} />
            )}
          </View>

          {predictions.length > 0 && (
            <View
              style={[
                styles.predictionsContainer,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}
            >
              {predictions.map((item, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.predictionItem,
                    { borderBottomColor: theme.border },
                  ]}
                  onPress={() => selectPlace(item)}
                >
                  <Feather
                    name="map-pin"
                    size={16}
                    color={theme.textSecondary}
                  />
                  <ThemedText
                    numberOfLines={2}
                    style={{ fontSize: 14, flex: 1 }}
                  >
                    {item.display_name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}

          {selectedLocation && (
            <View
              style={[
                styles.selectedLocation,
                {
                  backgroundColor: theme.primary + "10",
                  borderColor: theme.primary,
                },
              ]}
            >
              <Feather name="map-pin" size={16} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <ThemedText type="caption" style={{ color: theme.primary }}>
                  Selected Address
                </ThemedText>
                <ThemedText type="body" numberOfLines={2}>
                  {selectedLocation.address}
                </ThemedText>
              </View>
            </View>
          )}
        </View>

        {/* Current Manual Location Display */}
        {isManualLocation && manualAddress && !selectedLocation && (
          <View
            style={[
              styles.currentManual,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Current Delivery Address
              </ThemedText>
              <ThemedText type="body" numberOfLines={2}>
                {manualAddress}
              </ThemedText>
            </View>
            <Feather name="check-circle" size={20} color={theme.success} />
          </View>
        )}
      </ScrollView>

      {/* Footer Button */}
      {selectedLocation && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.backgroundRoot,
              paddingBottom: insets.bottom + Spacing.md,
            },
          ]}
        >
          <Button
            onPress={handleApplyNewLocation}
            disabled={isCheckingAvailability}
          >
            {isCheckingAvailability
              ? "Checking stores..."
              : "Apply New Location"}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },

  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
  },

  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  predictionsContainer: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
  },

  predictionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },

  selectedLocation: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    borderWidth: 1,
  },

  currentManual: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    borderWidth: 1,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
});