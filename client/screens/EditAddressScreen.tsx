import React, { useState, useRef } from "react";
import { View, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useAuth } from "@/context/AuthContext"; 
import { useLocation } from "@/context/LocationContext";
import { apiRequest } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const BRAND_PURPLE = "#6338f2";
const BRAND_MINT = "#10b981";

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
  
  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string; 
    lat: string; 
    lng: string;
    storeName?: string;
    storeDistance?: number;
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
          `https://nominatim.openstreetmap.org/search?` +
          `format=json&` +
          `q=${encodeURIComponent(text)}&` +
          `countrycodes=id&` +
          `limit=10&` +
          `addressdetails=1`,
          { headers: { "User-Agent": "ZendOApp" } }
        );
        const data = await response.json();
        
        console.log(`📍 Found ${data.length} search results`);
        setPredictions(data);
        
      } catch (error) {
        console.error("❌ OSM Error:", error);
        Alert.alert("Search Error", "Could not search locations. Please try again.");
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const selectPlace = async (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    
    console.log(`📍 Selected location: ${lat}, ${lng}`);
    
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/stores/available?lat=${lat}&lng=${lng}`
      );
      
      const data = await response.json();
      
      if (!data.available) {
        Alert.alert(
          "No Delivery Available 😢",
          "Sorry, we don't deliver to this area yet. Please try a different location or check back soon!",
          [{ text: "Try Another Location" }]
        );
        return;
      }
      
      console.log(`✅ Store available: ${data.store.name} (${data.store.distanceKm}km away)`);
      
      setSelectedLocation({
        address: item.display_name,
        lat: item.lat,
        lng: item.lon,
        storeName: data.store.name,
        storeDistance: data.store.distanceKm,
      });
      setSearchQuery(item.display_name);
      setPredictions([]);
      
      Alert.alert(
        "Delivery Available! 🎉",
        `Great! We can deliver to this location from:\n\n` +
        `🏪 ${data.store.name}\n` +
        `📍 Distance: ${data.store.distanceKm}km\n` +
        `⏱️ Delivery: ~${data.estimatedDeliveryMinutes} minutes\n\n` +
        `Please add a label and save your address.`,
        [{ text: "OK" }]
      );
      
    } catch (error) {
      console.error("❌ Store check error:", error);
      Alert.alert("Error", "Could not verify delivery availability. Please try again.");
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      await useCurrentLocation();
      
      Alert.alert(
        "Location Set! ✓",
        "Your current GPS location has been set as delivery address.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("GPS Error:", error);
      Alert.alert("Error", "Could not get current location. Please enable GPS and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAddress = async () => {
    if (!selectedLocation) {
      Alert.alert("Error", "Please select a location first");
      return;
    }
    
    if (!label.trim()) {
      Alert.alert("Label Required", "Please give this address a label (e.g., Home, Office)");
      return;
    }

    setLoading(true);
    try {
      console.log("💾 Saving address:", {
        label: label.trim(),
        address: selectedLocation.address,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      });

      // ✅ Update LocationContext
      setManualLocation({
        latitude: parseFloat(selectedLocation.lat),
        longitude: parseFloat(selectedLocation.lng),
        address: selectedLocation.address,
        label: label.trim(),
        isManual: true,
      });

      // ✅ Save to database
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
        
        console.log("✅ Address saved to database");
      }
      
      // ✅ FIX: Navigate back without params
      Alert.alert(
        "Address Saved! ✓",
        `Your delivery address has been set to:\n\n` +
        `📍 ${label.trim()}\n` +
        `${selectedLocation.address}\n\n` +
        `${details.trim() ? `Note: ${details.trim()}\n\n` : ''}` +
        `Products from ${selectedLocation.storeName} will be shown on your home screen.`,
        [{ 
          text: "View Products", 
          onPress: () => {
            // ✅ FIX: Just go back, HomeScreen will auto-refresh
            navigation.goBack();
          }
        }]
      );
    } catch (error) {
      console.error("❌ Save address error:", error);
      Alert.alert("Error", "Could not save address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={28} color="#1e293b" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitleText}>Delivery Address</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <View style={styles.content}>
          {/* GPS OPTION */}
          <Pressable
            style={[
              styles.gpsCard,
              !isManualLocation && { borderColor: BRAND_PURPLE, backgroundColor: BRAND_PURPLE + '05' }
            ]}
            onPress={handleUseCurrentLocation}
            disabled={loading}
          >
            <View style={[styles.gpsIconCircle, { backgroundColor: BRAND_PURPLE + '15' }]}>
              <MaterialCommunityIcons name="crosshairs-gps" size={24} color={BRAND_PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.gpsTitle}>Current Location</ThemedText>
              <ThemedText style={styles.gpsSub}>Use GPS for precise delivery</ThemedText>
            </View>
            {!isManualLocation && <Feather name="check-circle" size={20} color={BRAND_PURPLE} />}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <ThemedText style={styles.orText}>OR SEARCH ADDRESS</ThemedText>
            <View style={styles.line} />
          </View>

          {/* SEARCH SECTION */}
          <View style={styles.section}>
            <View style={styles.searchWrapper}>
              <Feather name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search city, district, or street..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={searchOpenStreetMap}
              />
              {isSearching && <ActivityIndicator size="small" color={BRAND_PURPLE} />}
            </View>

            {predictions.length > 0 && (
              <View style={styles.predictionsBox}>
                {predictions.map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.predictionItem}
                    onPress={() => selectPlace(item)}
                  >
                    <View style={styles.pinCircle}>
                      <Feather name="map-pin" size={14} color="#64748b" />
                    </View>
                    <ThemedText numberOfLines={2} style={styles.predictionText}>
                      {item.display_name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* FORM (Shows after location selected) */}
          {selectedLocation && (
            <View style={styles.formSection}>
              {/* Selected Location Display */}
              <View style={styles.selectedIndicator}>
                <View style={styles.mintDot} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.selectedAddressText} numberOfLines={2}>
                    {selectedLocation.address}
                  </ThemedText>
                  {selectedLocation.storeName && (
                    <ThemedText style={styles.storeInfoText}>
                      🏪 Nearest Store: {selectedLocation.storeName} ({selectedLocation.storeDistance?.toFixed(1)}km)
                    </ThemedText>
                  )}
                </View>
              </View>

              {/* Label Input (REQUIRED) */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.fieldLabel}>
                  Label This Address <ThemedText style={{ color: '#ef4444' }}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="e.g. Home, Office, Mom's House"
                  placeholderTextColor="#cbd5e1"
                  autoCapitalize="words"
                />
              </View>

              {/* Additional Details Input (OPTIONAL) */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.fieldLabel}>
                  Additional Details (Optional)
                </ThemedText>
                <TextInput
                  style={[styles.textInput, styles.areaInput]}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  numberOfLines={4}
                  placeholder="Building name, floor, gate code, landmarks, etc..."
                  placeholderTextColor="#cbd5e1"
                  textAlignVertical="top"
                />
                <ThemedText style={styles.hintText}>
                  💡 Help the driver find you easily
                </ThemedText>
              </View>
            </View>
          )}

          {/* CURRENT SAVED ADDRESS (if exists) */}
          {isManualLocation && manualAddress && !selectedLocation && (
            <View style={styles.activeCard}>
              <View style={[styles.gpsIconCircle, { backgroundColor: BRAND_MINT + '15' }]}>
                <Feather name="map-pin" size={20} color={BRAND_MINT} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.activeLabel}>
                  ✓ {currentAddressLabel || "Current Address"}
                </ThemedText>
                <ThemedText style={styles.activeAddress} numberOfLines={2}>
                  {manualAddress}
                </ThemedText>
              </View>
              <MaterialCommunityIcons name="check-decagram" size={22} color={BRAND_MINT} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* SAVE BUTTON (Fixed at bottom) */}
      {selectedLocation && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity 
            style={[
              styles.submitBtn, 
              (!label.trim() || loading) && styles.btnDisabled
            ]}
            onPress={handleApplyAddress}
            disabled={loading || !label.trim()}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Feather name="check" size={20} color="white" style={{ marginRight: 8 }} />
                <ThemedText style={styles.submitBtnText}>
                  Save Delivery Address
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  headerTitleText: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  content: { padding: 20 },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    gap: 15,
    marginBottom: 20
  },
  gpsIconCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  gpsTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  gpsSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  dividerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    marginBottom: 20 
  },
  line: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  orText: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#94a3b8', 
    letterSpacing: 1 
  },
  section: { marginBottom: 20 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  searchIcon: { marginRight: 12 },
  searchInput: { 
    flex: 1, 
    fontSize: 15, 
    color: '#1e293b', 
    fontWeight: '500' 
  },
  predictionsBox: {
    backgroundColor: 'white',
    borderRadius: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  predictionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  pinCircle: { 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    backgroundColor: '#f1f5f9', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  predictionText: { 
    flex: 1, 
    fontSize: 14, 
    color: '#334155', 
    lineHeight: 20 
  },
  formSection: { gap: 20 },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_MINT + '10',
    padding: 15,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: BRAND_MINT + '20'
  },
  mintDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: BRAND_MINT 
  },
  selectedAddressText: { 
    fontSize: 13, 
    color: '#065f46', 
    fontWeight: '600',
    lineHeight: 18,
  },
  storeInfoText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  inputGroup: { gap: 8 },
  fieldLabel: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: '#64748b', 
    marginLeft: 4 
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    color: '#1e293b'
  },
  areaInput: { 
    height: 100, 
    paddingTop: 16,
  },
  hintText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 4,
    marginTop: 4,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BRAND_MINT + '20',
    gap: 15
  },
  activeLabel: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#1e293b' 
  },
  activeAddress: { 
    fontSize: 12, 
    color: '#64748b', 
    marginTop: 2 
  },
  footer: {
    position: 'absolute',
    bottom: 0, 
    left: 0, 
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  submitBtn: {
    backgroundColor: BRAND_PURPLE,
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: BRAND_PURPLE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  btnDisabled: { 
    backgroundColor: '#cbd5e1', 
    shadowOpacity: 0, 
    elevation: 0 
  },
  submitBtnText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '800' 
  }
});