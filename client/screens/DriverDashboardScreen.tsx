import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, Alert, Linking, Platform, TextInput, Modal, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Location from 'expo-location';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";

const BRAND_PURPLE = "#6338f2";
const BRAND_MINT = "#10b981";

// ==================== PIN MODAL COMPONENT ====================
function PINModal({ visible, onClose, onSubmit, isLoading }: { visible: boolean; onClose: () => void; onSubmit: (pin: string) => void; isLoading: boolean; }) {
  const [pin, setPin] = useState("");
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeaderPill} />
          <MaterialCommunityIcons name="shield-check-outline" size={48} color={BRAND_PURPLE} style={{ marginBottom: 15 }} />
          <ThemedText style={styles.modalTitle}>Security Verification</ThemedText>
          <ThemedText style={styles.modalSub}>Ask customer for their 4-digit PIN</ThemedText>

          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={(text) => setPin(text.replace(/[^0-9]/g, "").slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="— — — —"
            placeholderTextColor="#cbd5e1"
            autoFocus
          />

          <View style={styles.modalActionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmBtn, pin.length !== 4 && { opacity: 0.5 }]} 
              onPress={() => onSubmit(pin)}
              disabled={pin.length !== 4 || isLoading}
            >
              {isLoading ? <ActivityIndicator color="white" /> : <ThemedText style={styles.confirmBtnText}>Complete</ThemedText>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==================== ORDER CARD COMPONENT ====================
function OrderCard({ order, onPickup, onComplete, isUpdating, disabled }: { order: any; onPickup: (id: string) => void; onComplete: (id: string) => void; isUpdating: boolean; disabled?: boolean; }) {
  const navigation = useNavigation<any>();
  const isAtStore = order.status === "packed";
  const isOnWay = order.status === "delivering";
  const isDelivered = order.status === "delivered";

  const openMaps = () => {
    const lat = order.customer_lat || order.customerLat;
    const lng = order.customer_lng || order.customerLng;
    const label = encodeURIComponent("Drop-off Point");
    const url = Platform.OS === 'ios' ? `maps://?q=${label}&ll=${lat},${lng}` : `google.navigation:q=${lat},${lng}`;
    Linking.openURL(url);
  };

  return (
    <Card style={styles.orderCard}>
      <View style={styles.cardHeader}>
        <View style={styles.idBadge}>
          <ThemedText style={styles.idText}>#{order.orderNumber || order.id.slice(0, 6).toUpperCase()}</ThemedText>
        </View>
        <View style={[styles.statusPill, { backgroundColor: isDelivered ? '#f0fdf4' : isOnWay ? '#f5f3ff' : '#fff7ed' }]}>
           <ThemedText style={[styles.statusPillText, { color: isDelivered ? BRAND_MINT : isOnWay ? BRAND_PURPLE : '#f59e0b' }]}>
             {order.status.toUpperCase()}
           </ThemedText>
        </View>
      </View>

      <View style={styles.addressBox}>
        <View style={styles.addressIndicator}>
           <View style={[styles.dot, { backgroundColor: BRAND_PURPLE }]} />
           <View style={styles.line} />
           <View style={[styles.dot, { backgroundColor: BRAND_MINT }]} />
        </View>
        <View style={styles.addressInfo}>
           <ThemedText style={styles.addressLabel}>{order.address?.label || "Customer Drop-off"}</ThemedText>
           <ThemedText style={styles.addressText} numberOfLines={2}>{order.address?.fullAddress}</ThemedText>
           {order.address?.details && (
             <View style={styles.noteBox}>
               <ThemedText style={styles.noteText}>📝 {order.address.details}</ThemedText>
             </View>
           )}
        </View>
      </View>

      <View style={styles.cardFooter}>
         <View style={styles.metaRow}>
            <View style={styles.metaItem}>
               <Feather name="package" size={14} color="#64748b" />
               <ThemedText style={styles.metaText}>{order.items?.length || 0} items</ThemedText>
            </View>
            <View style={styles.metaItem}>
               <Feather name="credit-card" size={14} color="#64748b" />
               <ThemedText style={styles.metaText}>{order.paymentMethod?.toUpperCase()}</ThemedText>
            </View>
         </View>

         {!isDelivered && (
           <View style={styles.actionRow}>
             <TouchableOpacity style={styles.utilBtn} onPress={openMaps}>
               <Feather name="navigation" size={20} color="#64748b" />
             </TouchableOpacity>
             <TouchableOpacity style={styles.utilBtn} onPress={() => navigation.navigate("Chat", { orderId: order.id })}>
               <Feather name="message-circle" size={20} color={BRAND_PURPLE} />
             </TouchableOpacity>
             
             {isAtStore ? (
               <TouchableOpacity 
                 style={[styles.mainActionBtn, { backgroundColor: BRAND_PURPLE }]} 
                 onPress={() => onPickup(order.id)}
                 disabled={isUpdating || disabled}
               >
                 {isUpdating ? <ActivityIndicator color="white" /> : <ThemedText style={styles.mainActionText}>Pick Up Order</ThemedText>}
               </TouchableOpacity>
             ) : (
               <TouchableOpacity 
                 style={[styles.mainActionBtn, { backgroundColor: BRAND_MINT }]} 
                 onPress={() => onComplete(order.id)}
               >
                 <ThemedText style={styles.mainActionText}>Enter Delivery PIN</ThemedText>
               </TouchableOpacity>
             )}
           </View>
         )}
      </View>
    </Card>
  );
}

export default function DriverDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: dashboard, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["/api/driver/dashboard", user?.id],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/dashboard?userId=${user?.id}`);
      return response.json();
    },
    refetchInterval: 5000,
  });

  const pickupMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/driver/orders/${id}/status`, { userId: user?.id, status: "delivering" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/driver/dashboard"] }),
  });

  const completeMutation = useMutation({
    mutationFn: (data: {id: string, pin: string}) => apiRequest("PUT", `/api/driver/orders/${data.id}/complete`, { userId: user?.id, deliveryPin: data.pin }),
    onSuccess: () => {
      setPinModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ["/api/driver/dashboard"] });
      Alert.alert("Success", "Delivery Completed!");
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  if (isLoading) return <ThemedView style={styles.center}><ActivityIndicator size="large" color={BRAND_PURPLE} /></ThemedView>;

  const activeOrders = dashboard?.orders?.active || [];
  const readyOrders = dashboard?.orders?.ready || [];
  const earnings = dashboard?.orders?.completed?.reduce((sum: number, o: any) => sum + o.total, 0) || 0;

  return (
    <ThemedView style={styles.container}>
      {/* HEADER WITH STATS */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topRow}>
          <View>
            <ThemedText style={styles.greeting}>Hello, {user?.username} 👋</ThemedText>
            <ThemedText style={styles.headerTitle}>Driver Dashboard</ThemedText>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Feather name="power" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
           <View style={styles.statBox}>
              <ThemedText style={styles.statVal}>{activeOrders.length + readyOrders.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Task</ThemedText>
           </View>
           <View style={styles.statDivider} />
           <View style={styles.statBox}>
              <ThemedText style={styles.statVal}>Rp {earnings.toLocaleString()}</ThemedText>
              <ThemedText style={styles.statLabel}>Today Earnings</ThemedText>
           </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <ThemedText style={styles.sectionTitle}>CURRENT SHIPMENTS</ThemedText>
        
        {[...activeOrders, ...readyOrders].map((order) => (
          <OrderCard 
            key={order.id} 
            order={order} 
            onPickup={(id) => pickupMutation.mutate(id)}
            onComplete={(id) => { setSelectedOrderId(id); setPinModalVisible(true); }}
            isUpdating={pickupMutation.isPending}
          />
        ))}

        {activeOrders.length === 0 && readyOrders.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="moped-outline" size={64} color="#e2e8f0" />
            <ThemedText style={styles.emptyText}>Waiting for new orders...</ThemedText>
          </View>
        )}
      </ScrollView>

      <PINModal 
        visible={pinModalVisible} 
        onClose={() => setPinModalVisible(false)}
        onSubmit={(pin) => selectedOrderId && completeMutation.mutate({ id: selectedOrderId, pin })}
        isLoading={completeMutation.isPending}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: 'white', padding: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  logoutBtn: { backgroundColor: '#fee2e2', padding: 10, borderRadius: 12 },
  statsCard: { flexDirection: 'row', backgroundColor: BRAND_PURPLE, borderRadius: 24, marginTop: 20, padding: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { color: 'white', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#ffffff90', fontSize: 11, marginTop: 4, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#ffffff30', marginVertical: 5 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 15, marginTop: 10 },
  orderCard: { borderRadius: 24, padding: 20, marginBottom: 15, backgroundColor: 'white' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  idBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  idText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  addressBox: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  addressIndicator: { alignItems: 'center', paddingTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 2, flex: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  addressText: { fontSize: 13, color: '#64748b', marginTop: 4 },
  noteBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, marginTop: 10 },
  noteText: { fontSize: 12, color: '#64748b' },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
  metaRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10 },
  utilBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  mainActionBtn: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mainActionText: { color: 'white', fontWeight: '800', fontSize: 14 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#94a3b8', marginTop: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, alignItems: 'center' },
  modalHeaderPill: { width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 10, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  modalSub: { fontSize: 14, color: '#64748b', marginTop: 5 },
  pinInput: { fontSize: 36, fontWeight: '800', color: BRAND_PURPLE, letterSpacing: 10, marginVertical: 30, textAlign: 'center' },
  modalActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  cancelBtnText: { fontWeight: '700', color: '#64748b' },
  confirmBtn: { flex: 2, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND_PURPLE },
  confirmBtnText: { color: 'white', fontWeight: '800' }
});