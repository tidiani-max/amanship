import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  TextInput,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import * as ImagePicker from 'expo-image-picker';
import { getImageUrl } from "@/lib/image-url";
import { StaffEarningsDashboard } from "@/components/StaffEarningsDashboard";

// ===================== TYPES =====================
interface StaffMember {
  id: string;
  userId: string;
  role: "picker" | "driver";
  status: "online" | "offline";
  user: { id: string; username: string; phone: string | null; email: string | null; name: string | null } | null;
  stats?: {
    totalOrders: number;
    delivered: number;
    active: number;
  };
}

interface StoreOwner {
  id: string;
  userId: string;
  storeId: string;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    username: string;
  } | null;
}

interface StoreData {
  id: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
  codAllowed: boolean;
  staff: StaffMember[];
  owner?: StoreOwner | null; // ✅ ADD THIS
  totalRevenue: number;
  todayRevenue: number;
  todayOrders: number;
  monthRevenue: number;
  monthOrders: number;
  avgOrderValue: number;
  completionRate: number;
  codCollected: number;
  codPending: number;
  orderCount: number;
  deliveredOrders: number;
  cancelledOrders: number;
}
interface StoreOwner {
  id: string;
  userId: string;
  storeId: string;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    username: string;
  } | null;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: string;
  discountValue: number | null;
  minOrder: number;
  validFrom: string;
  validUntil: string;
  storeId: string | null;
  scope: string;
  isActive: boolean;
  usedCount: number;
  showInBanner: boolean;
  storeName?: string;
  creatorName?: string;
  image?: string | null;
  bannerImage?: string | null;
}

interface AdminMetrics {
  stores: StoreData[];
  globalTotals: {
    totalRevenue: number;
    todayRevenue: number;
    monthRevenue: number;
    avgOrderValue: number;
    codCollected: number;
    codPending: number;
  };
  orderSummary: {
    total: number;
    pending: number;
    confirmed: number;
    picking: number;
    packed: number;
    delivering: number;
    delivered: number;
    cancelled: number;
  };
  timestamp: string;
}

// ===================== HELPERS =====================
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: onConfirm }
    ]);
  }
};

// ===================== STYLES =====================
const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  
  // Sidebar
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    paddingTop: Spacing.xl,
  },
  sidebarLogo: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  sidebarNav: {
    paddingHorizontal: Spacing.md,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  navItemActive: {
    backgroundColor: '#10b981',
  },
  navIcon: {
    width: 40,
    alignItems: 'center',
  },
  
  // Main content
  mainContent: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  
  // Stats Grid
  statsGrid: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: 240,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    letterSpacing: -1,
  },
  statSubtext: {
    fontSize: 14,
  },
  
  // Tabs
  tabContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    borderBottomWidth: 1,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  tab: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: '#10b981',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Content sections
  contentSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  
  // Store cards - Desktop optimized
  storesGrid: {
    gap: Spacing.lg,
  },
  storeCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  storeAddress: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  storeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    alignSelf: 'flex-start',
  },
  storeActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  
  // Metrics row
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  metricBox: {
    flex: 1,
    minWidth: 180,
  },
  metricBoxLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  metricBoxValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricBoxSub: {
    fontSize: 13,
  },
  
  // Staff section
  staffSection: {
    marginTop: Spacing.lg,
  },
  staffGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  staffCard: {
    flex: 1,
    minWidth: 280,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  staffRole: {
    fontSize: 13,
    marginBottom: 4,
  },
  staffStats: {
    fontSize: 12,
  },
  staffActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  
  // Promotions grid
  promotionsGrid: {
    gap: Spacing.lg,
  },
  promotionCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  promotionImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  promotionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  promotionDesc: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  promotionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  promotionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  
  // Buttons
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: '#10b981',
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  
  // Form
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Image picker
  imagePicker: {
    height: 200,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  
  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Empty state
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 400,
  },
  // Add this to your styles object at the bottom of AdminDashboardScreen.tsx
infoBox: {
  padding: Spacing.lg,
  borderRadius: BorderRadius.md,
  borderWidth: 1,
},
});

// ===================== MODALS =====================
interface StoreWithOwnerModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}


