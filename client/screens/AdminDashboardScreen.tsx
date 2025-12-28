import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, TextInput, Alert } from "react-native";
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

interface StaffMember {
  id: string;
  userId: string;
  role: "picker" | "driver";
  status: "online" | "offline";
  user: {
    id: string;
    username: string;
    phone: string | null;
    email: string | null;
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
}

interface AdminMetrics {
  stores: StoreData[];
  orderSummary: {
    total: number;
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    onTheWay: number;
    delivered: number;
    cancelled: number;
  };
  timestamp: string;
}

function AddStoreModal({
  visible,
  onClose,
  onSubmit,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; address: string; latitude: number; longitude: number; codAllowed: boolean }) => void;
  isLoading: boolean;
}) {
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("-6.2088");
  const [longitude, setLongitude] = useState("106.8456");
  const [codAllowed, setCodAllowed] = useState(true);

  if (!visible) return null;

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
            <ThemedText type="h3">Add New Store</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="Store Name"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="Address"
            placeholderTextColor={theme.textSecondary}
            value={address}
            onChangeText={setAddress}
            multiline
          />

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
              <ThemedText type="button" style={{ color: theme.buttonText }}>Create Store</ThemedText>
            )}
          </Pressable>
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
}

function AddStaffModal({
  visible,
  storeId,
  storeName,
  onClose,
  onSubmit,
  isLoading,
}: {
  visible: boolean;
  storeId: string;
  storeName: string;
  onClose: () => void;
  onSubmit: (data: { storeId: string; phone: string; email: string; role: "picker" | "driver" }) => void;
  isLoading: boolean;
}) {
  const { theme } = useTheme();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"picker" | "driver">("picker");

  if (!visible) return null;

  const handleSubmit = () => {
    if (!phone.trim() && !email.trim()) {
      Alert.alert("Error", "Please provide either phone number or email");
      return;
    }
    onSubmit({ storeId, phone: phone.trim(), email: email.trim(), role });
    setPhone("");
    setEmail("");
    setRole("picker");
  };

  return (
    <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
      <Card style={styles.modalContent}>
        <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <View>
              <ThemedText type="h3">Add Staff</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>{storeName}</ThemedText>
            </View>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Phone Number
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="+62 812 3456 7890"
            placeholderTextColor={theme.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Email Address
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="staff@example.com"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Role
          </ThemedText>
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

          <View style={[styles.infoBox, { backgroundColor: theme.secondary + "10", borderColor: theme.secondary + "30" }]}>
            <Feather name="info" size={16} color={theme.secondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm }}>
              When this person logs in with their phone or email, they will automatically get access to the {role} dashboard for this store.
            </ThemedText>
          </View>

          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.primary, opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.buttonText} />
            ) : (
              <ThemedText type="button" style={{ color: theme.buttonText }}>Add Staff Member</ThemedText>
            )}
          </Pressable>
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
}

function StaffRow({ 
  staff, 
  onToggleStatus 
}: { 
  staff: StaffMember; 
  onToggleStatus: (userId: string, currentStatus: string) => void 
}) {
  const { theme } = useTheme();
  const isOnline = staff.status === "online";
  const isPicker = staff.role === "picker";

  return (
    <View style={styles.staffRow}>
      <View style={[styles.staffIcon, { backgroundColor: isPicker ? theme.secondary + "20" : theme.primary + "20" }]}>
        <Feather name={isPicker ? "package" : "truck"} size={16} color={isPicker ? theme.secondary : theme.primary} />
      </View>
      <View style={styles.staffInfo}>
        <ThemedText type="body">{staff.user?.phone || staff.user?.email || "Unknown"}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
        </ThemedText>
      </View>
      {/* Wrap this in Pressable so Admin can force Online/Offline */}
      <Pressable 
        onPress={() => onToggleStatus(staff.userId, staff.status)}
        style={[styles.statusBadge, { backgroundColor: isOnline ? theme.success + "20" : theme.textSecondary + "20" }]}
      >
        <View style={[styles.statusDot, { backgroundColor: isOnline ? theme.success : theme.textSecondary }]} />
        <ThemedText type="small" style={{ color: isOnline ? theme.success : theme.textSecondary }}>
          {isOnline ? "Online" : "Offline"}
        </ThemedText>
      </Pressable>
    </View>
  );
}
function StoreCard({ 
  store, 
  onAddStaff,
  onToggleStatus // Add this prop
}: { 
  store: StoreData; 
  onAddStaff: (storeId: string, storeName: string) => void;
  onToggleStatus: (userId: string, currentStatus: string) => void; // Add this line
}) {
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
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
          <View style={[styles.activeBadge, { backgroundColor: store.isActive ? theme.success + "20" : theme.error + "20" }]}>
            <ThemedText type="small" style={{ color: store.isActive ? theme.success : theme.error }}>
              {store.isActive ? "Active" : "Inactive"}
            </ThemedText>
          </View>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
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
        {store.codAllowed ? (
          <View style={[styles.tag, { backgroundColor: theme.success + "20" }]}>
            <ThemedText type="small" style={{ color: theme.success }}>COD</ThemedText>
          </View>
        ) : null}
      </View>

      {expanded ? (
        <>
          {pickers.length > 0 ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                PICKERS ({pickers.length})
              </ThemedText>
              {pickers.map(p => <StaffRow key={p.id} staff={p} onToggleStatus={onToggleStatus} />)}
            </>
          ) : null}

          {drivers.length > 0 ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                DRIVERS ({drivers.length})
              </ThemedText>
              {drivers.map(d => <StaffRow key={d.id} staff={d} onToggleStatus={onToggleStatus} />)}
            </>
          ) : null}

          <Pressable
            style={[styles.addStaffButton, { borderColor: theme.primary }]}
            onPress={() => onAddStaff(store.id, store.name)}
          >
            <Feather name="user-plus" size={16} color={theme.primary} />
            <ThemedText type="button" style={{ color: theme.primary }}>Add Staff</ThemedText>
          </Pressable>
        </>
      ) : null}
    </Card>
  );
}

