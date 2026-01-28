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

// ---------------------- HELPERS ----------------------
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ---------------------- CONFIRMATION HELPER ----------------------
const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm }
    ]);
  }
};

// ---------------------- STYLES ----------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { marginBottom: Spacing.md },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  metricCard: { flex: 1, minWidth: "45%", alignItems: "center", padding: Spacing.md },
  wideMetricCard: { width: "100%", padding: Spacing.md },
  metricIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: Spacing.xs },
  metricValue: { marginTop: Spacing.xs },
  metricSubtext: { marginTop: Spacing.xs },
  financialRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: Spacing.sm },
  addButton: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  storeCard: { marginBottom: Spacing.md, padding: Spacing.md },
  storeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  storeInfo: { flex: 1, marginRight: Spacing.md },
  storeActions: { flexDirection: "row", gap: Spacing.xs },
  iconButton: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  activeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xs, marginTop: Spacing.xs },
  divider: { height: 1, marginVertical: Spacing.md },
  statsRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: Spacing.md },
  statItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xs },
  sectionLabel: { marginBottom: Spacing.sm, letterSpacing: 1 },
  financialGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.md },
  financialItem: { flex: 1, minWidth: "45%", padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1 },
  staffRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm },
  staffIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  staffInfo: { flex: 1, marginLeft: Spacing.sm },
  staffActions: { flexDirection: "row", gap: Spacing.xs, alignItems: "center" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  addStaffButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingVertical: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.sm, borderStyle: "dashed" },
  emptyCard: { alignItems: "center", padding: Spacing.xxl },
  timestamp: { textAlign: "center", marginTop: Spacing.md },
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { width: "90%", maxWidth: 400, padding: Spacing.lg, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.lg },
  fieldLabel: { marginBottom: Spacing.xs, marginTop: Spacing.sm },
  input: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, marginBottom: Spacing.md, fontSize: 16 },
  coordRow: { flexDirection: "row", gap: Spacing.md },
  coordInput: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, marginBottom: Spacing.md, fontSize: 16 },
  roleSelector: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.lg },
  roleButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingVertical: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.sm, borderColor: "#ccc" },
  codToggle: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.lg },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: "#ccc", justifyContent: "center", alignItems: "center" },
  infoBox: { flexDirection: "row", padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, marginBottom: Spacing.lg },
  geocodeButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, paddingVertical: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius.sm, marginBottom: Spacing.md },
  submitButton: { paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, alignItems: "center" },
  deleteButton: { paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, alignItems: "center", marginTop: Spacing.sm },
  globalCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  globalGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md, marginTop: Spacing.md },
  globalItem: { flex: 1, minWidth: "45%", alignItems: "center" },
  promotionCard: { padding: Spacing.md, marginBottom: Spacing.md },
  promotionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.md },
  promotionDetails: { marginTop: Spacing.sm },
  promotionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginVertical: Spacing.xs },
  typeSelector: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.lg },
  typeButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingVertical: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.sm },
  scopeSelector: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.md },
  scopeButton: { flex: 1, paddingVertical: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.sm, alignItems: "center" },
  storeSelector: { maxHeight: 150, borderWidth: 1, borderRadius: BorderRadius.sm, marginBottom: Spacing.md },
  storeOption: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: 1 },
  imagePicker: {
    height: 140,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promotionImage: {
    width: '100%',
    height: '100%',
  },
  promotionCardImage: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
});

// ---------------------- TYPES ----------------------
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