const StoreWithOwnerModal: React.FC<StoreWithOwnerModalProps> = ({ visible, onClose, onSubmit, isLoading }) => {
  const { theme } = useTheme();
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeLatitude, setStoreLatitude] = useState("-6.2088");
  const [storeLongitude, setStoreLongitude] = useState("106.8456");
  const [codAllowed, setCodAllowed] = useState(true);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  if (!visible) return null;

  const handleGeocode = async () => {
    if (!storeAddress.trim()) {
      Alert.alert("Error", "Please enter an address first");
      return;
    }

    setGeocoding(true);
    try {
      const response = await apiRequest("POST", "/api/admin/geocode", { address: storeAddress });
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        setStoreLatitude(String(data.latitude));
        setStoreLongitude(String(data.longitude));
        
        if (data.isDefault) {
          Alert.alert(
            "Using Default Location", 
            data.displayName + "\n\nYou can manually adjust the coordinates if needed."
          );
        } else {
          Alert.alert("Success", `Location found:\n${data.displayName || "Address geocoded"}`);
        }
      }
    } catch (error) {
      console.error("Geocode error:", error);
      Alert.alert(
        "Geocoding Unavailable", 
        "Using default Jakarta coordinates. You can manually adjust them if needed."
      );
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = () => {
    if (!storeName.trim() || !storeAddress.trim()) {
      Alert.alert("Error", "Store name and address are required");
      return;
    }

    if (!ownerName.trim() || !ownerPhone.trim()) {
      Alert.alert("Error", "Owner name and phone are required");
      return;
    }

    // Generate temporary password
    const tempPassword = `owner${Math.random().toString(36).slice(-6)}`;

    onSubmit({
      storeName: storeName.trim(),
      storeAddress: storeAddress.trim(),
      storeLatitude: parseFloat(storeLatitude) || -6.2088,
      storeLongitude: parseFloat(storeLongitude) || 106.8456,
      codAllowed,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerEmail: ownerEmail.trim() || null,
      tempPassword,
    });
  };

  return (
    <View style={styles.modalOverlay}>
      <Card style={StyleSheet.flatten([styles.modalContent, { backgroundColor: theme.backgroundDefault }])}>
        <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <ThemedText style={styles.modalTitle}>Add Store + Owner</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          {/* STORE INFORMATION */}
          <ThemedText style={{ fontSize: 16, fontWeight: '700', marginBottom: Spacing.md }}>
            Store Information
          </ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Store Name *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="e.g. ZendO North Jakarta"
              placeholderTextColor={theme.textSecondary}
              value={storeName}
              onChangeText={setStoreName}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Address *</ThemedText>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="Full store address"
              placeholderTextColor={theme.textSecondary}
              value={storeAddress}
              onChangeText={setStoreAddress}
              multiline
            />
          </View>
          {/* Inside store card, after store name/address */}
{/* ✅ FIXED: Store Owner Display */}



          <Pressable 
            style={[styles.button, styles.buttonSecondary, { borderColor: theme.secondary, marginBottom: Spacing.lg }]}
            onPress={handleGeocode}
            disabled={geocoding}
          >
            {geocoding ? (
              <ActivityIndicator size="small" color={theme.secondary} />
            ) : (
              <>
                <Feather name="map-pin" size={16} color={theme.secondary} />
                <ThemedText style={[styles.buttonText, { color: theme.secondary }]}>Auto-Find Location</ThemedText>
              </>
            )}
          </Pressable>

          {/* OWNER INFORMATION */}
          <ThemedText style={{ fontSize: 16, fontWeight: '700', marginBottom: Spacing.md, marginTop: Spacing.lg }}>
            Owner Information
          </ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Owner Name *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="Full name"
              placeholderTextColor={theme.textSecondary}
              value={ownerName}
              onChangeText={setOwnerName}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Phone Number *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="+62 812 3456 7890"
              placeholderTextColor={theme.textSecondary}
              value={ownerPhone}
              onChangeText={setOwnerPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Email (Optional)</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="owner@example.com"
              placeholderTextColor={theme.textSecondary}
              value={ownerEmail}
              onChangeText={setOwnerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.infoBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30', marginBottom: Spacing.lg }]}>
            <Feather name="info" size={16} color={theme.primary} />
            <ThemedText style={{ flex: 1, marginLeft: Spacing.sm, fontSize: 13, color: theme.text }}>
              A temporary password will be generated. The owner will be required to reset it on first login.
            </ThemedText>
          </View>

          <Pressable
            style={[styles.button, styles.buttonPrimary, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={[styles.buttonText, { color: '#fff' }]}>
                Create Store + Owner
              </ThemedText>
            )}
          </Pressable>
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
};

interface StoreModalProps {
  visible: boolean;
  store: StoreData | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete?: () => void;
  isLoading: boolean;
}

const StoreModal: React.FC<StoreModalProps> = ({ visible, store, onClose, onSubmit, onDelete, isLoading }) => {
  const { theme } = useTheme();
  const [name, setName] = useState(store?.name || "");
  const [address, setAddress] = useState(store?.address || "");
  const [latitude, setLatitude] = useState(store?.latitude || "-6.2088");
  const [longitude, setLongitude] = useState(store?.longitude || "106.8456");
  const [codAllowed, setCodAllowed] = useState(store?.codAllowed ?? true);
  const [geocoding, setGeocoding] = useState(false);
  const [showStoreOwnerModal, setShowStoreOwnerModal] = useState(false);


  React.useEffect(() => {
    if (store) {
      setName(store.name);
      setAddress(store.address);
      setLatitude(store.latitude);
      setLongitude(store.longitude);
      setCodAllowed(store.codAllowed);
    }
  }, [store]);

  if (!visible) return null;

  const handleGeocode = async () => {
    if (!address.trim()) {
      Alert.alert("Error", "Please enter an address first");
      return;
    }

    setGeocoding(true);
    try {
      const response = await apiRequest("POST", "/api/admin/geocode", { address });
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        setLatitude(String(data.latitude));
        setLongitude(String(data.longitude));
        
        if (data.isDefault) {
          Alert.alert(
            "Using Default Location", 
            data.displayName + "\n\nYou can manually adjust the coordinates if needed."
          );
        } else {
          Alert.alert("Success", `Location found:\n${data.displayName || "Address geocoded"}`);
        }
      }
    } catch (error) {
      console.error("Geocode error:", error);
      setLatitude("-6.2088");
      setLongitude("106.8456");
      Alert.alert(
        "Geocoding Unavailable", 
        "Using default Jakarta coordinates. You can manually adjust them if needed."
      );
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert("Error", "Store name and address are required");
      return;
    }

    onSubmit({
      name: name.trim(),
      address: address.trim(),
      latitude: parseFloat(latitude) || -6.2088,
      longitude: parseFloat(longitude) || 106.8456,
      codAllowed,
    });
  };

  return (
    <View style={[styles.modalOverlay]}>
         <Card style={StyleSheet.flatten([styles.modalContent, { backgroundColor: theme.backgroundDefault }])}>
        <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <ThemedText style={styles.modalTitle}>{store ? "Edit Store" : "Add New Store"}</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Store Name *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="e.g. ZendO Central Jakarta"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Address *</ThemedText>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="Full store address"
              placeholderTextColor={theme.textSecondary}
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>

          <Pressable 
            style={[styles.button, styles.buttonSecondary, { borderColor: theme.secondary, marginBottom: Spacing.lg }]}
            onPress={handleGeocode}
            disabled={geocoding}
          >
            {geocoding ? (
              <ActivityIndicator size="small" color={theme.secondary} />
            ) : (
              <>
                <Feather name="map-pin" size={16} color={theme.secondary} />
                <ThemedText style={[styles.buttonText, { color: theme.secondary }]}>Auto-Find Location</ThemedText>
              </>
            )}
          </Pressable>

          <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg }}>
            <View style={[styles.formGroup, { flex: 1, marginBottom: 0 }]}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Latitude</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
                placeholder="Latitude"
                placeholderTextColor={theme.textSecondary}
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginBottom: 0 }]}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Longitude</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
                placeholder="Longitude"
                placeholderTextColor={theme.textSecondary}
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Pressable 
            style={[styles.statusBadge, { backgroundColor: codAllowed ? theme.success + '20' : theme.border, marginBottom: Spacing.xl }]}
            onPress={() => setCodAllowed(!codAllowed)}
          >
            <View style={[styles.statusDot, { backgroundColor: codAllowed ? theme.success : theme.textSecondary }]} />
            <ThemedText style={{ color: codAllowed ? theme.success : theme.textSecondary }}>
              Allow Cash on Delivery
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonPrimary, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={[styles.buttonText, { color: '#fff' }]}>
                {store ? "Update Store" : "Create Store"}
              </ThemedText>
            )}
          </Pressable>

          {store && onDelete && (
            <Pressable
              style={[styles.button, styles.buttonSecondary, { borderColor: theme.error, marginTop: Spacing.md }]}
              onPress={onDelete}
            >
              <ThemedText style={[styles.buttonText, { color: theme.error }]}>Delete Store</ThemedText>
            </Pressable>
          )}
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
};

interface StaffModalProps {
  visible: boolean;
  storeId: string;
  storeName: string;
  staff: StaffMember | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete?: () => void;
  isLoading: boolean;
}

