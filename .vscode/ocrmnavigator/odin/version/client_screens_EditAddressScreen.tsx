import React, { useState, useRef } from "react";
import {
  View, StyleSheet, TextInput, Alert, ActivityIndicator,
  TouchableOpacity, Pressable, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { apiRequest } from "@/lib/query-client";
import { GRABMAPS_CONFIG, getSmartZoom } from "@/lib/mapConfig";

type RootStackParamList = {
  EditAddress: undefined;
  ConfirmPinMap: { initialLat?: number; initialLng?: number; onConfirm?: (lat: number, lng: number, address: string) => void };
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const BRAND_PURPLE = "#6338f2";
const BRAND_MINT   = "#10b981";
const BRAND_ORANGE = "#f97316";

// Label → icon mapping
const LABEL_ICONS: Record<string, { icon: string; color: string }> = {
  home:   { icon: "home",       color: "#6338f2" },
  rumah:  { icon: "home",       color: "#6338f2" },
  office: { icon: "briefcase",  color: "#3b82f6" },
  kantor: { icon: "briefcase",  color: "#3b82f6" },
  work:   { icon: "briefcase",  color: "#3b82f6" },
  gym:    { icon: "activity",   color: "#f97316" },
  mall:   { icon: "shopping-bag", color: "#ec4899" },
  school: { icon: "book",       color: "#8b5cf6" },
  mom:    { icon: "heart",      color: "#ef4444" },
  other:  { icon: "map-pin",    color: "#64748b" },
};

function getLabelMeta(label: string) {
  const key = label.toLowerCase().split(" ")[0];
  return LABEL_ICONS[key] || { icon: "map-pin", color: "#64748b" };
}

interface SavedAddress {
  id: string;
  label: string;
  fullAddress: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
}

export default function EditAddressScreen() {
  const insets     = useSafeAreaInsets();
  const { theme }  = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user }   = useAuth();
  const queryClient = useQueryClient();
  const {
    useCurrentLocation,
    setManualLocation,
    isManualLocation,
    manualAddress,
    addressLabel: currentAddressLabel,
    location: contextLocation,
    accuracy: contextAccuracy,
  } = useLocation();

  const [label,    setLabel]    = useState("");
  const [details,  setDetails]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchQuery,      setSearchQuery]      = useState("");
  const [predictions,      setPredictions]      = useState<any[]>([]);
  const [isSearching,      setIsSearching]      = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string; lat: string; lng: string;
  } | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch saved addresses ──────────────────────────────────────────────────
  const { data: savedAddresses = [], refetch: refetchAddresses } = useQuery<SavedAddress[]>({
    queryKey: ["/api/addresses", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/addresses?userId=${user!.id}`
      );
      return res.json();
    },
  });

  // ── Apply a saved address instantly ────────────────────────────────────────
  const handleUseSavedAddress = (addr: SavedAddress) => {
    setManualLocation({
      latitude:  parseFloat(addr.latitude),
      longitude: parseFloat(addr.longitude),
      address:   addr.fullAddress,
      label:     addr.label,
      isManual:  true,
    });
    navigation.goBack();
  };

  // ── Delete a saved address ─────────────────────────────────────────────────
  const handleDeleteAddress = async (addr: SavedAddress) => {
    Alert.alert(
      "Delete Address",
      `Remove "${addr.label}" from saved places?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(addr.id);
            try {
              const res = await fetch(
                `${process.env.EXPO_PUBLIC_DOMAIN}/api/addresses/${addr.id}?userId=${user?.id}`,
                { method: "DELETE" }
              );
              if (res.ok) {
                refetchAddresses();
              }
            } catch {
              Alert.alert("Error", "Could not delete address.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Set as default ─────────────────────────────────────────────────────────
  const handleSetDefault = async (addr: SavedAddress) => {
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/addresses/${addr.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDefault: true }),
        }
      );
      refetchAddresses();
    } catch {
      Alert.alert("Error", "Could not set default.");
    }
  };

  // ── OSM Search ────────────────────────────────────────────────────────────
  const searchOpenStreetMap = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) { setPredictions([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=id&limit=5&addressdetails=1`,
          { headers: { "User-Agent": "ZendOApp" } }
        );
        setPredictions(await res.json());
      } catch { /* ignore */ } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const selectPlace = (item: any) => {
    setSelectedLocation({ address: item.display_name, lat: item.lat, lng: item.lon });
    setSearchQuery(item.display_name);
    setPredictions([]);
  };

  // ── GPS ───────────────────────────────────────────────────────────────────
  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      await useCurrentLocation();
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Could not get current location.");
    } finally {
      setLoading(false);
    }
  };

  // ── Pin on Map ────────────────────────────────────────────────────────────
  const handleOpenPinMap = () => {
    navigation.navigate("ConfirmPinMap", {
      initialLat: selectedLocation
        ? parseFloat(selectedLocation.lat)
        : contextLocation?.latitude,
      initialLng: selectedLocation
        ? parseFloat(selectedLocation.lng)
        : contextLocation?.longitude,
      onConfirm: (lat, lng, address) => {
        setSelectedLocation({ address, lat: String(lat), lng: String(lng) });
        setSearchQuery(address);
      },
    });
  };

  // ── Save address ──────────────────────────────────────────────────────────
  const handleApplyAddress = async () => {
    if (!selectedLocation || !label.trim()) return;
    setLoading(true);
    try {
      const lat = parseFloat(selectedLocation.lat);
      const lng = parseFloat(selectedLocation.lng);

      setManualLocation({
        latitude:  lat,
        longitude: lng,
        address:   selectedLocation.address,
        label:     label.trim(),
        isManual:  true,
      });

      if (user?.id) {
        await apiRequest("POST", "/api/addresses", {
          userId:      user.id,
          label:       label.trim(),
          fullAddress: selectedLocation.address,
          details:     details.trim() || null,
          latitude:    selectedLocation.lat,
          longitude:   selectedLocation.lng,
          isDefault:   true,
          accuracy:    contextAccuracy ?? null,
          zoomLevel:   getSmartZoom(lat, lng, GRABMAPS_CONFIG.confirmPinZoom),
        });
        refetchAddresses();
      }
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Could not save address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={28} color="#1e293b" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Delivery Address</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <View style={styles.content}>

          {/* ── SAVED ADDRESSES ── */}
          {savedAddresses.length > 0 && (
            <View style={styles.savedSection}>
              <ThemedText style={styles.savedSectionTitle}>Saved Places</ThemedText>
              
              {savedAddresses.map((addr) => {
                const meta = getLabelMeta(addr.label);
                const isActive = isManualLocation && currentAddressLabel === addr.label;
                const isDeleting = deletingId === addr.id;

                return (
                  <Pressable
                    key={addr.id}
                    style={[
                      styles.savedCard,
                      isActive && { borderColor: BRAND_PURPLE, backgroundColor: BRAND_PURPLE + "08" },
                    ]}
                    onPress={() => handleUseSavedAddress(addr)}
                  >
                    {/* Icon */}
                    <View style={[styles.savedIconCircle, { backgroundColor: meta.color + "18" }]}>
                      <Feather name={meta.icon as any} size={20} color={meta.color} />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ThemedText style={styles.savedLabel}>{addr.label}</ThemedText>
                        {addr.isDefault && (
                          <View style={styles.defaultBadge}>
                            <ThemedText style={styles.defaultBadgeText}>Default</ThemedText>
                          </View>
                        )}
                        {isActive && (
                          <View style={[styles.defaultBadge, { backgroundColor: BRAND_PURPLE + "20" }]}>
                            <ThemedText style={[styles.defaultBadgeText, { color: BRAND_PURPLE }]}>Active</ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={styles.savedAddress} numberOfLines={1}>
                        {addr.fullAddress}
                      </ThemedText>
                    </View>

                    {/* Actions */}
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {!addr.isDefault && (
                        <Pressable
                          onPress={() => handleSetDefault(addr)}
                          style={styles.actionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Feather name="star" size={14} color="#94a3b8" />
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => handleDeleteAddress(addr)}
                        style={styles.actionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        disabled={isDeleting}
                      >
                        {isDeleting
                          ? <ActivityIndicator size="small" color="#ef4444" />
                          : <Feather name="trash-2" size={14} color="#ef4444" />
                        }
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── DIVIDER ── */}
          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <ThemedText style={styles.orText}>
              {savedAddresses.length > 0 ? "ADD NEW" : "GET LOCATION"}
            </ThemedText>
            <View style={styles.line} />
          </View>

          {/* ── GPS ── */}
          <Pressable
            style={[
              styles.gpsCard,
              !isManualLocation && { borderColor: BRAND_PURPLE, backgroundColor: BRAND_PURPLE + "05" },
            ]}
            onPress={handleUseCurrentLocation}
            disabled={loading}
          >
            <View style={[styles.iconCircle, { backgroundColor: BRAND_PURPLE + "15" }]}>
              <MaterialCommunityIcons name="crosshairs-gps" size={24} color={BRAND_PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>Current GPS Location</ThemedText>
              <ThemedText style={styles.cardSub}>High-accuracy · BestForNavigation</ThemedText>
            </View>
            {!isManualLocation && <Feather name="check-circle" size={20} color={BRAND_PURPLE} />}
          </Pressable>

          {/* ── Pin on Map ── */}
          <Pressable style={styles.pinMapCard} onPress={handleOpenPinMap}>
            <View style={[styles.iconCircle, { backgroundColor: BRAND_MINT + "15" }]}>
              <MaterialCommunityIcons name="map-marker-radius" size={24} color={BRAND_MINT} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>Pin on Map</ThemedText>
              <ThemedText style={styles.cardSub}>Zoom 18+ · Drag to exact entrance</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color="#94a3b8" />
          </Pressable>

          {/* ── OR SEARCH ── */}
          <View style={[styles.dividerRow, { marginTop: 4 }]}>
            <View style={styles.line} />
            <ThemedText style={styles.orText}>OR SEARCH</ThemedText>
            <View style={styles.line} />
          </View>

          {/* ── Search ── */}
          <View style={styles.section}>
            <View style={styles.searchWrapper}>
              <Feather name="search" size={18} color="#94a3b8" style={{ marginRight: 12 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search area, street or landmark…"
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={searchOpenStreetMap}
              />
              {isSearching && <ActivityIndicator size="small" color={BRAND_PURPLE} />}
            </View>

            {predictions.length > 0 && (
              <View style={styles.predictionsBox}>
                {predictions.map((item, i) => (
                  <TouchableOpacity key={i} style={styles.predictionItem} onPress={() => selectPlace(item)}>
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

          {/* ── Form after selection ── */}
          {selectedLocation && (
            <View style={styles.formSection}>
              <View style={styles.selectedIndicator}>
                <View style={styles.mintDot} />
                <ThemedText style={styles.selectedAddressText} numberOfLines={2}>
                  {selectedLocation.address}
                </ThemedText>
                <TouchableOpacity onPress={handleOpenPinMap} style={styles.rePinBtn}>
                  <MaterialCommunityIcons name="map-marker-radius" size={18} color={BRAND_MINT} />
                </TouchableOpacity>
              </View>

              {/* Quick label chips */}
              <View>
                <ThemedText style={styles.fieldLabel}>Label This Place</ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
                >
                  {["Home", "Office", "Gym", "Mom's", "School", "Other"].map((chip) => {
                    const meta = getLabelMeta(chip);
                    const selected = label.toLowerCase() === chip.toLowerCase();
                    return (
                      <Pressable
                        key={chip}
                        onPress={() => setLabel(chip)}
                        style={[
                          styles.labelChip,
                          selected && { backgroundColor: meta.color, borderColor: meta.color },
                        ]}
                      >
                        <Feather
                          name={meta.icon as any}
                          size={13}
                          color={selected ? "white" : meta.color}
                        />
                        <ThemedText
                          style={[
                            styles.labelChipText,
                            { color: selected ? "white" : meta.color },
                          ]}
                        >
                          {chip}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <TextInput
                  style={styles.textInput}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="or type custom label…"
                  placeholderTextColor="#cbd5e1"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.fieldLabel}>Note for Driver (Optional)</ThemedText>
                <TextInput
                  style={[styles.textInput, styles.areaInput]}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  placeholder="Gate code, building color, floor number…"
                  placeholderTextColor="#cbd5e1"
                />
              </View>
            </View>
          )}

          {/* ── Current address preview ── */}
          {isManualLocation && manualAddress && !selectedLocation && (
            <View style={styles.activeCard}>
              <View style={[styles.iconCircle, { backgroundColor: BRAND_MINT + "15" }]}>
                <Feather name="map-pin" size={20} color={BRAND_MINT} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.cardTitle}>{currentAddressLabel || "Saved Address"}</ThemedText>
                <ThemedText style={styles.cardSub} numberOfLines={2}>{manualAddress}</ThemedText>
              </View>
              <MaterialCommunityIcons name="check-decagram" size={22} color={BRAND_MINT} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating confirm button */}
      {selectedLocation && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.submitBtn, (!label.trim() || loading) && styles.btnDisabled]}
            onPress={handleApplyAddress}
            disabled={loading || !label.trim()}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <ThemedText style={styles.submitBtnText}>Save & Use This Address</ThemedText>
            }
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#F8F9FE" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 15,
    backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  content:     { padding: 20 },
  iconCircle:  { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardTitle:   { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  cardSub:     { fontSize: 13, color: "#64748b", marginTop: 2 },

  // ── Saved addresses ──
  savedSection:      { marginBottom: 20 },
  savedSectionTitle: { fontSize: 12, fontWeight: "900", color: "#64748b", letterSpacing: 1, marginBottom: 12 },
  savedCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "white", borderRadius: 20, borderWidth: 1.5,
    borderColor: "#f1f5f9", padding: 14, marginBottom: 10, gap: 12,
  },
  savedIconCircle: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  savedLabel:   { fontSize: 15, fontWeight: "800", color: "#1e293b" },
  savedAddress: { fontSize: 12, color: "#64748b", marginTop: 2 },
  defaultBadge: {
    backgroundColor: "#f0fdf4", paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 6,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: "800", color: "#16a34a" },
  actionBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center",
  },

  // ── GPS / Pin cards ──
  gpsCard: {
    flexDirection: "row", alignItems: "center", padding: 16,
    backgroundColor: "white", borderRadius: 20, borderWidth: 1.5,
    borderColor: "#f1f5f9", gap: 15, marginBottom: 12,
  },
  pinMapCard: {
    flexDirection: "row", alignItems: "center", padding: 16,
    backgroundColor: "white", borderRadius: 20, borderWidth: 1.5,
    borderColor: BRAND_MINT + "40", gap: 15, marginBottom: 20,
  },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  line:       { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  orText:     { fontSize: 10, fontWeight: "800", color: "#94a3b8", letterSpacing: 1 },

  section: { marginBottom: 20 },
  searchWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "white", borderRadius: 18, paddingHorizontal: 16,
    height: 56, borderWidth: 1, borderColor: "#e2e8f0",
  },
  searchInput:    { flex: 1, fontSize: 15, color: "#1e293b", fontWeight: "500" },
  predictionsBox: {
    backgroundColor: "white", borderRadius: 18, marginTop: 8,
    borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden",
    elevation: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10,
  },
  predictionItem: {
    flexDirection: "row", alignItems: "center", padding: 15,
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  pinCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  predictionText: { flex: 1, fontSize: 14, color: "#334155", lineHeight: 20 },

  formSection: { gap: 16 },
  selectedIndicator: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: BRAND_MINT + "10", padding: 15, borderRadius: 16,
    gap: 12, borderWidth: 1, borderColor: BRAND_MINT + "20",
  },
  mintDot:             { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND_MINT },
  selectedAddressText: { flex: 1, fontSize: 13, color: "#065f46", fontWeight: "600" },
  rePinBtn:            { padding: 6, backgroundColor: BRAND_MINT + "15", borderRadius: 10 },

  // ── Label chips ──
  labelChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: "#e2e8f0",
    backgroundColor: "white",
  },
  labelChipText: { fontSize: 13, fontWeight: "700" },

  inputGroup:  { gap: 8 },
  fieldLabel:  { fontSize: 12, fontWeight: "800", color: "#64748b", marginLeft: 4 },
  textInput: {
    backgroundColor: "white", borderRadius: 15, padding: 16,
    fontSize: 15, borderWidth: 1, borderColor: "#e2e8f0", color: "#1e293b",
  },
  areaInput: { height: 100, textAlignVertical: "top" },

  activeCard: {
    flexDirection: "row", alignItems: "center", padding: 16,
    backgroundColor: "white", borderRadius: 20, borderWidth: 1.5,
    borderColor: BRAND_MINT + "20", gap: 15,
  },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "white", padding: 20,
    borderTopWidth: 1, borderTopColor: "#f1f5f9",
  },
  submitBtn: {
    backgroundColor: BRAND_PURPLE, height: 56, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    elevation: 4, shadowColor: BRAND_PURPLE,
    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  btnDisabled:   { backgroundColor: "#cbd5e1", shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: "white", fontSize: 16, fontWeight: "800" },
});