function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const { theme } = useTheme();
  
  return (
    <Card style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <ThemedText type="h2" style={styles.metricValue}>{value}</ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary }}>{label}</ThemedText>
    </Card>
  );
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [showAddStore, setShowAddStore] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [selectedStore, setSelectedStore] = useState({ id: "", name: "" });

  const { data: metrics, isLoading, refetch, isRefetching } = useQuery<AdminMetrics>({
    queryKey: ["/api/admin/metrics"],
    refetchInterval: 30000,
  });

  const createStoreMutation = useMutation({
    mutationFn: async (data: { name: string; address: string; latitude: number; longitude: number; codAllowed: boolean }) => {
      const response = await apiRequest("POST", "/api/admin/stores", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create store");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      setShowAddStore(false);
      Alert.alert("Success", "Store created successfully");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const addStaffMutation = useMutation({
    mutationFn: async (data: { storeId: string; phone: string; email: string; role: "picker" | "driver" }) => {
      const response = await apiRequest("POST", `/api/admin/stores/${data.storeId}/staff`, {
        phone: data.phone,
        email: data.email,
        role: data.role,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add staff");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      setShowAddStaff(false);
      Alert.alert("Success", "Staff member added. They can now login with their phone or email to access their dashboard.");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
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

  const handleAddStaff = (storeId: string, storeName: string) => {
    setSelectedStore({ id: storeId, name: storeName });
    setShowAddStaff(true);
  };
  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "online" ? "offline" : "online";
    toggleStaffStatusMutation.mutate({ userId, status: nextStatus });
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
  const stores = metrics?.stores || [];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>{t.checkout.orderSummary}</ThemedText>
          <View style={styles.metricsGrid}>
            <MetricCard icon="shopping-bag" label={t.admin.totalOrders} value={orderSummary?.total || 0} color={theme.secondary} />
            <MetricCard icon="clock" label={t.orders.pending} value={orderSummary?.pending || 0} color={theme.warning} />
            <MetricCard icon="check-circle" label={t.orders.delivered} value={orderSummary?.delivered || 0} color={theme.success} />
            <MetricCard icon="x-circle" label={t.orders.cancelled} value={orderSummary?.cancelled || 0} color={theme.error} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">{t.admin.stores} ({stores.length})</ThemedText>
            <Pressable style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={() => setShowAddStore(true)}>
              <Feather name="plus" size={18} color={theme.buttonText} />
              <ThemedText type="button" style={{ color: theme.buttonText }}>Add Store</ThemedText>
            </Pressable>
          </View>

          {/* Find this section at the bottom of your file and update it */}
          {stores.map((store) => (
            <StoreCard 
              key={store.id} 
              store={store} 
              onAddStaff={handleAddStaff} 
              onToggleStatus={handleToggleStatus} // <--- ADD THIS LINE TO FIX THE ERROR
            />
          ))}

          {stores.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Feather name="home" size={48} color={theme.textSecondary} />
              <ThemedText type="h3" style={{ marginTop: Spacing.md }}>No Stores Yet</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
                Add your first store to start managing deliveries
              </ThemedText>
            </Card>
          ) : null}
        </View>

        {metrics?.timestamp ? (
          <ThemedText type="small" style={[styles.timestamp, { color: theme.textSecondary }]}>
            {t.admin.lastUpdated}: {new Date(metrics.timestamp).toLocaleTimeString()}
          </ThemedText>
        ) : null}
      </ScrollView>

      <AddStoreModal
        visible={showAddStore}
        onClose={() => setShowAddStore(false)}
        onSubmit={createStoreMutation.mutate}
        isLoading={createStoreMutation.isPending}
      />

      <AddStaffModal
        visible={showAddStaff}
        storeId={selectedStore.id}
        storeName={selectedStore.name}
        onClose={() => setShowAddStaff(false)}
        onSubmit={addStaffMutation.mutate}
        isLoading={addStaffMutation.isPending}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { marginBottom: Spacing.md },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  metricCard: { flex: 1, minWidth: "45%", alignItems: "center", padding: Spacing.md },
  metricIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: Spacing.xs },
  metricValue: { marginTop: Spacing.xs },
  addButton: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  storeCard: { marginBottom: Spacing.md, padding: Spacing.md },
  storeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  storeInfo: { flex: 1, marginRight: Spacing.md },
  activeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xs },
  divider: { height: 1, marginVertical: Spacing.md },
  statsRow: { flexDirection: "row", alignItems: "center", gap: Spacing.lg },
  statItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xs },
  sectionLabel: { marginBottom: Spacing.sm, letterSpacing: 1 },
  staffRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm },
  
  staffIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  staffInfo: { flex: 1, marginLeft: Spacing.sm },
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
  submitButton: { paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, alignItems: "center" },
});
