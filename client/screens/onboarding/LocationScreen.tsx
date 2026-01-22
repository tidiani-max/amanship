import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
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

    const [addressLabel, setAddressLabel] = useState("");
  const [addressDetails, setAddressDetails] = useState("");

  const handleApplyNewLocation = () => {
    if (!selectedLocation) return;
    
    if (!addressLabel.trim()) {
      Alert.alert("Required", "Please enter an address label (e.g., Home, Office)");
      return;
    }

    setManualLocation({
      latitude: parseFloat(selectedLocation.lat),
      longitude: parseFloat(selectedLocation.lng),
      address: selectedLocation.address,
      label: addressLabel.trim(),
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
        {/* ... existing location options ... */}

        {/* Manual Address Entry */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Or Enter New Address
          </ThemedText>

          {/* Search input - existing code */}
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

          {/* ... predictions list ... */}

          {/* ✅ NEW: Address Label Input (REQUIRED) */}
          {selectedLocation && (
            <>
              <View style={{ marginTop: Spacing.md }}>
                <ThemedText type="body" style={{ marginBottom: Spacing.xs }}>
                  Address Label <ThemedText style={{ color: theme.error }}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                      borderColor: theme.border,
                    }
                  ]}
                  placeholder="e.g., Home, Office, Apartment 5B"
                  placeholderTextColor={theme.textSecondary}
                  value={addressLabel}
                  onChangeText={setAddressLabel}
                />
              </View>

              {/* ✅ Address Details (Optional) */}
              <View style={{ marginTop: Spacing.md }}>
                <ThemedText type="body" style={{ marginBottom: Spacing.xs }}>
                  Additional Details (Optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      backgroundColor: theme.backgroundDefault,
                      color: theme.text,
                      borderColor: theme.border,
                      height: 80,
                    }
                  ]}
                  placeholder="Building name, floor, gate code, etc."
                  placeholderTextColor={theme.textSecondary}
                  value={addressDetails}
                  onChangeText={setAddressDetails}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Selected Location Display */}
              <View
                style={[
                  styles.selectedLocation,
                  {
                    backgroundColor: theme.primary + "10",
                    borderColor: theme.primary,
                    marginTop: Spacing.md,
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
            </>
          )}
        </View>

        {/* ... rest of the component ... */}
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
            disabled={isCheckingAvailability || !addressLabel.trim()}
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
  textInput: {
    height: 48,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
});
