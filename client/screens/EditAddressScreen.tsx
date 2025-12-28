import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useAuth } from "@/context/AuthContext"; 
import { apiRequest } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EditAddressScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  
  const [label, setLabel] = useState("Home");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  
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

    // Debounce: Wait 500ms after last keystroke
    if (searchTimer.current) clearTimeout(searchTimer.current);
    
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Nominatim API - 100% Free
        // We limit to Indonesia (countrycodes=id)
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
  };

  const handleSave = async () => {
    if (!selectedLocation || !user?.id) {
      Alert.alert("Required", "Please select an address from the suggestions.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("POST", "/api/addresses", {
        userId: user.id,
        label,
        fullAddress: selectedLocation.address,
        details,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        isDefault: true
      });
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
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>Address Label</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Home / Office"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          {/* 100% FREE SEARCH */}
          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>Search Address (Free)</ThemedText>
            <View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                placeholder="Type street or area name..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={searchOpenStreetMap}
              />
              {isSearching && (
                <ActivityIndicator style={styles.inlineLoader} size="small" color={theme.primary} />
              )}
            </View>

            {predictions.length > 0 && (
              <View style={[styles.resultsContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                {predictions.map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.resultItem, { borderBottomColor: theme.border }]}
                    onPress={() => selectPlace(item)}
                  >
                    <ThemedText numberOfLines={2} style={{ fontSize: 14, color: theme.text }}>
                      {item.display_name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>Notes / Unit / Floor</ThemedText>
            <TextInput
              style={[styles.input, styles.multilineInput, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={details}
              onChangeText={setDetails}
              multiline
              placeholder="e.g. Blue door, 2nd floor"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button onPress={handleSave} disabled={loading || !selectedLocation}>
            {loading ? <ActivityIndicator color="#fff" /> : "Save Address"}
          </Button>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.lg },
  form: { flex: 1 },
  inputGroup: { marginBottom: Spacing.xl },
  label: { marginBottom: Spacing.sm, textTransform: "uppercase", fontSize: 12, letterSpacing: 1 },
  input: { height: Spacing.inputHeight, borderRadius: BorderRadius.sm, borderWidth: 1, paddingHorizontal: Spacing.lg, fontSize: 16 },
  multilineInput: { height: 80, paddingTop: 12 },
  inlineLoader: { position: 'absolute', right: 15, top: 15 },
  resultsContainer: {
    marginTop: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  resultItem: { padding: 15, borderBottomWidth: 1 },
  footer: { paddingTop: Spacing.lg },
});