const StaffModal: React.FC<StaffModalProps> = ({ visible, storeId, storeName, staff, onClose, onSubmit, onDelete, isLoading }) => {
  const { theme } = useTheme();
  const [phone, setPhone] = useState(staff?.user?.phone || "");
  const [email, setEmail] = useState(staff?.user?.email || "");
  const [name, setName] = useState(staff?.user?.name || "");
  const [role, setRole] = useState<"picker" | "driver">(staff?.role || "picker");
  const [activeTab, setActiveTab] = useState<'overview' | 'stores' | 'promotions' | 'financials'>('overview');

  React.useEffect(() => {
    if (staff) {
      setPhone(staff.user?.phone || "");
      setEmail(staff.user?.email || "");
      setName(staff.user?.name || "");
      setRole(staff.role);
    }
  }, [staff]);

  if (!visible) return null;

  const handleSubmit = () => {
    if (!phone.trim() && !email.trim()) {
      Alert.alert("Error", "Please provide either phone number or email");
      return;
    }

    onSubmit({
      storeId,
      phone: phone.trim(),
      email: email.trim(),
      name: name.trim(),
      role,
    });
  };

  return (
    <View style={styles.modalOverlay}>
         <Card style={StyleSheet.flatten([styles.modalContent, { backgroundColor: theme.backgroundDefault }])}>
        <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View>
              <ThemedText style={styles.modalTitle}>{staff ? "Edit Staff" : "Add Staff"}</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, marginTop: 4 }}>{storeName}</ThemedText>
            </View>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Name</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="Staff member name"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Phone Number</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="+62 812 3456 7890"
              placeholderTextColor={theme.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!staff}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Email Address</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="staff@example.com"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!staff}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Role *</ThemedText>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <Pressable
                style={[
                  styles.button,
                  { flex: 1, justifyContent: 'center' },
                  role === "picker" ? styles.buttonPrimary : styles.buttonSecondary,
                  role === "picker" ? {} : { borderColor: theme.border }
                ]}
                onPress={() => setRole("picker")}
              >
                <Feather name="package" size={18} color={role === "picker" ? "#fff" : theme.text} />
                <ThemedText style={[styles.buttonText, { color: role === "picker" ? "#fff" : theme.text }]}>
                  Picker
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  { flex: 1, justifyContent: 'center' },
                  role === "driver" ? styles.buttonPrimary : styles.buttonSecondary,
                  role === "driver" ? {} : { borderColor: theme.border }
                ]}
                onPress={() => setRole("driver")}
              >
                <Feather name="truck" size={18} color={role === "driver" ? "#fff" : theme.text} />
                <ThemedText style={[styles.buttonText, { color: role === "driver" ? "#fff" : theme.text }]}>
                  Driver
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.button, styles.buttonPrimary, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={[styles.buttonText, { color: '#fff' }]}>
                {staff ? "Update Staff" : "Add Staff Member"}
              </ThemedText>
            )}
          </Pressable>

          {staff && onDelete && (
            <Pressable
              style={[styles.button, styles.buttonSecondary, { borderColor: theme.error, marginTop: Spacing.md }]}
              onPress={onDelete}
            >
              <ThemedText style={[styles.buttonText, { color: theme.error }]}>Remove from Store</ThemedText>
            </Pressable>
          )}
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
};

interface PromotionModalProps {
  visible: boolean;
  promotion: Promotion | null;
  stores: StoreData[];
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  onDelete?: () => void;
  isLoading: boolean;
}

const PromotionModal: React.FC<PromotionModalProps> = ({ 
  visible, 
  promotion, 
  stores, 
  onClose, 
  onSubmit, 
  onDelete, 
  isLoading 
}) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState(promotion?.title || "");
  const [description, setDescription] = useState(promotion?.description || "");
  const [type, setType] = useState<string>(promotion?.type || "percentage");
  const [discountValue, setDiscountValue] = useState(promotion?.discountValue?.toString() || "");
  const [minOrder, setMinOrder] = useState(promotion?.minOrder?.toString() || "0");
  const [validUntil, setValidUntil] = useState(
    promotion ? new Date(promotion.validUntil).toISOString().split('T')[0] : 
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [scope, setScope] = useState<string>(promotion?.scope || "app");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [showInBanner, setShowInBanner] = useState(promotion?.showInBanner || false);
  const [image, setImage] = useState<string | null>(promotion?.image || promotion?.bannerImage || null);
  const [imageChanged, setImageChanged] = useState(false);

  React.useEffect(() => {
    if (promotion) {
      setTitle(promotion.title);
      setDescription(promotion.description);
      setType(promotion.type);
      setDiscountValue(promotion.discountValue?.toString() || "");
      setMinOrder(promotion.minOrder?.toString() || "0");
      setValidUntil(new Date(promotion.validUntil).toISOString().split('T')[0]);
      setScope(promotion.scope);
      setShowInBanner(promotion.showInBanner);
      setImage(promotion.image || promotion.bannerImage || null);
      setImageChanged(false);
    } else {
      setTitle("");
      setDescription("");
      setType("percentage");
      setDiscountValue("");
      setMinOrder("0");
      setValidUntil(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setScope("app");
      setSelectedStores([]);
      setShowInBanner(false);
      setImage(null);
      setImageChanged(false);
    }
  }, [promotion]);

  if (!visible) return null;

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      setImageChanged(true);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Title and description are required");
      return;
    }

    if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
      Alert.alert("Error", "Please enter a valid discount value");
      return;
    }

    const formData = new FormData();
    formData.append('userId', 'demo-user');
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('type', type);
    formData.append('discountValue', discountValue);
    formData.append('minOrder', minOrder || '0');
    formData.append('validUntil', new Date(validUntil).toISOString());
    formData.append('scope', scope);
    formData.append('showInBanner', showInBanner.toString());

    if (scope === "store" && selectedStores.length > 0) {
      formData.append('applicableStoreIds', JSON.stringify(selectedStores));
    }

    if (image && imageChanged) {
      const isNewImage = image.startsWith('file://') || image.startsWith('blob:');
      
      if (isNewImage) {
        try {
          if (image.startsWith('blob:')) {
            const response = await fetch(image);
            const blob = await response.blob();
            const filename = `promo-${Date.now()}.jpg`;
            const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
            formData.append("image", file as any);
          } else {
            const filename = image.split('/').pop() || 'promo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const fileType = match ? `image/${match[1]}` : 'image/jpeg';
            formData.append("image", {
              uri: image,
              name: filename,
              type: fileType,
            } as any);
          }
        } catch (error) {
          console.error("Image processing error:", error);
          Alert.alert("Error", "Failed to process image");
          return;
        }
      }
    }

    onSubmit(formData);
  };

  return (
    <View style={styles.modalOverlay}>
        <Card style={StyleSheet.flatten([styles.modalContent, { backgroundColor: theme.backgroundDefault }])}>
    
        <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <ThemedText style={styles.modalTitle}>{promotion ? "Edit Promotion" : "Create Promotion"}</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Banner Image (16:9)</ThemedText>
            <Pressable 
              style={[styles.imagePicker, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}
              onPress={pickImage}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.uploadedImage} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Feather name="image" size={40} color={theme.textSecondary} />
                  <ThemedText style={{ marginTop: 8, color: theme.textSecondary }}>
                    Tap to add banner image
                  </ThemedText>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Title *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="e.g., Weekend Special 20% Off"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Description *</ThemedText>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="Describe the promotion..."
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Scope *</ThemedText>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <Pressable
                style={[
                  styles.button,
                  { flex: 1, justifyContent: 'center' },
                  scope === "app" ? styles.buttonPrimary : styles.buttonSecondary,
                  scope === "app" ? {} : { borderColor: theme.border }
                ]}
                onPress={() => setScope("app")}
              >
                <ThemedText style={[styles.buttonText, { color: scope === "app" ? "#fff" : theme.text }]}>
                  App-Wide
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  { flex: 1, justifyContent: 'center' },
                  scope === "store" ? styles.buttonPrimary : styles.buttonSecondary,
                  scope === "store" ? {} : { borderColor: theme.border }
                ]}
                onPress={() => setScope("store")}
              >
                <ThemedText style={[styles.buttonText, { color: scope === "store" ? "#fff" : theme.text }]}>
                  Specific Stores
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Type *</ThemedText>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <Pressable
                style={[
                  styles.button,
                  { flex: 1, justifyContent: 'center' },
                  type === "percentage" ? styles.buttonPrimary : styles.buttonSecondary,
                  type === "percentage" ? {} : { borderColor: theme.border }
                ]}
                onPress={() => setType("percentage")}
              >
                <Feather name="percent" size={16} color={type === "percentage" ? "#fff" : theme.text} />
                <ThemedText style={[styles.buttonText, { color: type === "percentage" ? "#fff" : theme.text }]}>
                  Percentage
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  { flex: 1, justifyContent: 'center' },
                  type === "fixed_amount" ? styles.buttonPrimary : styles.buttonSecondary,
                  type === "fixed_amount" ? {} : { borderColor: theme.border }
                ]}
                onPress={() => setType("fixed_amount")}
              >
                <Feather name="dollar-sign" size={16} color={type === "fixed_amount" ? "#fff" : theme.text} />
                <ThemedText style={[styles.buttonText, { color: type === "fixed_amount" ? "#fff" : theme.text }]}>
                  Fixed
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg }}>
            <View style={[styles.formGroup, { flex: 1, marginBottom: 0 }]}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                Discount {type === "percentage" ? "(%)" : "(Rp)"} *
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
                placeholder={type === "percentage" ? "20" : "50000"}
                placeholderTextColor={theme.textSecondary}
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginBottom: 0 }]}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Min Order (Rp)</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
                placeholder="100000"
                placeholderTextColor={theme.textSecondary}
                value={minOrder}
                onChangeText={setMinOrder}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Valid Until *</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundTertiary }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary}
              value={validUntil}
              onChangeText={setValidUntil}
            />
          </View>

          <Pressable 
            style={[styles.statusBadge, { backgroundColor: showInBanner ? theme.success + '20' : theme.border, marginBottom: Spacing.xl }]}
            onPress={() => setShowInBanner(!showInBanner)}
          >
            <View style={[styles.statusDot, { backgroundColor: showInBanner ? theme.success : theme.textSecondary }]} />
            <ThemedText style={{ color: showInBanner ? theme.success : theme.textSecondary }}>
              Show in home banner
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonPrimary, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={[styles.buttonText, { color: '#fff' }]}>
                {promotion ? "Update Promotion" : "Create Promotion"}
              </ThemedText>
            )}
          </Pressable>

          {promotion && onDelete && (
            <Pressable
              style={[styles.button, styles.buttonSecondary, { borderColor: theme.error, marginTop: Spacing.md }]}
              onPress={onDelete}
            >
              <ThemedText style={[styles.buttonText, { color: theme.error }]}>Delete Promotion</ThemedText>
            </Pressable>
          )}
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
};

