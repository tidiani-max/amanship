import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, TextInput, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

interface StoreStaff {
  id: string;
  userId: string;
  storeId: string;
  role: "picker" | "driver";
  status: "online" | "offline";
  user: { id: string; username: string; phone: string | null } | null;
}

interface Store {
  id: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
  codAllowed: boolean;
  ownerId: string;
  staff: StoreStaff[];
}

function StaffCard({ 
  staff, 
  onToggleStatus 
}: { 
  staff: StoreStaff; 
  onToggleStatus: (userId: string, currentStatus: string) => void 
}) {
  const { theme } = useTheme();
  const isOnline = staff.status === "online";

  return (
    <View style={styles.staffRow}>
      <View style={[styles.staffIcon, { backgroundColor: staff.role === "picker" ? theme.secondary + "20" : theme.primary + "20" }]}>
        <Feather 
          name={staff.role === "picker" ? "package" : "truck"} 
          size={16} 
          color={staff.role === "picker" ? theme.secondary : theme.primary} 
        />
      </View>
      <View style={styles.staffInfo}>
        <ThemedText type="body">{staff.user?.username || "Unknown"}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
        </ThemedText>
      </View>
      {/* Added Pressable for status toggle */}
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
  onToggleActive,
  onToggleStaffStatus 
}: { 
  store: Store; 
  onAddStaff: (storeId: string) => void;
  onToggleActive: (storeId: string, currentStatus: boolean) => void;
  onToggleStaffStatus: (userId: string, currentStatus: string) => void;
}) {
  const { theme } = useTheme();
  const pickers = store.staff.filter(s => s.role === "picker");
  const drivers = store.staff.filter(s => s.role === "driver");

  return (
    <Card style={styles.storeCard}>
      <View style={styles.storeHeader}>
        <View style={styles.storeInfo}>
          <ThemedText type="h3">{store.name}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>{store.address}</ThemedText>
        </View>
        {/* Made this Pressable so Owner can Open/Close store */}
        <Pressable 
          onPress={() => onToggleActive(store.id, store.isActive)}
          style={[styles.activeBadge, { backgroundColor: store.isActive ? theme.success + "20" : theme.error + "20" }]}
        >
          <ThemedText type="small" style={{ color: store.isActive ? theme.success : theme.error }}>
            {store.isActive ? "Active" : "Inactive"}
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Feather name="package" size={16} color={theme.secondary} />
          <ThemedText type="body">{pickers.filter(p => p.status === "online").length}/{pickers.length}</ThemedText>
        </View>
        <View style={styles.statItem}>
          <Feather name="truck" size={16} color={theme.primary} />
          <ThemedText type="body">{drivers.filter(d => d.status === "online").length}/{drivers.length}</ThemedText>
        </View>
      </View>

      {store.staff.length > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          {store.staff.map(staff => (
            <StaffCard key={staff.id} staff={staff} onToggleStatus={onToggleStaffStatus} />
          ))}
        </>
      )}

      <Pressable style={[styles.addStaffButton, { borderColor: theme.primary }]} onPress={() => onAddStaff(store.id)}>
        <Feather name="user-plus" size={16} color={theme.primary} />
        <ThemedText type="button" style={{ color: theme.primary }}>Add Staff</ThemedText>
      </Pressable>
    </Card>
  );
}

function AddStaffModal({ 
  visible, 
  storeId, 
  onClose, 
  onSubmit 
}: { 
  visible: boolean; 
  storeId: string; 
  onClose: () => void;
  onSubmit: (data: { storeId: string; staffUsername: string; staffPassword: string; staffPhone: string; staffRole: "picker" | "driver" }) => void;
}) {
  const { theme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"picker" | "driver">("picker");

  if (!visible) return null;

  const handleSubmit = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Username and password are required");
      return;
    }
    onSubmit({ storeId, staffUsername: username, staffPassword: password, staffPhone: phone, staffRole: role });
    setUsername("");
    setPassword("");
    setPhone("");
    setRole("picker");
  };

  return (
    <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
      <Card style={styles.modalContent}>
        <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <ThemedText type="h3">Add Staff Member</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="Username"
            placeholderTextColor={theme.textSecondary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="Phone (optional)"
            placeholderTextColor={theme.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

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
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={handleSubmit}
          >
            <ThemedText type="button" style={{ color: theme.buttonText }}>Add Staff</ThemedText>
          </Pressable>
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
}

function CreateStoreModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; address: string; latitude: number; longitude: number; codAllowed: boolean }) => void;
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
      name,
      address,
      latitude: parseFloat(latitude) || -6.2088,
      longitude: parseFloat(longitude) || 106.8456,
      codAllowed,
    });
    setName("");
    setAddress("");
  };

  return (
    <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
      <Card style={styles.modalContent}>
        <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <ThemedText type="h3">Create New Store</ThemedText>
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

          <Pressable
            style={styles.codToggle}
            onPress={() => setCodAllowed(!codAllowed)}
          >
            <View style={[styles.checkbox, codAllowed && { backgroundColor: theme.success, borderColor: theme.success }]}>
              {codAllowed ? <Feather name="check" size={14} color="#fff" /> : null}
            </View>
            <ThemedText type="body">Allow Cash on Delivery</ThemedText>
          </Pressable>

          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={handleSubmit}
          >
            <ThemedText type="button" style={{ color: theme.buttonText }}>Create Store</ThemedText>
          </Pressable>
        </KeyboardAwareScrollViewCompat>
      </Card>
    </View>
  );
}

