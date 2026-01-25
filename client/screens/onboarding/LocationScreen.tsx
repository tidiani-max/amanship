import React, { useState, useRef } from "react";
import { View, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useAuth } from "@/context/AuthContext"; 
import { useLocation } from "@/context/LocationContext";
import { apiRequest } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EditAddressScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { 
    useCurrentLocation, 
    setManualLocation,
    isManualLocation,
    manualAddress,
    addressLabel: currentAddressLabel,
  } = useLocation();
  
  const [label, setLabel] = useState("");
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

    if (!label.trim()) {
      Alert.alert("Required", "Please enter an address label (e.g., Home, Office)");
      return;
    }

    setLoading(true);
    try {
      setManualLocation({
        latitude: parseFloat(selectedLocation.lat),
        longitude: parseFloat(selectedLocation.lng),
        address: selectedLocation.address,
        label: label.trim(),
        isManual: true,
      });

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

  // Check if form is valid
  const isFormValid = selectedLocation && label.trim().length > 0;

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={{ flex: 1 }}>
        {/* Fixed Header */}
        <View style={[
          styles.header, 
          { 
            backgroundColor: theme.cardBackground,
            paddingTop: insets.top + 12,
            borderBottomColor: theme.border
          }
        ]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3" style={{ flex: 1, textAlign: 'center', marginRight: 40 }}>
            Edit Address
          </ThemedText>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { 
              paddingBottom: selectedLocation ? insets.bottom + 120 : insets.bottom + 24
            }
          ]}
        >
          {/* Use Current GPS Location Option */}
          <View style={styles.section}>
            <ThemedText type="h3" style={styles.sectionTitle}>
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
              android_ripple={{ color: theme.primary + '20' }}
            >
              <View style={[styles.optionIcon, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="navigation" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Use Current GPS Location
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
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
            <ThemedText type="h3" style={styles.sectionTitle}>
              Or Enter New Address
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
                SEARCH ADDRESS
              </ThemedText>
              <View style={[
                styles.searchContainer, 
                { 
                  backgroundColor: theme.backgroundDefault, 
                  borderColor: theme.border 
                }
              ]}>
                <Feather name="search" size={18} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Type street, area, or landmark..."
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={searchOpenStreetMap}
                  returnKeyType="search"
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={theme.primary} />
                )}
              </View>

              {predictions.length > 0 && (
                <View style={[
                  styles.resultsContainer, 
                  { 
                    backgroundColor: theme.backgroundDefault, 
                    borderColor: theme.border 
                  }
                ]}>
                  {predictions.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[
                        styles.resultItem, 
                        { borderBottomColor: theme.border },
                        index === predictions.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      onPress={() => selectPlace(item)}
                      activeOpacity={0.7}
                    >
                      <Feather name="map-pin" size={16} color={theme.textSecondary} />
                      <ThemedText numberOfLines={2} style={{ fontSize: 14, flex: 1, marginLeft: 10 }}>
                        {item.display_name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {selectedLocation && (
              <View style={[
                styles.selectedAddress, 
                { 
                  backgroundColor: theme.primary + "10", 
                  borderColor: theme.primary 
                }
              ]}>
                <Feather name="check-circle" size={16} color={theme.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <ThemedText type="caption" style={{ color: theme.primary, marginBottom: 4 }}>
                    Selected Address
                  </ThemedText>
                  <ThemedText type="body" numberOfLines={3}>
                    {selectedLocation.address}
                  </ThemedText>
                </View>
              </View>
            )}

            {selectedLocation && (
              <>
                {/* Address Label */}
                <View style={styles.inputGroup}>
                  <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
                    ADDRESS LABEL <ThemedText style={{ color: theme.error }}>*</ThemedText>
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
                    returnKeyType="next"
                  />
                  {!label.trim() && (
                    <ThemedText type="small" style={{ color: theme.error, marginTop: 6 }}>
                      This field is required for drivers to find you
                    </ThemedText>
                  )}
                </View>

                {/* Additional Details */}
                <View style={styles.inputGroup}>
                  <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
                    ADDITIONAL DETAILS (OPTIONAL)
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input, 
                      styles.multilineInput, 
                      { 
                        backgroundColor: theme.backgroundDefault, 
                        borderColor: theme.border, 
                        color: theme.text 
                      }
                    ]}
                    value={details}
                    onChangeText={setDetails}
                    multiline
                    numberOfLines={3}
                    placeholder="e.g. Blue door, 2nd floor, Building A, Gate code: 1234"
                    placeholderTextColor={theme.textSecondary}
                    textAlignVertical="top"
                    returnKeyType="done"
                  />
                </View>
              </>
            )}
          </View>

          {/* Current Manual Location Display */}
          {isManualLocation && manualAddress && !selectedLocation && (
            <View style={[
              styles.currentAddress, 
              { 
                backgroundColor: theme.backgroundDefault, 
                borderColor: theme.success 
              }
            ]}>
              <Feather name="check-circle" size={20} color={theme.success} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText type="caption" style={{ color: theme.success, marginBottom: 4 }}>
                  Current Delivery Address
                </ThemedText>
                {currentAddressLabel && (
                  <ThemedText type="h3" style={{ marginBottom: 6 }}>
                    {currentAddressLabel}
                  </ThemedText>
                )}
                <ThemedText type="body" numberOfLines={3} style={{ color: theme.textSecondary }}>
                  {manualAddress}
                </ThemedText>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Fixed Footer Button */}
        {selectedLocation && (
          <View
            style={[
              styles.footer,
              {
                backgroundColor: theme.backgroundRoot,
                paddingBottom: insets.bottom + 16,
                borderTopColor: theme.border
              }
            ]}
          >
            <Button 
              onPress={handleApplyAddress} 
              disabled={loading || !isFormValid}
            >
              {loading ? <ActivityIndicator color="#fff" /> : "Apply This Address"}
            </Button>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1000,
  },
  backButton: {
    padding: 4,
  },
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  
  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    marginBottom: 12,
    fontWeight: '700',
  },

  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },

  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  inputGroup: { 
    marginBottom: 18
  },
  
  label: { 
    marginBottom: 8, 
    textTransform: "uppercase", 
    fontSize: 11, 
    letterSpacing: 0.5,
    fontWeight: '600'
  },
  
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },

  input: { 
    minHeight: 50, 
    borderRadius: 12, 
    borderWidth: 1, 
    paddingHorizontal: 16, 
    fontSize: 15,
    paddingVertical: 14
  },
  
  multilineInput: { 
    minHeight: 100,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  
  resultsContainer: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    maxHeight: 300
  },
  
  resultItem: { 
    flexDirection: "row",
    alignItems: "center",
    padding: 14, 
    borderBottomWidth: 1 
  },

  selectedAddress: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 2,
    marginBottom: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },

  currentAddress: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    borderTopWidth: 1
  }
});