// ===================== MAIN COMPONENT =====================
export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'stores' | 'promotions' | 'financials'>('overview');
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showStoreOwnerModal, setShowStoreOwnerModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [currentStoreId, setCurrentStoreId] = useState("");

  const { data: metrics, isLoading, refetch, isRefetching } = useQuery<AdminMetrics>({
    queryKey: ["/api/admin/metrics"],
    refetchInterval: 30000,
  });

  const { data: promotions = [], refetch: refetchPromotions } = useQuery({
    queryKey: ["/api/admin/promotions"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/admin/promotions?userId=demo-user`);
        if (!response.ok) {
          const text = await response.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.error || "Failed to fetch promotions");
          } catch (e) {
            throw new Error(`HTTP ${response.status}: ${text || "Failed to fetch promotions"}`);
          }
        }
        const text = await response.text();
        return JSON.parse(text);
      } catch (error) {
        console.error("❌ Fetch promotions error:", error);
        return [];
      }
    },
    retry: 1,
    retryDelay: 1000,
  });
const { data: financialMetrics } = useQuery({
  queryKey: ["/api/admin/financials/comprehensive", activeTab === 'financials' ? 'month' : null],
  queryFn: async () => {
    if (activeTab !== 'financials') return null;
    
    const response = await apiRequest("GET", 
      `/api/admin/financials/comprehensive?userId=demo-user&period=month`
    );
    return response.json();
  },
  enabled: activeTab === 'financials',
  refetchInterval: activeTab === 'financials' ? 60000 : false,
});
  // ===================== MUTATIONS =====================
  const createStoreMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/stores", data);
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      setShowStoreModal(false);
      setSelectedStore(null);
      Alert.alert("Success", "Store created");
    },
    onError: (error: Error) => Alert.alert("Error", error.message),
  });

const createStoreWithOwnerMutation = useMutation({
  mutationFn: async (data: any) => {
    const response = await apiRequest("POST", "/api/admin/stores-with-owner", {
      userId: "demo-user",
      ...data
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
    setShowStoreOwnerModal(false);
    Alert.alert(
      "Success!", 
      `Store and owner created!\n\n${data.message}\n\nThe owner can now login with their phone number.`
    );
  },
  onError: (error: Error) => Alert.alert("Error", error.message),
});
  const updateStoreMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/stores/${id}`, data);
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      setShowStoreModal(false);
      setSelectedStore(null);
      Alert.alert("Success", "Store updated");
    },
    onError: (error: Error) => Alert.alert("Error", error.message),
  });

  const deleteStoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/stores/${id}`);
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      setShowStoreModal(false);
      setSelectedStore(null);
      Alert.alert("Success", "Store deleted");
    },
    onError: (error: Error) => Alert.alert("Error", error.message),
  });

  const addStaffMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/admin/stores/${data.storeId}/staff`, data);
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      setShowStaffModal(false);
      setSelectedStaff(null);
      Alert.alert("Success", "Staff added");
    },
    onError: (error: Error) => Alert.alert("Error", error.message),
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ storeId, staffId, data }: any) => {
      const response = await apiRequest("PATCH", `/api/admin/stores/${storeId}/staff/${staffId}`, data);
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      setShowStaffModal(false);
      setSelectedStaff(null);
      Alert.alert("Success", "Staff updated");
    },
    onError: (error: Error) => Alert.alert("Error", error.message),
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async ({ storeId, staffId }: { storeId: string; staffId: string }) => {
      const response = await apiRequest("DELETE", `/api/admin/stores/${storeId}/staff/${staffId}`);
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      Alert.alert("Success", "Staff removed");
    },
    onError: (error: Error) => Alert.alert("Error", error.message),
  });

  const toggleStaffStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const response = await apiRequest("PATCH", "/api/staff/status", { userId, status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
    },
  });

  const createPromotionMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_DOMAIN}/api/admin/promotions`, 
          {
            method: 'POST',
            body: formData,
          }
        );
        
        const text = await response.text();
        
        if (!response.ok) {
          let errorMsg = "Failed to create promotion";
          try {
            const errorData = JSON.parse(text);
            errorMsg = errorData.error || errorData.details || errorMsg;
          } catch (e) {
            errorMsg = text || errorMsg;
          }
          throw new Error(errorMsg);
        }
        
        return JSON.parse(text);
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      refetchPromotions();
      setShowPromotionModal(false);
      setSelectedPromotion(null);
      Alert.alert("Success", "Promotion created successfully!");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to create promotion");
    },
  });

  const updatePromotionMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/admin/promotions/${id}`, {
        method: 'PATCH',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update promotion');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      refetchPromotions();
      setShowPromotionModal(false);
      setSelectedPromotion(null);
      Alert.alert("Success", "Promotion updated successfully!");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const deletePromotionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/admin/promotions/${id}?userId=demo-user`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete promotion');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      refetchPromotions();
      Alert.alert("Success", "Promotion deleted successfully!");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const togglePromotionActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/promotions/${id}`, { userId: "demo-user", isActive });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      refetchPromotions();
    },
    onError: (error: Error) => Alert.alert("Error", error.message),
  });

  // ===================== HANDLERS =====================
  const handleStoreSubmit = (data: any) => {
    if (selectedStore) {
      updateStoreMutation.mutate({ id: selectedStore.id, data });
    } else {
      createStoreMutation.mutate(data);
    }
  };

  const handleStoreDelete = (storeToDelete: StoreData) => {
    confirmAction(
      "Delete Store",
      `Delete ${storeToDelete.name}?`,
      () => deleteStoreMutation.mutate(storeToDelete.id)
    );
  };

  const handleStaffSubmit = (data: any) => {
    if (selectedStaff) {
      updateStaffMutation.mutate({
        storeId: currentStoreId,
        staffId: selectedStaff.id,
        data: { role: data.role }
      });
    } else {
      addStaffMutation.mutate(data);
    }
  };

  const handleStaffDelete = (storeId: string, staffId: string, staffName?: string) => {
    confirmAction(
      "Remove Staff",
      `Remove ${staffName || "this staff member"}?`,
      () => deleteStaffMutation.mutate({ storeId, staffId })
    );
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "online" ? "offline" : "online";
    toggleStaffStatusMutation.mutate({ userId, status: nextStatus });
  };

  const handlePromotionSubmit = (formData: FormData) => {
    if (selectedPromotion) {
      updatePromotionMutation.mutate({ id: selectedPromotion.id, formData });
    } else {
      createPromotionMutation.mutate(formData);
    }
  };

  const handlePromotionDelete = (promo: Promotion) => {
    confirmAction(
      "Delete Promotion",
      `Delete "${promo.title}"?`,
      () => deletePromotionMutation.mutate(promo.id)
    );
  };