export default function OwnerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState("");

  const { data: stores, isLoading, refetch, isRefetching } = useQuery<Store[]>({
    queryKey: ["/api/owner/stores", user?.id],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : ""}/api/owner/stores?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch stores");
      return response.json();
    },
    enabled: !!user?.id && (user?.role === "owner" || user?.role === "admin"),
    refetchInterval: 30000,
  });

  const createStoreMutation = useMutation({
    mutationFn: async (data: { name: string; address: string; latitude: number; longitude: number; codAllowed: boolean }) => {
      const response = await apiRequest("POST", "/api/owner/stores", { userId: user?.id, ...data });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create store");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stores"] });
      setShowCreateStore(false);
      Alert.alert("Success", "Store created successfully");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const addStaffMutation = useMutation({
    mutationFn: async (data: { storeId: string; staffUsername: string; staffPassword: string; staffPhone: string; staffRole: "picker" | "driver" }) => {
      const response = await apiRequest("POST", `/api/owner/stores/${data.storeId}/staff`, {
        userId: user?.id,
        staffUsername: data.staffUsername,
        staffPassword: data.staffPassword,
        staffPhone: data.staffPhone,
        staffRole: data.staffRole,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add staff");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stores"] });
      setShowAddStaff(false);
      Alert.alert("Success", "Staff member added successfully");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

// Mutation to toggle Store Active/Inactive
  const toggleStoreMutation = useMutation({
    mutationFn: async ({ storeId, isActive }: { storeId: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/stores/${storeId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stores"] });
    },
  });

  // Mutation to toggle Staff Online/Offline
  const toggleStaffMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return await apiRequest("PATCH", "/api/staff/status", { userId, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stores"] });
    },
  });

  // Helper functions
  const handleToggleStore = (storeId: string, current: boolean) => {
    toggleStoreMutation.mutate({ storeId, isActive: !current });
  };

  const handleToggleStaff = (userId: string, current: string) => {
    const nextStatus = current === "online" ? "offline" : "online";
    toggleStaffMutation.mutate({ userId, status: nextStatus });
  };

  const handleAddStaff = (storeId: string) => {
    setSelectedStoreId(storeId);
    setShowAddStaff(true);
  };

  if (!user || (user.role !== "owner" && user.role !== "admin" && user.role !== "customer")) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="lock" size={48} color={theme.error} />
          <ThemedText type="h3" style={{ marginTop: Spacing.md }}>Access Denied</ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
            You need to be a store owner to access this dashboard.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
          Loading your stores...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        <View style={styles.header}>
          <View>
            <ThemedText type="h2">Your Stores</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {stores?.length || 0} store{(stores?.length || 0) !== 1 ? "s" : ""} registered
            </ThemedText>
          </View>
          <Pressable
            style={[styles.createButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowCreateStore(true)}
          >
            <Feather name="plus" size={20} color={theme.buttonText} />
            <ThemedText type="button" style={{ color: theme.buttonText }}>New Store</ThemedText>
          </Pressable>
        </View>

        {stores && stores.length > 0 ? (
          stores.map(store => (
            <StoreCard 
              key={store.id} 
              store={store} 
              onAddStaff={handleAddStaff} 
              onToggleActive={handleToggleStore}
              onToggleStaffStatus={handleToggleStaff}
            />
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Feather name="home" size={48} color={theme.textSecondary} />
            <ThemedText type="h3" style={{ marginTop: Spacing.md }}>No Stores Yet</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              Create your first store to start managing your delivery business.
            </ThemedText>
          </Card>
        )}
      </ScrollView>

      <AddStaffModal
        visible={showAddStaff}
        storeId={selectedStoreId}
        onClose={() => setShowAddStaff(false)}
        onSubmit={addStaffMutation.mutate}
      />

      <CreateStoreModal
        visible={showCreateStore}
        onClose={() => setShowCreateStore(false)}
        onSubmit={createStoreMutation.mutate}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  scrollContent: { paddingHorizontal: Spacing.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  createButton: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
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
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { width: "90%", maxWidth: 400, padding: Spacing.lg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  input: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, marginBottom: Spacing.md, fontSize: 16 },
  coordRow: { flexDirection: "row", gap: Spacing.md },
  coordInput: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, marginBottom: Spacing.md, fontSize: 16 },
  roleSelector: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.lg },
  roleButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingVertical: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.sm, borderColor: "#ccc" },
  codToggle: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.lg },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: "#ccc", justifyContent: "center", alignItems: "center" },
  submitButton: { paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, alignItems: "center" },
});
