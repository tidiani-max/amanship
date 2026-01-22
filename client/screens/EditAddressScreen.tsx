import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useAuth } from "@/context/AuthContext"; 
import { useLocation } from "@/context/LocationContext";
import { apiRequest } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EditAddressScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { 
    useCurrentLocation, 
    setManualLocation,
    isManualLocation,
    manualAddress,
    addressLabel: currentAddressLabel, // ✅ Get current label
  } = useLocation();
  
  const [label, setLabel] = useState("Home");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [usingGPS, setUsingGPS] = useState(false);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string; lat: string; lng: string;
  } | null>(null);

  // Debounce Timer Ref
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
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=id&limit=5&addressdetails=1`,
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
    setUsingGPS(false);
  };

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      await useCurrentLocation();
      setUsingGPS(true);
      setSelectedLocation(null);
      setSearchQuery("");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Could not get your current location.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAddress = async () => {
    if (!selectedLocation) {
      Alert.alert("Required", "Please select an address from the suggestions.");
      return;
    }

    // ✅ Validate label is required
    if (!label.trim()) {
      Alert.alert("Required", "Please enter an address label (e.g., Home, Office)");
      return;
    }

    setLoading(true);
    try {
      // ✅ Set as manual location in context WITH LABEL
      setManualLocation({
        latitude: parseFloat(selectedLocation.lat),
        longitude: parseFloat(selectedLocation.lng),
        address: selectedLocation.address,
        label: label.trim(), // ✅ Include the label
        isManual: true,
      });

      // Also save to database if user is logged in
      if (user?.id) {
        await apiRequest("POST", "/api/addresses", {
          userId: user.id,
          label: label.trim(),
          fullAddress: selectedLocation.address,
          details: details.trim() || null,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          isDefault: true
        });
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Could not save address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + 150 },
        ]}
      >
        {/* Use Current GPS Location Option */}
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
            disabled={loading}
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
                Use Current GPS Location
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary }}
              >
                Automatically detect my location
              </ThemedText>
            </View>
            {!isManualLocation && (
              <Feather name="check-circle" size={20} color={theme.primary} />
            )}
          </Pressable>
        </View>

        {/* Manual Address Search */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Or Enter New Address
          </ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
              Search Address
            </ThemedText>
            <View>
              <View style={[styles.searchContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                <Feather name="search" size={18} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Type street, area, or landmark..."
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={searchOpenStreetMap}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={theme.primary} />
                )}
              </View>
            </View>

            {predictions.length > 0 && (
              <View style={[styles.resultsContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                {predictions.map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.resultItem, { borderBottomColor: theme.border }]}
                    onPress={() => selectPlace(item)}
                  >
                    <Feather name="map-pin" size={16} color={theme.textSecondary} />
                    <ThemedText numberOfLines={2} style={{ fontSize: 14, color: theme.text, flex: 1, marginLeft: Spacing.sm }}>
                      {item.display_name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {selectedLocation && (
            <View style={[styles.selectedAddress, { backgroundColor: theme.primary + "10", borderColor: theme.primary }]}>
              <Feather name="check-circle" size={16} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <ThemedText type="caption" style={{ color: theme.primary, marginBottom: 2 }}>
                  Selected Address
                </ThemedText>
                <ThemedText type="body" numberOfLines={2}>
                  {selectedLocation.address}
                </ThemedText>
              </View>
            </View>
          )}

          {selectedLocation && (
            <>
              {/* ✅ REQUIRED: Address Label */}
              <View style={styles.inputGroup}>
                <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
                  Address Label <ThemedText style={{ color: theme.error }}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      backgroundColor: theme.backgroundDefault, 
                      borderColor: label.trim() ? theme.border : theme.error, 
                      color: theme.text 
                    }
                  ]}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="e.g. Home, Office, Apartment 5B"
                  placeholderTextColor={theme.textSecondary}
                />
                {!label.trim() && (
                  <ThemedText type="small" style={{ color: theme.error, marginTop: 4 }}>
                    This field is required for drivers to find you
                  </ThemedText>
                )}
              </View>

              {/* Optional: Additional Details */}
              <View style={styles.inputGroup}>
                <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
                  Additional Details (Optional)
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.multilineInput, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  placeholder="e.g. Blue door, 2nd floor, Building A, Gate code: 1234"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </>
          )}
        </View>

        {/* Current Manual Location Display */}
        {isManualLocation && manualAddress && !selectedLocation && (
          <View style={[styles.currentAddress, { backgroundColor: theme.backgroundDefault, borderColor: theme.success }]}>
            <Feather name="check-circle" size={20} color={theme.success} />
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" style={{ color: theme.success, marginBottom: 2 }}>
                Current Delivery Address
              </ThemedText>
              {currentAddressLabel && (
                <ThemedText type="h3" style={{ marginBottom: 4 }}>
                  {currentAddressLabel}
                </ThemedText>
              )}
              <ThemedText type="body" numberOfLines={2} style={{ color: theme.textSecondary }}>
                {manualAddress}
              </ThemedText>
            </View>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>

      {/* Fixed Footer Button */}
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
            onPress={handleApplyAddress} 
            disabled={loading || !label.trim()}
          >
            {loading ? <ActivityIndicator color="#fff" /> : "Apply This Address"}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: Spacing.lg 
  },
  
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

  inputGroup: { 
    marginBottom: Spacing.lg 
  },
  
  label: { 
    marginBottom: Spacing.sm, 
    textTransform: "uppercase", 
    fontSize: 12, 
    letterSpacing: 1 
  },
  
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  input: { 
    height: Spacing.inputHeight, 
    borderRadius: BorderRadius.sm, 
    borderWidth: 1, 
    paddingHorizontal: Spacing.lg, 
    fontSize: 16 
  },
  
  multilineInput: { 
    height: 80, 
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  
  resultsContainer: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  
  resultItem: { 
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md, 
    borderBottomWidth: 1 
  },

  selectedAddress: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    borderWidth: 2,
    marginBottom: Spacing.md,
  },

  currentAddress: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    borderWidth: 2,
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