interface StoreData {
  id: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
  codAllowed: boolean;
  staff: StaffMember[];
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

interface PromotionModalProps {
  visible: boolean;
  promotion: Promotion | null;
  stores: StoreData[];
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  onDelete?: () => void;
  isLoading: boolean;
}

interface PromotionCardProps {
  promotion: Promotion;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
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

// ---------------------- PROMOTION MODAL ----------------------
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
    <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
      <Card style={styles.modalContent}>
        <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <ThemedText type="h3">{promotion ? "Edit Promotion" : "Create Promotion"}</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Banner Image (16:9)
          </ThemedText>
          <Pressable 
            style={[styles.imagePicker, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}
            onPress={pickImage}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.promotionImage} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Feather name="image" size={40} color={theme.textSecondary} />
                <ThemedText type="caption" style={{ marginTop: 8, color: theme.textSecondary }}>
                  Tap to add banner image
                </ThemedText>
              </View>
            )}
          </Pressable>

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Title *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="e.g., Weekend Special 20% Off"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Description *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault, height: 60 }]}
            placeholder="Describe the promotion..."
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Scope *</ThemedText>
          <View style={styles.scopeSelector}>
            <Pressable
              style={[styles.scopeButton, scope === "app" && { backgroundColor: theme.primary + "20", borderColor: theme.primary }]}
              onPress={() => setScope("app")}
            >
              <ThemedText type="body" style={{ color: scope === "app" ? theme.primary : theme.textSecondary }}>
                App-Wide
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.scopeButton, scope === "store" && { backgroundColor: theme.secondary + "20", borderColor: theme.secondary }]}
              onPress={() => setScope("store")}
            >
              <ThemedText type="body" style={{ color: scope === "store" ? theme.secondary : theme.textSecondary }}>
                Specific Stores
              </ThemedText>
            </Pressable>
          </View>

          {scope === "store" && (
            <>
              <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Select Stores (optional - leave empty for all)
              </ThemedText>
              <ScrollView style={[styles.storeSelector, { borderColor: theme.border }]}>
                {stores.map(store => (
                  <Pressable
                    key={store.id}
                    style={[styles.storeOption, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setSelectedStores(prev =>
                        prev.includes(store.id)
                          ? prev.filter(id => id !== store.id)
                          : [...prev, store.id]
                      );
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                      <View style={[styles.checkbox, selectedStores.includes(store.id) && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                        {selectedStores.includes(store.id) && <Feather name="check" size={14} color="#fff" />}
                      </View>
                      <ThemedText type="body">{store.name}</ThemedText>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Type *</ThemedText>
          <View style={styles.typeSelector}>
            <Pressable
              style={[styles.typeButton, type === "percentage" && { backgroundColor: theme.primary + "20", borderColor: theme.primary }]}
              onPress={() => setType("percentage")}
            >
              <Feather name="percent" size={18} color={type === "percentage" ? theme.primary : theme.textSecondary} />
              <ThemedText type="body" style={{ color: type === "percentage" ? theme.primary : theme.textSecondary }}>
                Percentage
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.typeButton, type === "fixed_amount" && { backgroundColor: theme.primary + "20", borderColor: theme.primary }]}
              onPress={() => setType("fixed_amount")}
            >
              <Feather name="dollar-sign" size={18} color={type === "fixed_amount" ? theme.primary : theme.textSecondary} />
              <ThemedText type="body" style={{ color: type === "fixed_amount" ? theme.primary : theme.textSecondary }}>
                Fixed
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.coordRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Discount {type === "percentage" ? "(%)" : "(Rp)"} *
              </ThemedText>
              <TextInput
                style={[styles.coordInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
                placeholder={type === "percentage" ? "20" : "50000"}
                placeholderTextColor={theme.textSecondary}
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Min Order (Rp)</ThemedText>
              <TextInput
                style={[styles.coordInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
                placeholder="100000"
                placeholderTextColor={theme.textSecondary}
                value={minOrder}
                onChangeText={setMinOrder}
                keyboardType="numeric"
              />
            </View>
          </View>

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Valid Until *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            value={validUntil}
            onChangeText={setValidUntil}
          />

          <Pressable style={styles.codToggle} onPress={() => setShowInBanner(!showInBanner)}>
            <View style={[styles.checkbox, showInBanner && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
              {showInBanner && <Feather name="check" size={14} color="#fff" />}
            </View>
            <ThemedText type="body">Show in home banner</ThemedText>
          </Pressable>

          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.buttonText} />
            ) : (
              <ThemedText type="button" style={{ color: theme.buttonText }}>
                {promotion ? "Update Promotion" : "Create Promotion"}
              </ThemedText>
            )}
          </Pressable>

          {promotion && onDelete && (
            <Pressable
              style={[styles.deleteButton, { backgroundColor: theme.error + "20", borderWidth: 1, borderColor: theme.error }]}
              onPress={onDelete}
            >
              <ThemedText type="button" style={{ color: theme.error }}>Delete Promotion</ThemedText>
            </Pressable>
          )}
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
};

// ---------------------- PROMOTION CARD ----------------------
const PromotionCard: React.FC<PromotionCardProps> = ({ 
  promotion, 
  onEdit, 
  onDelete, 
  onToggleActive 
}) => {
  const { theme } = useTheme();

  return (
    <Card style={{ ...styles.promotionCard, ...(!promotion.isActive && { opacity: 0.6 }) }}>
      {(promotion.image || promotion.bannerImage) && (
        <Image 
          source={{ uri: promotion.image || promotion.bannerImage || '' }} 
          style={styles.promotionCardImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.promotionHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText type="h3">{promotion.title}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
            {promotion.description}
          </ThemedText>
          {promotion.scope === "store" && promotion.storeName && (
            <ThemedText type="small" style={{ color: theme.secondary, marginTop: 4 }}>
              📍 {promotion.storeName}
            </ThemedText>
          )}
          {promotion.scope === "app" && (
            <ThemedText type="small" style={{ color: theme.primary, marginTop: 4 }}>
              🌍 App-Wide
            </ThemedText>
          )}
        </View>
        <View style={[styles.activeBadge, { backgroundColor: promotion.isActive ? theme.success + "20" : theme.error + "20" }]}>
          <ThemedText type="small" style={{ color: promotion.isActive ? theme.success : theme.error }}>
            {promotion.isActive ? "Active" : "Inactive"}
          </ThemedText>
        </View>
      </View>

      <View style={styles.promotionDetails}>
        <View style={styles.promotionRow}>
          <Feather name="percent" size={16} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {promotion.type === "percentage" ? `${promotion.discountValue}% off` : `Rp ${promotion.discountValue?.toLocaleString()} off`}
          </ThemedText>
        </View>
        <View style={styles.promotionRow}>
          <Feather name="shopping-bag" size={16} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Min order: Rp {promotion.minOrder.toLocaleString()}
          </ThemedText>
        </View>
        <View style={styles.promotionRow}>
          <Feather name="calendar" size={16} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Until: {new Date(promotion.validUntil).toLocaleDateString()}
          </ThemedText>
        </View>
        <View style={styles.promotionRow}>
          <Feather name="users" size={16} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Used: {promotion.usedCount} times
          </ThemedText>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: Spacing.xs, marginTop: Spacing.md }}>
        <Pressable style={[styles.iconButton, { backgroundColor: theme.secondary + "15", flex: 1 }]} onPress={onEdit}>
          <Feather name="edit-2" size={14} color={theme.secondary} />
        </Pressable>
        <Pressable style={[styles.iconButton, { backgroundColor: theme.warning + "15", flex: 1 }]} onPress={onToggleActive}>
          <Feather name={promotion.isActive ? "eye-off" : "eye"} size={14} color={theme.warning} />
        </Pressable>
        <Pressable style={[styles.iconButton, { backgroundColor: theme.error + "15", flex: 1 }]} onPress={onDelete}>
          <Feather name="trash-2" size={14} color={theme.error} />
        </Pressable>
      </View>
    </Card>
  );
};

// ---------------------- STORE MODAL ----------------------
const StoreModal: React.FC<{
  visible: boolean;
  store: StoreData | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete?: () => void;
  isLoading: boolean;
}> = ({ visible, store, onClose, onSubmit, onDelete, isLoading }) => {
  const { theme } = useTheme();
  const [name, setName] = useState(store?.name || "");
  const [address, setAddress] = useState(store?.address || "");
  const [latitude, setLatitude] = useState(store?.latitude || "-6.2088");
  const [longitude, setLongitude] = useState(store?.longitude || "106.8456");
  const [codAllowed, setCodAllowed] = useState(store?.codAllowed ?? true);
  const [geocoding, setGeocoding] = useState(false);

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
    <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
      <Card style={styles.modalContent}>
        <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <ThemedText type="h3">{store ? "Edit Store" : "Add New Store"}</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Store Name *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="e.g. KilatGo Central Jakarta"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Address *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="Full store address"
            placeholderTextColor={theme.textSecondary}
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <Pressable 
            style={[styles.geocodeButton, { borderColor: theme.secondary }]}
            onPress={handleGeocode}
            disabled={geocoding}
          >
            {geocoding ? (
              <ActivityIndicator size="small" color={theme.secondary} />
            ) : (
              <>
                <Feather name="map-pin" size={16} color={theme.secondary} />
                <ThemedText type="button" style={{ color: theme.secondary }}>Auto-Find Location</ThemedText>
              </>
            )}
          </Pressable>

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Coordinates</ThemedText>
          <View style={styles.coordRow}>
            <TextInput
              style={[styles.coordInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
              placeholder="Latitude"
              placeholderTextColor={theme.textSecondary}
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.coordInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
              placeholder="Longitude"
              placeholderTextColor={theme.textSecondary}
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numeric"
            />
          </View>

          <Pressable style={styles.codToggle} onPress={() => setCodAllowed(!codAllowed)}>
            <View style={[styles.checkbox, codAllowed && { backgroundColor: theme.success, borderColor: theme.success }]}>
              {codAllowed ? <Feather name="check" size={14} color="#fff" /> : null}
            </View>
            <ThemedText type="body">Allow Cash on Delivery</ThemedText>
          </Pressable>

          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.buttonText} />
            ) : (
              <ThemedText type="button" style={{ color: theme.buttonText }}>
                {store ? "Update Store" : "Create Store"}
              </ThemedText>
            )}
          </Pressable>

          {store && onDelete && (
            <Pressable
              style={[styles.deleteButton, { backgroundColor: theme.error + "20", borderWidth: 1, borderColor: theme.error }]}
              onPress={onDelete}
            >
              <ThemedText type="button" style={{ color: theme.error }}>Delete Store</ThemedText>
            </Pressable>
          )}
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
};

// ---------------------- STAFF MODAL ----------------------
const StaffModal: React.FC<{
  visible: boolean;
  storeId: string;
  storeName: string;
  staff: StaffMember | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete?: () => void;
  isLoading: boolean;
}> = ({ visible, storeId, storeName, staff, onClose, onSubmit, onDelete, isLoading }) => {
  const { theme } = useTheme();
  const [phone, setPhone] = useState(staff?.user?.phone || "");
  const [email, setEmail] = useState(staff?.user?.email || "");
  const [name, setName] = useState(staff?.user?.name || "");
  const [role, setRole] = useState<"picker" | "driver">(staff?.role || "picker");

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
    <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
      <Card style={styles.modalContent}>
        <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <View>
              <ThemedText type="h3">{staff ? "Edit Staff" : "Add Staff"}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>{storeName}</ThemedText>
            </View>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          {!staff && (
            <View style={[styles.infoBox, { backgroundColor: theme.secondary + "10", borderColor: theme.secondary + "30" }]}>
              <Feather name="info" size={16} color={theme.secondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm }}>
                If this person doesn't have an account yet, we'll create one for them automatically.
              </ThemedText>
            </View>
          )}

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Name</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="Staff member name"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone Number</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="+62 812 3456 7890"
            placeholderTextColor={theme.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!staff}
          />

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email Address</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="staff@example.com"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!staff}
          />

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Role *</ThemedText>
          <View style={styles.roleSelector}>
            <Pressable
              style={[styles.roleButton, role === "picker" && { backgroundColor: theme.secondary + "20", borderColor: theme.secondary }]}
              onPress={() => setRole("picker")}
            >
              <Feather name="package" size={20} color={role === "picker" ? theme.secondary : theme.textSecondary} />
              <ThemedText type="body" style={{ color: role === "picker" ? theme.secondary : theme.textSecondary }}>Picker</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.roleButton, role === "driver" && { backgroundColor: theme.primary + "20", borderColor: theme.primary }]}
              onPress={() => setRole("driver")}
            >
              <Feather name="truck" size={20} color={role === "driver" ? theme.primary : theme.textSecondary} />
              <ThemedText type="body" style={{ color: role === "driver" ? theme.primary : theme.textSecondary }}>Driver</ThemedText>
            </Pressable>
          </View>

          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.buttonText} />
            ) : (
              <ThemedText type="button" style={{ color: theme.buttonText }}>
                {staff ? "Update Staff" : "Add Staff Member"}
              </ThemedText>
            )}
          </Pressable>

          {staff && onDelete && (
            <Pressable
              style={[styles.deleteButton, { backgroundColor: theme.error + "20", borderWidth: 1, borderColor: theme.error }]}
              onPress={onDelete}
            >
              <ThemedText type="button" style={{ color: theme.error }}>Remove from Store</ThemedText>
            </Pressable>
          )}
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
};

// ---------------------- STAFF ROW ----------------------
const StaffRow: React.FC<{ 
  staff: StaffMember; 
  onToggleStatus: (userId: string, currentStatus: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ staff, onToggleStatus, onEdit, onDelete }) => {
  const { theme } = useTheme();
  const isOnline = staff.status === "online";
  const isPicker = staff.role === "picker";

  return (
    <View style={styles.staffRow}>
      <View style={[styles.staffIcon, { backgroundColor: isPicker ? theme.secondary + "20" : theme.primary + "20" }]}>
        <Feather name={isPicker ? "package" : "truck"} size={16} color={isPicker ? theme.secondary : theme.primary} />
      </View>
      <View style={styles.staffInfo}>
        <ThemedText type="body">{staff.user?.name || staff.user?.phone || staff.user?.email || "Unknown"}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {staff.user?.phone || staff.user?.email || "No contact"}
        </ThemedText>
        {staff.stats && (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {staff.stats.delivered} delivered • {staff.stats.active} active
          </ThemedText>
        )}
      </View>
      <View style={styles.staffActions}>
        <Pressable
          onPress={() => onToggleStatus(staff.userId, staff.status)}
          style={[styles.statusBadge, { backgroundColor: isOnline ? theme.success + "20" : theme.textSecondary + "20" }]}
        >
          <View style={[styles.statusDot, { backgroundColor: isOnline ? theme.success : theme.textSecondary }]} />
          <ThemedText type="small" style={{ color: isOnline ? theme.success : theme.textSecondary }}>
            {isOnline ? "Online" : "Offline"}
          </ThemedText>
        </Pressable>
        <Pressable style={[styles.iconButton, { backgroundColor: theme.secondary + "15" }]} onPress={onEdit}>
          <Feather name="edit-2" size={14} color={theme.secondary} />
        </Pressable>
        <Pressable style={[styles.iconButton, { backgroundColor: theme.error + "15" }]} onPress={onDelete}>
          <Feather name="trash-2" size={14} color={theme.error} />
        </Pressable>
      </View>
    </View>
  );
};

// ---------------------- STORE CARD ----------------------
const StoreCard: React.FC<{ 
  store: StoreData;
  onEdit: () => void;
  onDelete: () => void;
  onAddStaff: () => void;
  onEditStaff: (staff: StaffMember) => void;
  onDeleteStaff: (staffId: string) => void;
  onToggleStatus: (userId: string, currentStatus: string) => void;
}> = ({ store, onEdit, onDelete, onAddStaff, onEditStaff, onDeleteStaff, onToggleStatus }) => {
  const { theme } = useTheme();
  const pickers = store.staff.filter(s => s.role === "picker");
  const drivers = store.staff.filter(s => s.role === "driver");
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={styles.storeCard}>
      <Pressable style={styles.storeHeader} onPress={() => setExpanded(!expanded)}>
        <View style={styles.storeInfo}>
          <ThemedText type="h3">{store.name}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>{store.address}</ThemedText>
          <View style={[styles.activeBadge, { backgroundColor: store.isActive ? theme.success + "20" : theme.error + "20" }]}>
            <ThemedText type="small" style={{ color: store.isActive ? theme.success : theme.error }}>
              {store.isActive ? "Active" : "Inactive"}
            </ThemedText>
          </View>
        </View>
        <View style={styles.storeActions}>
          <Pressable style={[styles.iconButton, { backgroundColor: theme.secondary + "15" }]} onPress={onEdit}>
            <Feather name="edit-2" size={14} color={theme.secondary} />
          </Pressable>
          <Pressable style={[styles.iconButton, { backgroundColor: theme.error + "15" }]} onPress={onDelete}>
            <Feather name="trash-2" size={14} color={theme.error} />
          </Pressable>
          <Pressable style={[styles.iconButton, { backgroundColor: theme.border }]} onPress={() => setExpanded(!expanded)}>
            <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={theme.text} />
          </Pressable>
        </View>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Feather name="package" size={16} color={theme.secondary} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Pickers</ThemedText>
          <ThemedText type="body">{pickers.filter(p => p.status === "online").length}/{pickers.length}</ThemedText>
        </View>
        <View style={styles.statItem}>
          <Feather name="truck" size={16} color={theme.primary} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Drivers</ThemedText>
          <ThemedText type="body">{drivers.filter(d => d.status === "online").length}/{drivers.length}</ThemedText>
        </View>
        <View style={styles.statItem}>
          <Feather name="shopping-bag" size={16} color={theme.success} />
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Orders</ThemedText>
          <ThemedText type="body">{store.orderCount}</ThemedText>
        </View>
        {store.codAllowed && (
          <View style={[styles.tag, { backgroundColor: theme.success + "20" }]}>
            <ThemedText type="small" style={{ color: theme.success }}>COD</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.financialGrid}>
        <View style={[styles.financialItem, { borderColor: theme.border, backgroundColor: theme.success + "10" }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Total Revenue</ThemedText>
          <ThemedText type="h3" style={{ color: theme.success }}>{formatCurrency(store.totalRevenue)}</ThemedText>
        </View>
        <View style={[styles.financialItem, { borderColor: theme.border, backgroundColor: theme.primary + "10" }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Today</ThemedText>
          <ThemedText type="h3" style={{ color: theme.primary }}>{formatCurrency(store.todayRevenue)}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>{store.todayOrders} orders</ThemedText>
        </View>
        <View style={[styles.financialItem, { borderColor: theme.border, backgroundColor: theme.secondary + "10" }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>This Month</ThemedText>
          <ThemedText type="h3" style={{ color: theme.secondary }}>{formatCurrency(store.monthRevenue)}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>{store.monthOrders} orders</ThemedText>
        </View>
        <View style={[styles.financialItem, { borderColor: theme.border, backgroundColor: theme.warning + "10" }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Avg Order</ThemedText>
          <ThemedText type="h3" style={{ color: theme.warning }}>{formatCurrency(store.avgOrderValue)}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>{store.completionRate.toFixed(1)}% complete</ThemedText>
        </View>
      </View>

      {store.codAllowed && (store.codCollected > 0 || store.codPending > 0) && (
        <View style={[styles.infoBox, { backgroundColor: theme.warning + "10", borderColor: theme.warning + "30", marginTop: Spacing.md }]}>
          <Feather name="dollar-sign" size={16} color={theme.warning} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              COD Collected: {formatCurrency(store.codCollected)}
            </ThemedText>
            {store.codPending > 0 && (
              <ThemedText type="small" style={{ color: theme.warning }}>
                Pending Collection: {formatCurrency(store.codPending)}
              </ThemedText>
            )}
          </View>
        </View>
      )}

      {expanded && (
        <>
          {pickers.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                PICKERS ({pickers.length})
              </ThemedText>
              {pickers.map(p => (
                <StaffRow 
                  key={p.id} 
                  staff={p} 
                  onToggleStatus={onToggleStatus}
                  onEdit={() => onEditStaff(p)}
                  onDelete={() => onDeleteStaff(p.id)}
                />
              ))}
            </>
          )}

          {drivers.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                DRIVERS ({drivers.length})
              </ThemedText>
              {drivers.map(d => (
                <StaffRow 
                  key={d.id} 
                  staff={d} 
                  onToggleStatus={onToggleStatus}
                  onEdit={() => onEditStaff(d)}
                  onDelete={() => onDeleteStaff(d.id)}
                />
              ))}
            </>
          )}

          <Pressable style={[styles.addStaffButton, { borderColor: theme.primary }]} onPress={onAddStaff}>
            <Feather name="user-plus" size={16} color={theme.primary} />
            <ThemedText type="button" style={{ color: theme.primary }}>Add Staff</ThemedText>
          </Pressable>
        </>
      )}
    </Card>
  );
};

// ---------------------- METRIC CARD ----------------------
const MetricCard: React.FC<{ 
  icon: string; 
  label: string; 
  value: number | string; 
  color: string;
  subtext?: string;
}> = ({ icon, label, value, color, subtext }) => {
  const { theme } = useTheme();
  return (
    <Card style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <ThemedText type="h2" style={styles.metricValue}>{value}</ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary }}>{label}</ThemedText>
      {subtext && (
        <ThemedText type="small" style={[styles.metricSubtext, { color: theme.textSecondary }]}>
          {subtext}
        </ThemedText>
      )}
    </Card>
  );
};

// ---------------------- MAIN SCREEN ----------------------
export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [showStoreModal, setShowStoreModal] = useState(false);
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

  const { data: promotions = [], isLoading: promotionsLoading, refetch: refetchPromotions } = useQuery<Promotion[]>({
    queryKey: ["/api/admin/promotions"],
    queryFn: async () => {
      try {
        // First check if user is admin
        const userResponse = await apiRequest("GET", "/api/users/demo-user");
        if (!userResponse.ok) {
          console.error("Failed to fetch user");
          return [];
        }
        
        const userData = await userResponse.json();
        console.log("✅ Current user:", userData);
        
        const response = await apiRequest("GET", `/api/admin/promotions?userId=demo-user`);
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to fetch promotions:", response.status, errorData);
          return [];
        }
        const data = await response.json();
        console.log("✅ Promotions fetched:", data);
        return data;
      } catch (error) {
        console.error("Error fetching promotions:", error);
        return [];
      }
    },
  });

  // ---------------------- MUTATIONS ----------------------
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
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/admin/promotions`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create promotion');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      refetchPromotions();
      setShowPromotionModal(false);
      setSelectedPromotion(null);
      Alert.alert("Success", "Promotion created successfully!");
    },
    onError: (error: Error) => {
      console.error("Create promotion error:", error);
      Alert.alert("Error", error.message);
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
      console.error("Update promotion error:", error);
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
      console.error("Delete promotion error:", error);
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

  // ---------------------- HANDLERS ----------------------
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

  const handleTogglePromotionActive = (id: string, isActive: boolean) => {
    togglePromotionActiveMutation.mutate({ id, isActive });
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
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
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { 
          paddingTop: Spacing.lg, 
          paddingBottom: insets.bottom + Spacing.xl 
        }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={refetch} 
            tintColor={theme.primary} 
          />
        }
      >
        {globalTotals && (
          <Card style={styles.globalCard}>
            <ThemedText type="h2">Global Overview</ThemedText>
            <View style={styles.globalGrid}>
              <View style={styles.globalItem}>
                <Feather name="dollar-sign" size={24} color={theme.success} />
                <ThemedText type="h3" style={{ marginTop: Spacing.xs, color: theme.success }}>
                  {formatCurrency(globalTotals.totalRevenue)}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>Total Revenue</ThemedText>
              </View>
              <View style={styles.globalItem}>
                <Feather name="trending-up" size={24} color={theme.primary} />
                <ThemedText type="h3" style={{ marginTop: Spacing.xs, color: theme.primary }}>
                  {formatCurrency(globalTotals.todayRevenue)}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>Today's Revenue</ThemedText>
              </View>
              <View style={styles.globalItem}>
                <Feather name="calendar" size={24} color={theme.secondary} />
                <ThemedText type="h3" style={{ marginTop: Spacing.xs, color: theme.secondary }}>
                  {formatCurrency(globalTotals.monthRevenue)}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>This Month</ThemedText>
              </View>
              <View style={styles.globalItem}>
                <Feather name="shopping-cart" size={24} color={theme.warning} />
                <ThemedText type="h3" style={{ marginTop: Spacing.xs, color: theme.warning }}>
                  {formatCurrency(globalTotals.avgOrderValue)}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>Avg Order Value</ThemedText>
              </View>
            </View>
            
            {(globalTotals.codCollected > 0 || globalTotals.codPending > 0) && (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            )}
            
            {(globalTotals.codCollected > 0 || globalTotals.codPending > 0) && (
              <View style={styles.financialRow}>
                <View>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>COD Collected</ThemedText>
                  <ThemedText type="h3" style={{ color: theme.success }}>
                    {formatCurrency(globalTotals.codCollected)}
                  </ThemedText>
                </View>
                {globalTotals.codPending > 0 && (
                  <View style={{ alignItems: "flex-end" }}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Pending Collection</ThemedText>
                    <ThemedText type="h3" style={{ color: theme.warning }}>
                      {formatCurrency(globalTotals.codPending)}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}
          </Card>
        )}

        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>Order Summary</ThemedText>
          <View style={styles.metricsGrid}>
            <MetricCard 
              icon="shopping-bag" 
              label="Total Orders" 
              value={orderSummary?.total || 0} 
              color={theme.secondary} 
            />
            <MetricCard 
              icon="clock" 
              label="Pending" 
              value={orderSummary?.pending || 0} 
              color={theme.warning} 
            />
            <MetricCard 
              icon="package" 
              label="Picking" 
              value={orderSummary?.picking || 0} 
              color={theme.secondary}
              subtext={`${orderSummary?.packed || 0} packed`}
            />
            <MetricCard 
              icon="truck" 
              label="Delivering" 
              value={orderSummary?.delivering || 0} 
              color={theme.primary}
            />
            <MetricCard 
              icon="check-circle" 
              label="Delivered" 
              value={orderSummary?.delivered || 0} 
              color={theme.success} 
            />
            <MetricCard 
              icon="x-circle" 
              label="Cancelled" 
              value={orderSummary?.cancelled || 0} 
              color={theme.error} 
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">Promotions ({promotions.length})</ThemedText>
            <Pressable 
              style={[styles.addButton, { backgroundColor: theme.warning }]} 
              onPress={() => {
                setSelectedPromotion(null);
                setShowPromotionModal(true);
              }}
            >
              <Feather name="gift" size={18} color={theme.buttonText} />
              <ThemedText type="button" style={{ color: theme.buttonText }}>Add Promotion</ThemedText>
            </Pressable>
          </View>

          {promotions.map((promo: Promotion) => (
            <PromotionCard
              key={promo.id}
              promotion={promo}
              onEdit={() => {
                setSelectedPromotion(promo);
                setShowPromotionModal(true);
              }}
              onDelete={() => handlePromotionDelete(promo)}
              onToggleActive={() => handleTogglePromotionActive(
                promo.id,
                !promo.isActive
              )}
            />
          ))}

          {promotions.length === 0 && !promotionsLoading && (
            <Card style={styles.emptyCard}>
              <Feather name="gift" size={48} color={theme.textSecondary} />
              <ThemedText type="h3" style={{ marginTop: Spacing.md }}>No Promotions Yet</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
                Create your first promotion to attract customers
              </ThemedText>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">Stores ({stores.length})</ThemedText>
            <Pressable 
              style={[styles.addButton, { backgroundColor: theme.primary }]} 
              onPress={() => {
                setSelectedStore(null);
                setShowStoreModal(true);
              }}
            >
              <Feather name="plus" size={18} color={theme.buttonText} />
              <ThemedText type="button" style={{ color: theme.buttonText }}>Add Store</ThemedText>
            </Pressable>
          </View>

          {stores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              onEdit={() => {
                setSelectedStore(store);
                setShowStoreModal(true);
              }}
              onDelete={() => handleStoreDelete(store)}
              onAddStaff={() => {
                setCurrentStoreId(store.id);
                setSelectedStaff(null);
                setShowStaffModal(true);
              }}
              onEditStaff={(staff) => {
                setCurrentStoreId(store.id);
                setSelectedStaff(staff);
                setShowStaffModal(true);
              }}
              onDeleteStaff={(staffId) => {
                const staffMember = store.staff.find(s => s.id === staffId);
                const staffName = staffMember?.user?.name || staffMember?.user?.username || "this staff member";
                handleStaffDelete(store.id, staffId, staffName);
              }}
              onToggleStatus={handleToggleStatus}
            />
          ))}

          {stores.length === 0 && (
            <Card style={styles.emptyCard}>
              <Feather name="home" size={48} color={theme.textSecondary} />
              <ThemedText type="h3" style={{ marginTop: Spacing.md }}>No Stores Yet</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
                Add your first store to start managing deliveries
              </ThemedText>
            </Card>
          )}
        </View>

        {metrics?.timestamp && (
          <ThemedText type="small" style={[styles.timestamp, { color: theme.textSecondary }]}>
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </ThemedText>
        )}
      </ScrollView>

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
    </ThemedView>
  );
}