const handleStoreOwnerSubmit = (data: any) => {
  createStoreWithOwnerMutation.mutate(data);
};

  const handleTogglePromotionActive = (id: string, isActive: boolean) => {
    togglePromotionActiveMutation.mutate({ id, isActive });
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
          {t.common.loading}
        </ThemedText>
      </ThemedView>
    );
  }

  const orderSummary = metrics?.orderSummary;
  const globalTotals = metrics?.globalTotals;
  const stores = metrics?.stores || [];
  const isSubmitting = createStoreMutation.isPending || updateStoreMutation.isPending || 
                      addStaffMutation.isPending || updateStaffMutation.isPending ||
                      createPromotionMutation.isPending || updatePromotionMutation.isPending;

  return (
    <ThemedView style={styles.container}>
      <View style={{ flexDirection: 'row', flex: 1 }}>
        {/* SIDEBAR */}
        <View style={[styles.sidebar, { backgroundColor: theme.backgroundSecondary, borderRightColor: theme.border }]}>
          <View style={[styles.sidebarLogo, { borderBottomColor: theme.border }]}>
            <ThemedText style={{ fontSize: 24, fontWeight: '700' }}>ZendO</ThemedText>
            <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>Admin Dashboard</ThemedText>
          </View>
          
          <View style={styles.sidebarNav}>
            <Pressable 
              style={[styles.navItem, activeTab === 'overview' && styles.navItemActive]}
              onPress={() => setActiveTab('overview')}
            >
              <View style={styles.navIcon}>
                <Feather name="bar-chart-2" size={20} color={activeTab === 'overview' ? '#fff' : theme.text} />
              </View>
              <ThemedText style={{ color: activeTab === 'overview' ? '#fff' : theme.text, fontWeight: '600' }}>
                Overview
              </ThemedText>
            </Pressable>
            
            <Pressable 
              style={[styles.navItem, activeTab === 'stores' && styles.navItemActive]}
              onPress={() => setActiveTab('stores')}
            >
              <View style={styles.navIcon}>
                <Feather name="home" size={20} color={activeTab === 'stores' ? '#fff' : theme.text} />
              </View>
              <ThemedText style={{ color: activeTab === 'stores' ? '#fff' : theme.text, fontWeight: '600' }}>
                Stores & Staff
              </ThemedText>
            </Pressable>
            
            <Pressable 
              style={[styles.navItem, activeTab === 'promotions' && styles.navItemActive]}
              onPress={() => setActiveTab('promotions')}
            >
              <View style={styles.navIcon}>
                <Feather name="gift" size={20} color={activeTab === 'promotions' ? '#fff' : theme.text} />
              </View>
              <ThemedText style={{ color: activeTab === 'promotions' ? '#fff' : theme.text, fontWeight: '600' }}>
                Promotions
              </ThemedText>
            </Pressable>
            <Pressable 
  style={[styles.navItem, activeTab === 'financials' && styles.navItemActive]}
  onPress={() => setActiveTab('financials')}
>
  <View style={styles.navIcon}>
    <Feather name="dollar-sign" size={20} color={activeTab === 'financials' ? '#fff' : theme.text} />
  </View>
  <ThemedText style={{ color: activeTab === 'financials' ? '#fff' : theme.text, fontWeight: '600' }}>
    Financials
  </ThemedText>
</Pressable>
          </View>
        </View>

        {/* MAIN CONTENT */}
        <View style={styles.mainContent}>
          {/* HEADER */}
          <View style={[styles.header, { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border }]}>
            <ThemedText style={styles.headerTitle}>
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'stores' && 'Stores & Staff'}
              {activeTab === 'promotions' && 'Promotions'}
              {activeTab === 'financials' && 'Financial Dashboard'} 
            </ThemedText>
            <View style={styles.headerActions}>
              {activeTab === 'stores' && (
  <>
    <Pressable 
      style={[styles.button, styles.buttonPrimary]}
      onPress={() => {
        setSelectedStore(null);
        setShowStoreOwnerModal(true);
      }}
    >
      <Feather name="plus" size={16} color="#fff" />
      <ThemedText style={[styles.buttonText, { color: '#fff' }]}>Add Store + Owner</ThemedText>
    </Pressable>
    <Pressable 
      style={[styles.button, styles.buttonSecondary, { borderColor: theme.border, marginLeft: Spacing.sm }]}
      onPress={() => {
        setSelectedStore(null);
        setShowStoreModal(true);
      }}
    >
      <Feather name="home" size={16} color={theme.text} />
      <ThemedText style={[styles.buttonText, { color: theme.text }]}>Add Store Only</ThemedText>
    </Pressable>
  </>
)}
              {activeTab === 'promotions' && (
                <Pressable 
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={() => {
                    setSelectedPromotion(null);
                    setShowPromotionModal(true);
                  }}
                >
                  <Feather name="plus" size={16} color="#fff" />
                  <ThemedText style={[styles.buttonText, { color: '#fff' }]}>Add Promotion</ThemedText>
                </Pressable>
              )}


            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={isRefetching} 
                onRefresh={refetch} 
                tintColor="#10b981" 
              />
            }
          >
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                {/* STATS GRID */}
                {globalTotals && (
                  <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: theme.success + '10', borderColor: theme.success + '30' }]}>
                      <ThemedText style={[styles.statLabel, { color: theme.success }]}>Total Revenue</ThemedText>
                      <ThemedText style={[styles.statValue, { color: theme.success }]}>
                        {formatCurrency(globalTotals.totalRevenue)}
                      </ThemedText>
                      <ThemedText style={[styles.statSubtext, { color: theme.textSecondary }]}>All time</ThemedText>
                    </View>
                    
                    <View style={[styles.statCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
                      <ThemedText style={[styles.statLabel, { color: theme.primary }]}>Today's Revenue</ThemedText>
                      <ThemedText style={[styles.statValue, { color: theme.primary }]}>
                        {formatCurrency(globalTotals.todayRevenue)}
                      </ThemedText>
                      <ThemedText style={[styles.statSubtext, { color: theme.textSecondary }]}>Today</ThemedText>
                    </View>
                    
                    <View style={[styles.statCard, { backgroundColor: theme.secondary + '10', borderColor: theme.secondary + '30' }]}>
                      <ThemedText style={[styles.statLabel, { color: theme.secondary }]}>This Month</ThemedText>
                      <ThemedText style={[styles.statValue, { color: theme.secondary }]}>
                        {formatCurrency(globalTotals.monthRevenue)}
                      </ThemedText>
                      <ThemedText style={[styles.statSubtext, { color: theme.textSecondary }]}>Monthly revenue</ThemedText>
                    </View>
                    
                    <View style={[styles.statCard, { backgroundColor: theme.warning + '10', borderColor: theme.warning + '30' }]}>
                      <ThemedText style={[styles.statLabel, { color: theme.warning }]}>Avg Order Value</ThemedText>
                      <ThemedText style={[styles.statValue, { color: theme.warning }]}>
                        {formatCurrency(globalTotals.avgOrderValue)}
                      </ThemedText>
                      <ThemedText style={[styles.statSubtext, { color: theme.textSecondary }]}>Per order</ThemedText>
                    </View>
                    {/* Enhanced Financial Breakdown */}
{globalTotals && (
  <View style={styles.contentSection}>
    <View style={styles.sectionHeader}>
      <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>
        💰 Financial Breakdown
      </ThemedText>
    </View>
    
    <View style={styles.metricsRow}>
      <View style={styles.metricBox}>
        <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>
          COD Collected
        </ThemedText>
        <ThemedText style={[styles.metricBoxValue, { color: theme.success }]}>
          {formatCurrency(globalTotals.codCollected)}
        </ThemedText>
        <ThemedText style={[styles.metricBoxSub, { color: theme.textSecondary }]}>
          Cash received
        </ThemedText>
      </View>
      
      <View style={styles.metricBox}>
        <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>
          COD Outstanding
        </ThemedText>
        <ThemedText style={[styles.metricBoxValue, { color: theme.warning }]}>
          {formatCurrency(globalTotals.codPending)}
        </ThemedText>
        <ThemedText style={[styles.metricBoxSub, { color: theme.textSecondary }]}>
          Pending collection
        </ThemedText>
      </View>
      
      <View style={styles.metricBox}>
        <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>
          Revenue Mix
        </ThemedText>
        <ThemedText style={[styles.metricBoxValue, { color: theme.primary }]}>
          85% / 15%
        </ThemedText>
        <ThemedText style={[styles.metricBoxSub, { color: theme.textSecondary }]}>
          Products / Delivery
        </ThemedText>
      </View>
      
      <View style={styles.metricBox}>
        <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>
          Est. Net Margin
        </ThemedText>
        <ThemedText style={[styles.metricBoxValue, { color: theme.secondary }]}>
          ~8-10%
        </ThemedText>
        <ThemedText style={[styles.metricBoxSub, { color: theme.textSecondary }]}>
          After all costs
        </ThemedText>
      </View>
    </View>
  </View>
)}
                  </View>
                )}

                {/* ORDER SUMMARY */}
                <View style={styles.contentSection}>
                  <View style={styles.sectionHeader}>
                    <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>Order Summary</ThemedText>
                  </View>
                  
                  <View style={styles.metricsRow}>
                    <View style={styles.metricBox}>
                      <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>Total</ThemedText>
                      <ThemedText style={[styles.metricBoxValue, { color: theme.text }]}>{orderSummary?.total || 0}</ThemedText>
                      <ThemedText style={[styles.metricBoxSub, { color: theme.textSecondary }]}>All orders</ThemedText>
                    </View>
                    <View style={styles.metricBox}>
                      <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>Pending</ThemedText>
                      <ThemedText style={[styles.metricBoxValue, { color: theme.warning }]}>{orderSummary?.pending || 0}</ThemedText>
                      <ThemedText style={[styles.metricBoxSub, { color: theme.textSecondary }]}>Awaiting pickup</ThemedText>
                    </View>
                    <View style={styles.metricBox}>
                      <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>Active</ThemedText>
                      <ThemedText style={[styles.metricBoxValue, { color: theme.primary }]}>
                        {(orderSummary?.picking || 0) + (orderSummary?.packed || 0) + (orderSummary?.delivering || 0)}
                      </ThemedText>
                      <ThemedText style={[styles.metricBoxSub, { color: theme.textSecondary }]}>In progress</ThemedText>
                    </View>
                    <View style={styles.metricBox}>
                      <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>Delivered</ThemedText>
                      <ThemedText style={[styles.metricBoxValue, { color: theme.success }]}>{orderSummary?.delivered || 0}</ThemedText>
                      <ThemedText style={[styles.metricBoxSub, { color: theme.textSecondary }]}>Completed</ThemedText>
                    </View>
                  </View>
                </View>

                {/* STORES OVERVIEW */}
                <View style={styles.contentSection}>
                  <View style={styles.sectionHeader}>
                    <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>Store Performance</ThemedText>
                    <Pressable 
                      style={[styles.button, styles.buttonSecondary, { borderColor: theme.border }]}
                      onPress={() => setActiveTab('stores')}
                    >
                      <ThemedText style={[styles.buttonText, { color: theme.text }]}>View All</ThemedText>
                      <Feather name="arrow-right" size={14} color={theme.text} />
                    </Pressable>
                  </View>
                  
                  {stores.slice(0, 3).map((store) => (
                    <View key={store.id} style={[styles.storeCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                      <View style={styles.storeHeader}>
                        <View style={styles.storeInfo}>
                          <ThemedText style={styles.storeName}>{store.name}</ThemedText>
                          <ThemedText style={[styles.storeAddress, { color: theme.textSecondary }]}>{store.address}</ThemedText>
                          <View style={[styles.storeBadge, { backgroundColor: store.isActive ? theme.success + '20' : theme.error + '20' }]}>
                            <ThemedText style={{ fontSize: 12, fontWeight: '600', color: store.isActive ? theme.success : theme.error }}>
                              {store.isActive ? 'Active' : 'Inactive'}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                      
                      <View style={[styles.metricsRow, { borderBottomColor: theme.border }]}>
                        <View style={styles.metricBox}>
                          <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>Revenue</ThemedText>
                          <ThemedText style={[styles.metricBoxValue, { color: theme.success }]}>
                            {formatCurrency(store.totalRevenue)}
                          </ThemedText>
                        </View>
                        <View style={styles.metricBox}>
                          <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>Orders</ThemedText>
                          <ThemedText style={[styles.metricBoxValue, { color: theme.text }]}>
                            {store.orderCount}
                          </ThemedText>
                        </View>
                        <View style={styles.metricBox}>
                          <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>Staff</ThemedText>
                          <ThemedText style={[styles.metricBoxValue, { color: theme.text }]}>
                            {store.staff.length}
                          </ThemedText>
                          <ThemedText style={[styles.metricBoxSub, { color: theme.success }]}>
                            {store.staff.filter(s => s.status === 'online').length} online
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* STORES TAB */}
            {activeTab === 'stores' && (
              <View style={styles.contentSection}>
                {stores.map((store) => (
                  <View key={store.id} style={[styles.storeCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <View style={styles.storeHeader}>
                      <View style={styles.storeInfo}>
                        <ThemedText style={styles.storeName}>{store.name}</ThemedText>
                        <ThemedText style={[styles.storeAddress, { color: theme.textSecondary }]}>{store.address}</ThemedText>
                        <View style={[styles.storeBadge, { backgroundColor: store.isActive ? theme.success + '20' : theme.error + '20' }]}>
                          <ThemedText style={{ fontSize: 12, fontWeight: '600', color: store.isActive ? theme.success : theme.error }}>
                            {store.isActive ? 'Active' : 'Inactive'}
                          </ThemedText>
                        </View>
                      {store.owner && (
              <View style={{ 
                marginTop: Spacing.md, 
                paddingTop: Spacing.md, 
                borderTopWidth: 1, 
                borderTopColor: theme.border 
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs }}>
                  <Feather name="user" size={14} color={theme.primary} />
                  <ThemedText style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>
                    Store Owner
                  </ThemedText>
                </View>
                <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>
                  {store.owner.user?.name || store.owner.user?.username || 'No name'}
                </ThemedText>
                {store.owner.user?.phone && (
                  <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
                    📱 {store.owner.user.phone}
                  </ThemedText>
                )}
                {store.owner.user?.email && (
                  <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
                    ✉️ {store.owner.user.email}
                  </ThemedText>
                )}
              </View>
            )}
          </View>
                      <View style={styles.storeActions}>
                        <Pressable 
                          style={[styles.iconButton, { backgroundColor: theme.secondary + '15' }]}
                          onPress={() => {
                            setSelectedStore(store);
                            setShowStoreModal(true);
                          }}
                        >
                          <Feather name="edit-2" size={16} color={theme.secondary} />
                        </Pressable>
                        <Pressable 
                          style={[styles.iconButton, { backgroundColor: theme.error + '15' }]}
                          onPress={() => handleStoreDelete(store)}
                        >
                          <Feather name="trash-2" size={16} color={theme.error} />
                        </Pressable>
                      </View>
                    </View>
                    
                    <View style={[styles.metricsRow, { borderBottomColor: theme.border }]}>
                      <View style={styles.metricBox}>
                        <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>Total Revenue</ThemedText>
                        <ThemedText style={[styles.metricBoxValue, { color: theme.success }]}>
                          {formatCurrency(store.totalRevenue)}
                        </ThemedText>
                      </View>
                      <View style={styles.metricBox}>
                        <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>Today</ThemedText>
                        <ThemedText style={[styles.metricBoxValue, { color: theme.primary }]}>
                          {formatCurrency(store.todayRevenue)}
                        </ThemedText>
                        <ThemedText style={[styles.metricBoxSub, { color: theme.textSecondary }]}>
                          {store.todayOrders} orders
                        </ThemedText>
                      </View>
                      <View style={styles.metricBox}>
                        <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>This Month</ThemedText>
                        <ThemedText style={[styles.metricBoxValue, { color: theme.secondary }]}>
                          {formatCurrency(store.monthRevenue)}
                        </ThemedText>
                        <ThemedText style={[styles.metricBoxSub, { color: theme.textSecondary }]}>
                          {store.monthOrders} orders
                        </ThemedText>
                      </View>
                      <View style={styles.metricBox}>
                        <ThemedText style={[styles.metricBoxLabel, { color: theme.textSecondary }]}>Avg Order</ThemedText>
                        <ThemedText style={[styles.metricBoxValue, { color: theme.warning }]}>
                          {formatCurrency(store.avgOrderValue)}
                        </ThemedText>
                        <ThemedText style={[styles.metricBoxSub, { color: theme.textSecondary }]}>
                          {store.completionRate.toFixed(1)}% complete
                        </ThemedText>
                      </View>
                    </View>

                    {/* STAFF SECTION */}
                    <View style={styles.staffSection}>
                      <View style={[styles.sectionHeader, { marginBottom: Spacing.md }]}>
                        <ThemedText style={{ fontSize: 15, fontWeight: '700' }}>
                          Staff ({store.staff.length})
                        </ThemedText>
                        <Pressable 
                          style={[styles.button, styles.buttonSecondary, { borderColor: theme.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }]}
                          onPress={() => {
                            setCurrentStoreId(store.id);
                            setSelectedStaff(null);
                            setShowStaffModal(true);
                          }}
                        >
                          <Feather name="plus" size={14} color={theme.primary} />
                          <ThemedText style={[styles.buttonText, { fontSize: 13, color: theme.primary }]}>Add Staff</ThemedText>
                        </Pressable>
                      </View>
                      
                      {store.staff.length === 0 ? (
                        <View style={[styles.emptyState, { paddingVertical: Spacing.xl }]}>
                          <Feather name="users" size={32} color={theme.textSecondary} style={styles.emptyIcon} />
                          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                            No staff members yet. Add your first team member to get started.
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={styles.staffGrid}>
                          {store.staff.map((staff) => (
                            <View key={staff.id} style={[styles.staffCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                              <View style={[styles.staffAvatar, { backgroundColor: staff.role === 'picker' ? theme.secondary + '20' : theme.primary + '20' }]}>
                                <Feather 
                                  name={staff.role === 'picker' ? 'package' : 'truck'} 
                                  size={20} 
                                  color={staff.role === 'picker' ? theme.secondary : theme.primary} 
                                />
                              </View>
                              <View style={styles.staffInfo}>
                                <ThemedText style={styles.staffName}>
                                  {staff.user?.name || staff.user?.username || 'Unknown'}
                                </ThemedText>
                                <ThemedText style={[styles.staffRole, { color: theme.textSecondary }]}>
                                  {staff.role === 'picker' ? 'Picker' : 'Driver'}
                                </ThemedText>
                                {staff.stats && (
                                  <ThemedText style={[styles.staffStats, { color: theme.textSecondary }]}>
                                    {staff.stats.delivered} delivered • {staff.stats.active} active
                                  </ThemedText>
                                )}
                              </View>
                              <View style={styles.staffActions}>
                                <Pressable
                                  onPress={() => handleToggleStatus(staff.userId, staff.status)}
                                  style={[styles.statusBadge, { backgroundColor: staff.status === 'online' ? theme.success + '20' : theme.textSecondary + '20' }]}
                                >
                                  <View style={[styles.statusDot, { backgroundColor: staff.status === 'online' ? theme.success : theme.textSecondary }]} />
                                  <ThemedText style={{ fontSize: 12, color: staff.status === 'online' ? theme.success : theme.textSecondary }}>
                                    {staff.status === 'online' ? 'Online' : 'Offline'}
                                  </ThemedText>
                                </Pressable>
                                <Pressable 
                                  style={[styles.iconButton, { backgroundColor: theme.secondary + '15' }]}
                                  onPress={() => {
                                    setCurrentStoreId(store.id);
                                    setSelectedStaff(staff);
                                    setShowStaffModal(true);
                                  }}
                                >
                                  <Feather name="edit-2" size={14} color={theme.secondary} />
                                </Pressable>
                                <Pressable 
                                  style={[styles.iconButton, { backgroundColor: theme.error + '15' }]}
                                  onPress={() => {
                                    const staffName = staff.user?.name || staff.user?.username || "this staff member";
                                    handleStaffDelete(store.id, staff.id, staffName);
                                  }}
                                >
                                  <Feather name="trash-2" size={14} color={theme.error} />
                                </Pressable>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))}

                {stores.length === 0 && (
                  <View style={styles.emptyState}>
                    <Feather name="home" size={64} color={theme.textSecondary} style={styles.emptyIcon} />
                    <ThemedText style={styles.emptyTitle}>No Stores Yet</ThemedText>
                    <ThemedText style={styles.emptyText}>
                      Add your first store to start managing deliveries and staff
                    </ThemedText>
                  </View>
                )}
              </View>
            )}

            {/* PROMOTIONS TAB */}
            {activeTab === 'promotions' && (
              <View style={styles.contentSection}>
                {promotions.map((promo: Promotion) => (
                  <View key={promo.id} style={[styles.promotionCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, opacity: promo.isActive ? 1 : 0.6 }]}>
                   {(promo.image || promo.bannerImage) && (
                    <Image 
                      source={{ uri: getImageUrl(promo.image || promo.bannerImage) }} // ADD getImageUrl here
                      style={styles.promotionImage}
                      resizeMode="cover"
                    />
                  )}
                    
                    <View style={styles.promotionHeader}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.promotionTitle}>{promo.title}</ThemedText>
                        <ThemedText style={[styles.promotionDesc, { color: theme.textSecondary }]}>
                          {promo.description}
                        </ThemedText>
                        {promo.scope === "store" && promo.storeName && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs }}>
                            <Feather name="map-pin" size={14} color={theme.secondary} />
                            <ThemedText style={{ fontSize: 13, color: theme.secondary }}>{promo.storeName}</ThemedText>
                          </View>
                        )}
                        {promo.scope === "app" && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs }}>
                            <Feather name="globe" size={14} color={theme.primary} />
                            <ThemedText style={{ fontSize: 13, color: theme.primary }}>App-Wide</ThemedText>
                          </View>
                        )}
                      </View>
                      <View style={[styles.storeBadge, { backgroundColor: promo.isActive ? theme.success + '20' : theme.error + '20' }]}>
                        <ThemedText style={{ fontSize: 12, fontWeight: '600', color: promo.isActive ? theme.success : theme.error }}>
                          {promo.isActive ? 'Active' : 'Inactive'}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.promotionMeta}>
                      <View style={styles.promotionMetaItem}>
                        <Feather name="percent" size={14} color={theme.textSecondary} />
                        <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
                          {promo.type === "percentage" ? `${promo.discountValue}% off` : `Rp ${promo.discountValue?.toLocaleString()} off`}
                        </ThemedText>
                      </View>
                      <View style={styles.promotionMetaItem}>
                        <Feather name="shopping-bag" size={14} color={theme.textSecondary} />
                        <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
                          Min: Rp {promo.minOrder.toLocaleString()}
                        </ThemedText>
                      </View>
                      <View style={styles.promotionMetaItem}>
                        <Feather name="calendar" size={14} color={theme.textSecondary} />
                        <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
                          Until: {new Date(promo.validUntil).toLocaleDateString()}
                        </ThemedText>
                      </View>
                      <View style={styles.promotionMetaItem}>
                        <Feather name="users" size={14} color={theme.textSecondary} />
                        <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
                          Used: {promo.usedCount} times
                        </ThemedText>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
                      <Pressable 
                        style={[styles.button, styles.buttonSecondary, { flex: 1, borderColor: theme.secondary, justifyContent: 'center' }]}
                        onPress={() => {
                          setSelectedPromotion(promo);
                          setShowPromotionModal(true);
                        }}
                      >
                        <Feather name="edit-2" size={14} color={theme.secondary} />
                        <ThemedText style={[styles.buttonText, { color: theme.secondary }]}>Edit</ThemedText>
                      </Pressable>
                      <Pressable 
                        style={[styles.button, styles.buttonSecondary, { flex: 1, borderColor: theme.warning, justifyContent: 'center' }]}
                        onPress={() => handleTogglePromotionActive(promo.id, !promo.isActive)}
                      >
                        <Feather name={promo.isActive ? 'eye-off' : 'eye'} size={14} color={theme.warning} />
                        <ThemedText style={[styles.buttonText, { color: theme.warning }]}>
                          {promo.isActive ? 'Deactivate' : 'Activate'}
                        </ThemedText>
                      </Pressable>
                      <Pressable 
                        style={[styles.button, styles.buttonSecondary, { flex: 1, borderColor: theme.error, justifyContent: 'center' }]}
                        onPress={() => handlePromotionDelete(promo)}
                      >
                        <Feather name="trash-2" size={14} color={theme.error} />
                        <ThemedText style={[styles.buttonText, { color: theme.error }]}>Delete</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ))}

                {promotions.length === 0 && (
                  <View style={styles.emptyState}>
                    <Feather name="gift" size={64} color={theme.textSecondary} style={styles.emptyIcon} />
                    <ThemedText style={styles.emptyTitle}>No Promotions Yet</ThemedText>
                    <ThemedText style={styles.emptyText}>
                      Create your first promotion to attract customers
                    </ThemedText>
                  </View>
                )}
              </View>
            )}

            

       </ScrollView>
        </View>
      </View>

      {/* MODALS */}
      <StoreModal
        visible={showStoreModal}
        store={selectedStore}
        onClose={() => {
          setShowStoreModal(false);
          setSelectedStore(null);
        }}
        onSubmit={handleStoreSubmit}
        onDelete={selectedStore ? () => handleStoreDelete(selectedStore) : undefined}
        isLoading={isSubmitting}
      />

      <StaffModal
        visible={showStaffModal}
        storeId={currentStoreId}
        storeName={stores.find(s => s.id === currentStoreId)?.name || ""}
        staff={selectedStaff}
        onClose={() => {
          setShowStaffModal(false);
          setSelectedStaff(null);
        }}
        onSubmit={handleStaffSubmit}
        onDelete={selectedStaff ? () => {
          const staffName = selectedStaff.user?.name || selectedStaff.user?.username || "this staff member";
          handleStaffDelete(currentStoreId, selectedStaff.id, staffName);
        } : undefined}
        isLoading={isSubmitting}
      />

      <PromotionModal
        visible={showPromotionModal}
        promotion={selectedPromotion}
        stores={stores}
        onClose={() => {
          setShowPromotionModal(false);
          setSelectedPromotion(null);
        }}
        onSubmit={handlePromotionSubmit}
        onDelete={selectedPromotion ? () => handlePromotionDelete(selectedPromotion) : undefined}
        isLoading={isSubmitting}
      />
      <StoreWithOwnerModal
  visible={showStoreOwnerModal}
  onClose={() => setShowStoreOwnerModal(false)}
  onSubmit={handleStoreOwnerSubmit}
  isLoading={createStoreWithOwnerMutation.isPending}
/>

    </ThemedView>
  );
}