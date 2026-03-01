// PickerDashboardScreen.tsx — Matched Driver colors + Delivery Timer System
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  View, StyleSheet, ScrollView, RefreshControl,
  Pressable, TextInput, Modal, Image, TouchableOpacity,
  ActivityIndicator, Alert, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { getImageUrl } from "@/lib/image-url";
import { Spacing } from "@/constants/theme";
import { OrderReceipt } from "@/components/OrderReceipt";
import { StaffEarningsDashboard } from "@/components/StaffEarningsDashboard";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN!;

// ── Brand colors — identical to DriverDashboardScreen ────────────────────────
const BRAND_PURPLE = "#6338f2";
const BRAND_MINT   = "#10b981";

// ── Delivery time budget per phase (seconds) ──────────────────────────────────
// Total 15-min target: 2 min confirm → 7 min pick → 3 min packed → 3 min driver
const PHASE_BUDGETS: Record<string, number> = {
  pending: 120,  // 2 min — confirm & start picking
  picking: 420,  // 7 min — pick all items
  packed:  180,  // 3 min — wait for driver
};
const TOTAL_BUDGET = 900; // 15 min total

// ==================== INTERFACES ====================

interface Category    { id: string; name: string }
interface InventoryItem {
  id: string; productId: string; stockCount: number; location?: string; categoryId?: string;
  product: {
    id: string; name: string; brand: string; costPrice: number; price: number;
    originalPrice?: number; description?: string; image?: string;
    category?: { name: string };
  };
}
interface Promotion {
  id: string; title: string; description: string; type: string;
  discountValue: number; minOrder: number; validUntil: string;
  isActive: boolean; showInBanner: boolean; usedCount: number;
  createdAt: string; image?: string | null;
}

// ==================== PHASE TIMER BADGE ====================

function TimerBadge({ createdAt, status }: { createdAt: string; status: string }) {
  const [elapsed, setElapsed] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick  = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  const budget    = PHASE_BUDGETS[status] ?? 120;
  const remaining = budget - elapsed;
  const isLate    = remaining < 0;
  const isCritical= remaining >= 0 && remaining < 60;
  const color     = isLate ? "#ef4444" : isCritical ? "#f59e0b" : BRAND_MINT;
  const progress  = Math.max(0, Math.min(1, Math.abs(remaining) / budget));
  const m         = Math.floor(Math.abs(remaining) / 60);
  const s         = Math.abs(remaining) % 60;

  useEffect(() => {
    if (isCritical || isLate) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
  }, [isCritical, isLate]);

  const label =
    status === "pending" ? "Confirm & start picking" :
    status === "picking" ? "Finish packing"          :
    status === "packed"  ? "Driver pickup window"    : "Time remaining";

  return (
    <Animated.View style={[timerS.wrap, { borderColor: color + "40", backgroundColor: color + "0d", transform: [{ scale: pulse }] }]}>
      <View style={timerS.row}>
        <Feather name={isLate ? "alert-circle" : "clock"} size={13} color={color} />
        <ThemedText style={[timerS.label, { color }]}>{label}</ThemedText>
        <ThemedText style={[timerS.time, { color }]}>{isLate ? "+" : ""}{m}:{s.toString().padStart(2,"0")}</ThemedText>
      </View>
      <View style={timerS.barBg}>
        <View style={[timerS.barFill, { width: `${isLate ? 100 : (1 - progress) * 100}%`, backgroundColor: color }]} />
      </View>
      {(isLate || isCritical) && (
        <ThemedText style={[timerS.urgency, { color }]}>
          {isLate ? "⚠️ Phase overdue — speed up!" : "⏰ Under 1 minute left!"}
        </ThemedText>
      )}
    </Animated.View>
  );
}

const timerS = StyleSheet.create({
  wrap:    { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 10, marginBottom: 2 },
  row:     { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  label:   { flex: 1, fontSize: 11, fontWeight: "600", marginLeft: 6 },
  time:    { fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
  barBg:   { height: 4, borderRadius: 2, backgroundColor: "#e2e8f0", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
  urgency: { fontSize: 11, fontWeight: "700", marginTop: 4 },
});

// ==================== TOTAL 15-MIN TIMER ====================

function TotalOrderTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick  = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  const remaining = TOTAL_BUDGET - elapsed;
  const isLate    = remaining < 0;
  const pct       = Math.min(100, (elapsed / TOTAL_BUDGET) * 100);
  const color     = isLate ? "#ef4444" : elapsed > 720 ? "#f59e0b" : BRAND_PURPLE;
  const m         = Math.floor(Math.abs(remaining) / 60);
  const s         = Math.abs(remaining) % 60;

  return (
    <View style={[totalS.wrap, { borderColor: color + "30", backgroundColor: color + "08" }]}>
      <View style={totalS.row}>
        <Feather name="target" size={14} color={color} />
        <ThemedText style={[totalS.title, { color }]}>15-Minute Delivery Target</ThemedText>
        <View style={[totalS.badge, { backgroundColor: color }]}>
          <ThemedText style={totalS.badgeText}>{isLate ? "+" : ""}{m}:{s.toString().padStart(2,"0")}</ThemedText>
        </View>
      </View>
      <View style={totalS.barBg}>
        <View style={[totalS.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <ThemedText style={[totalS.sub, { color: color + "cc" }]}>
        {isLate ? `Order is ${m}m ${s}s past the 15-min target` : `${m}m ${s}s remaining to hit target`}
      </ThemedText>
    </View>
  );
}

const totalS = StyleSheet.create({
  wrap:      { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  row:       { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  title:     { flex: 1, fontSize: 13, fontWeight: "700", marginLeft: 8 },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: "white", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  barBg:     { height: 6, borderRadius: 3, backgroundColor: "#e2e8f0", overflow: "hidden", marginBottom: 6 },
  barFill:   { height: "100%", borderRadius: 3 },
  sub:       { fontSize: 11, fontWeight: "600" },
});

// ==================== ORDER CARD ====================

function OrderCard({ order, onUpdateStatus, storeName, userId }: {
  order: any; onUpdateStatus: (id: string, next: string) => void;
  storeName: string; userId: string;
}) {
  const { theme } = useTheme();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const status    = order?.status || "pending";
  const total     = order?.total ? Number(order.total).toLocaleString() : "0";
  const createdAt = order?.createdAt || new Date().toISOString();

  let btnText = "Start Picking", nextStatus = "picking", icon: any = "package";
  if (status === "picking") { btnText = "Mark as Packed"; nextStatus = "packed"; icon = "check-circle"; }
  else if (status === "packed") { btnText = "Waiting for Driver"; nextStatus = ""; icon = "truck"; }

  const customer   = { name: order.customerName || "Customer", phone: order.customerPhone, email: order.customerEmail };
  const toggleCheck= (pid: string) => { const s = new Set(checked); s.has(pid) ? s.delete(pid) : s.add(pid); setChecked(s); };
  const progress   = Array.isArray(order.items) ? Math.round((checked.size / order.items.length) * 100) : 0;
  const statusColor= status === "picking" ? BRAND_PURPLE : status === "packed" ? BRAND_MINT : "#f59e0b";

  return (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.orderNumber}>{order.orderNumber || order.id.slice(0,8).toUpperCase()}</ThemedText>
          <View style={[styles.statusPill, { backgroundColor: statusColor + "15" }]}>
            <View style={[styles.statusDotSm, { backgroundColor: statusColor }]} />
            <ThemedText style={[styles.statusLabel, { color: statusColor }]}>{status.toUpperCase()}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.orderPrice}>Rp {total}</ThemedText>
      </View>

      <TotalOrderTimer createdAt={createdAt} />
      <TimerBadge     createdAt={createdAt} status={status} />

      {order.aiOptimized && (
        <View style={[styles.aiBanner, { backgroundColor: BRAND_MINT + "15", borderColor: BRAND_MINT + "30" }]}>
          <Feather name="zap" size={18} color={BRAND_MINT} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <ThemedText style={{ color: BRAND_MINT, fontWeight: "700", fontSize: 13 }}>
              🤖 AI Optimised — Pick in {order.estimatedPickTime}
            </ThemedText>
            <ThemedText style={{ color: "#059669", fontSize: 11, marginTop: 2 }}>
              Save {order.timeSavings}{order.freshItemsCount > 0 && ` · ${order.freshItemsCount} fresh items prioritised`}
            </ThemedText>
          </View>
        </View>
      )}

      {status === "picking" && (
        <View style={{ marginTop: 12, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600" }}>Picking Progress</ThemedText>
            <ThemedText type="caption" style={{ color: BRAND_PURPLE, fontWeight: "700" }}>{checked.size}/{order.items?.length || 0} ({progress}%)</ThemedText>
          </View>
          <View style={[styles.progressBar, { backgroundColor: "#e2e8f0" }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progress === 100 ? BRAND_MINT : BRAND_PURPLE }]} />
          </View>
        </View>
      )}

      {Array.isArray(order.items) && order.items.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <ThemedText type="body" style={{ fontWeight: "700", marginBottom: 10, color: theme.text }}>📋 Pick Items in This Order:</ThemedText>
          {order.items.map((item: any, idx: number) => {
            const isChecked  = checked.has(item.productId);
            const isPriority = item.priority === "HIGH";
            return (
              <Pressable key={idx} onPress={() => toggleCheck(item.productId)}
                style={[styles.pickCard, {
                  backgroundColor: isChecked ? BRAND_MINT + "15" : isPriority ? "#fef3c7" : "#f8fafc",
                  borderColor:     isChecked ? BRAND_MINT : isPriority ? "#f59e0b" : "#e2e8f0",
                }]}>
                <View style={[styles.pickBadge, { backgroundColor: isChecked ? BRAND_MINT : isPriority ? "#f59e0b" : BRAND_PURPLE }]}>
                  {isChecked ? <Feather name="check" size={16} color="white" /> : <ThemedText style={styles.pickNum}>{item.pickOrder || idx + 1}</ThemedText>}
                </View>
                <Image source={{ uri: getImageUrl(item.image) }} style={[styles.pickImg, isChecked && { opacity: 0.5 }]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ThemedText type="body" style={[{ fontWeight: "600", flex: 1 }, isChecked && { textDecorationLine: "line-through", opacity: 0.5 }]}>
                      {item.name}
                    </ThemedText>
                    {isPriority && !isChecked && (
                      <View style={[styles.priorityBadge, { backgroundColor: "#f59e0b" }]}>
                        <ThemedText style={{ color: "white", fontSize: 9, fontWeight: "800" }}>PRIORITY</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    📍 {item.location || "N/A"} · Qty: {item.quantity}
                  </ThemedText>
                  {item.freshnessNote && !isChecked && (
                    <View style={[styles.freshnessNote, { backgroundColor: "#dbeafe" }]}>
                      <Feather name="alert-circle" size={11} color="#2563eb" />
                      <ThemedText style={{ fontSize: 10, color: "#2563eb", marginLeft: 4, fontWeight: "600" }}>{item.freshnessNote}</ThemedText>
                    </View>
                  )}
                </View>
                <View style={[styles.checkCircle, { borderColor: isChecked ? BRAND_MINT : "#cbd5e1", backgroundColor: isChecked ? BRAND_MINT : "transparent" }]}>
                  {isChecked && <Feather name="check" size={14} color="white" />}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <OrderReceipt
        order={{ id: order.id, orderNumber: order.orderNumber || `ORD-${order.id.slice(0,8)}`, total: order.total || 0, deliveryFee: order.deliveryFee || 10000, createdAt: order.createdAt || new Date().toISOString(), items: order.items || [] }}
        customer={customer}
        storeName={storeName}
      />

      {nextStatus !== "" && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: status === "picking" && progress === 100 ? BRAND_MINT : BRAND_PURPLE }]}
          onPress={() => onUpdateStatus(order.id, nextStatus)}
        >
          <Feather name={icon} size={16} color="white" />
          <ThemedText style={styles.actionBtnText}>{status === "picking" ? `${btnText} (${progress}%)` : btnText}</ThemedText>
        </TouchableOpacity>
      )}
    </Card>
  );
}

// ==================== PRE-STAGING WIDGET ====================

export const PreStagingWidget: React.FC<{ userId: string }> = ({ userId }) => {
  const [recs, setRecs] = useState<any>(null);
  const { theme } = useTheme();
  useEffect(() => {
    const go = async () => { try { const r = await fetch(`${BASE_URL}/api/picker/pre-staging-recommendations?userId=${userId}`); setRecs(await r.json()); } catch {} };
    go(); const id = setInterval(go, 30 * 60 * 1000); return () => clearInterval(id);
  }, [userId]);
  if (!recs || !recs.recommendations?.length) return null;
  return (
    <Card style={{ marginBottom: 15 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Feather name="zap" size={20} color="#f59e0b" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <ThemedText style={{ fontWeight: "700", fontSize: 15 }}>🧠 AI Pre-Staging Alert</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>{recs.timeContext}</ThemedText>
        </View>
      </View>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 10 }}>{recs.message}</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {recs.recommendations.map((rec: any, i: number) => (
          <View key={i} style={{ width: 100, padding: 10, borderRadius: 10, marginRight: 10, alignItems: "center", backgroundColor: theme.backgroundTertiary }}>
            <Image source={{ uri: getImageUrl(rec.product.image) }} style={{ width: 60, height: 60, borderRadius: 8 }} />
            <ThemedText type="caption" style={{ fontWeight: "600", marginTop: 6 }}>{rec.product.name}</ThemedText>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6, backgroundColor: rec.confidenceLevel === "HIGH" ? BRAND_MINT : "#f59e0b" }}>
              <ThemedText style={{ color: "white", fontSize: 9, fontWeight: "800" }}>{Math.round(rec.probability * 100)}% likely</ThemedText>
            </View>
          </View>
        ))}
      </ScrollView>
    </Card>
  );
};

// ==================== AI COACH WIDGET ====================

export const AICoachWidget: React.FC<{ userId: string }> = ({ userId }) => {
  const [coaching, setCoaching] = useState<any>(null);
  const { theme } = useTheme();
  useEffect(() => {
    const go = async () => { try { const r = await fetch(`${BASE_URL}/api/picker/ai-coach?userId=${userId}`); setCoaching(await r.json()); } catch {} };
    go(); const id = setInterval(go, 15 * 60 * 1000); return () => clearInterval(id);
  }, [userId]);
  if (!coaching) return null;
  return (
    <Card style={{ marginBottom: 15 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Feather name="trending-up" size={20} color={BRAND_PURPLE} />
        <ThemedText style={{ fontWeight: "700", fontSize: 15, marginLeft: 10 }}>📊 AI Performance Coach</ThemedText>
      </View>
      {coaching.achievements?.map((a: string, i: number) => (
        <View key={i} style={{ backgroundColor: "#fef3c7", padding: 10, borderRadius: 8, marginBottom: 6 }}>
          <ThemedText style={{ fontSize: 13 }}>{a}</ThemedText>
        </View>
      ))}
      <View style={{ padding: 12, borderRadius: 10, marginBottom: 12, backgroundColor: BRAND_PURPLE + "15" }}>
        <ThemedText style={{ fontWeight: "700", marginBottom: 8, color: BRAND_PURPLE }}>🚀 Your Potential Today:</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>Current: {coaching.potential?.currentSpeed} → Possible: {coaching.potential?.potentialSpeed}</ThemedText>
        <ThemedText type="caption" style={{ color: BRAND_MINT, fontWeight: "700", marginTop: 4 }}>Extra earnings: {coaching.potential?.extraBonus}</ThemedText>
      </View>
      <ThemedText style={{ fontWeight: "600", marginBottom: 8 }}>💡 AI Tips:</ThemedText>
      {coaching.tips?.slice(0, 3).map((tip: string, i: number) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
          <Feather name="chevron-right" size={14} color={BRAND_PURPLE} />
          <ThemedText type="caption" style={{ flex: 1, marginLeft: 8 }}>{tip}</ThemedText>
        </View>
      ))}
      {coaching.nextMilestone?.ordersUntilBonus > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, backgroundColor: "#fef3c7" }}>
          <Feather name="target" size={16} color="#f59e0b" />
          <ThemedText style={{ marginLeft: 8, color: "#92400e", fontWeight: "600" }}>{coaching.nextMilestone.message}</ThemedText>
        </View>
      )}
    </Card>
  );
};

// ==================== PROMOTION CARD ====================

const PromotionCard: React.FC<{
  promotion: Promotion; onEdit: (p: Promotion) => void;
  onDelete: (id: string) => void; onToggleActive: (id: string, v: boolean) => void;
}> = ({ promotion, onEdit, onDelete, onToggleActive }) => {
  const { theme } = useTheme();
  return (
    <Card style={[styles.promoCard, !promotion.isActive && { opacity: 0.6 }]}>
      {promotion.image && <Image source={{ uri: getImageUrl(promotion.image) }} style={styles.promoImg} resizeMode="cover" />}
      <View style={styles.promoHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText type="h3">{promotion.title}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>{promotion.description}</ThemedText>
        </View>
        <View style={[styles.activeBadge, { backgroundColor: promotion.isActive ? BRAND_MINT + "20" : "#fee2e220" }]}>
          <ThemedText style={{ color: promotion.isActive ? BRAND_MINT : "#ef4444", fontSize: 12, fontWeight: "600" }}>
            {promotion.isActive ? "Active" : "Inactive"}
          </ThemedText>
        </View>
      </View>
      <View style={{ marginBottom: 12 }}>
        {[
          { icon: "percent",      text: promotion.type === "percentage" ? `${promotion.discountValue}% off` : `Rp ${promotion.discountValue} off` },
          { icon: "shopping-bag", text: `Min order: Rp ${promotion.minOrder.toLocaleString()}` },
          { icon: "calendar",     text: `Until: ${new Date(promotion.validUntil).toLocaleDateString()}` },
          { icon: "users",        text: `Used: ${promotion.usedCount} times` },
        ].map(({ icon, text }, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Feather name={icon as any} size={16} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: 6 }}>{text}</ThemedText>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TouchableOpacity style={[styles.promoActionBtn, { backgroundColor: BRAND_PURPLE + "15" }]} onPress={() => onEdit(promotion)}>
          <Feather name="edit-2" size={18} color={BRAND_PURPLE} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.promoActionBtn, { backgroundColor: "#f59e0b15" }]} onPress={() => onToggleActive(promotion.id, !promotion.isActive)}>
          <Feather name={promotion.isActive ? "eye-off" : "eye"} size={18} color="#f59e0b" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.promoActionBtn, { backgroundColor: "#ef444415" }]} onPress={() => onDelete(promotion.id)}>
          <Feather name="trash-2" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

// ==================== INVENTORY ROW ====================

function InventoryItemRow({ item, onEdit, onDelete }: { item: InventoryItem; onEdit: (i: InventoryItem) => void; onDelete: (id: string) => void }) {
  return (
    <View style={styles.invRow}>
      <Image source={{ uri: getImageUrl(item.product.image) }} style={styles.invImg} />
      <View style={styles.invInfo}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>{item.product.name}</ThemedText>
        <ThemedText type="caption">Stock: {item.stockCount} | Cost: Rp {item.product.costPrice?.toLocaleString() || "?"} → Sell: Rp {item.product.price.toLocaleString()}</ThemedText>
      </View>
      <TouchableOpacity style={{ padding: 8, marginRight: 4 }} onPress={() => onDelete(item.id)}><Feather name="trash-2" size={18} color="#ef4444" /></TouchableOpacity>
      <TouchableOpacity style={{ padding: 8, borderRadius: 8, backgroundColor: BRAND_PURPLE + "15" }} onPress={() => onEdit(item)}><Feather name="edit-2" size={16} color={BRAND_PURPLE} /></TouchableOpacity>
    </View>
  );
}

// ==================== ALERT MODAL ====================

function CustomAlertModal({ visible, title, message, onClose }: { visible: boolean; title: string; message: string; onClose: () => void }) {
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.alertOverlay} onPress={onClose}>
        <View style={styles.alertBox}>
          <ThemedText type="h3" style={styles.alertTitle}>{title}</ThemedText>
          <ThemedText style={styles.alertMessage}>{message}</ThemedText>
          <TouchableOpacity style={[styles.alertBtn, { backgroundColor: BRAND_PURPLE }]} onPress={onClose}>
            <ThemedText style={styles.alertBtnText}>Close</ThemedText>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ==================== MAIN SCREEN ====================

export default function PickerDashboardScreen() {
  const insets      = useSafeAreaInsets();
  const { theme }   = useTheme();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigation  = useNavigation<any>();

  const [activeTab,  setActiveTab]  = useState<"orders"|"inventory"|"promotions">("orders");
  const [searchQuery,setSearchQuery]= useState("");
  const [modalVisible,      setModalVisible]       = useState(false);
  const [promoModalVisible, setPromoModalVisible]   = useState(false);
  const [deleteModalVisible,setDeleteModalVisible]  = useState(false);
  const [alertVisible,      setAlertVisible]        = useState(false);
  const [alertTitle,        setAlertTitle]           = useState("");
  const [alertMessage,      setAlertMessage]         = useState("");
  const [itemToDelete,      setItemToDelete]         = useState<string|null>(null);

  // Inventory form
  const [isEditing,        setIsEditing]       = useState(false);
  const [selectedInvId,    setSelectedInvId]   = useState<string|null>(null);
  const [formName,         setFormName]         = useState("");
  const [formBrand,        setFormBrand]        = useState("");
  const [formDescription,  setFormDescription]  = useState("");
  const [formCostPrice,    setFormCostPrice]    = useState("");
  const [formOriginalPrice,setFormOriginalPrice]= useState("");
  const [formStock,        setFormStock]        = useState("");
  const [formLocation,     setFormLocation]     = useState("");
  const [formCategoryId,   setFormCategoryId]   = useState<string|null>(null);
  const [formImage,        setFormImage]        = useState<string|null>(null);
  const [imageChanged,     setImageChanged]     = useState(false);

  // Promo form
  const [isEditingPromo,   setIsEditingPromo]   = useState(false);
  const [selectedPromoId,  setSelectedPromoId]  = useState<string|null>(null);
  const [promoTitle,       setPromoTitle]        = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [promoType,        setPromoType]         = useState<"percentage"|"fixed_amount">("percentage");
  const [promoDiscount,    setPromoDiscount]     = useState("");
  const [promoMinOrder,    setPromoMinOrder]     = useState("");
  const [promoValidUntil,  setPromoValidUntil]   = useState(new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0]);
  const [promoInBanner,    setPromoInBanner]     = useState(false);
  const [promoImage,       setPromoImage]        = useState<string|null>(null);
  const [promoImageChanged,setPromoImageChanged] = useState(false);

  const showAlert = useCallback((t: string, m: string) => { setAlertTitle(t); setAlertMessage(m); setAlertVisible(true); }, []);
  const handleLogout = useCallback(() => {
    Alert.alert("Logout","Are you sure?",[{ text:"Cancel",style:"cancel"},{ text:"Logout",style:"destructive",onPress:async()=>await logout()}]);
  }, [logout]);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey:["/api/categories"],
    queryFn: async () => { const r = await fetch(`${BASE_URL}/api/categories`); const j = await r.json(); return Array.isArray(j)?j:Array.isArray(j.categories)?j.categories:Array.isArray(j.data)?j.data:[]; },
  });
  const { data: inventory, isLoading: invLoading, refetch: refetchInv } = useQuery<InventoryItem[]>({
    queryKey:["/api/picker/inventory",user?.id],
    queryFn: async () => { const r = await fetch(`${BASE_URL}/api/picker/inventory?userId=${user?.id||"demo"}`); return r.json(); },
    refetchInterval: 10000,
  });
  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } = useQuery({
    queryKey:["/api/picker/dashboard",user?.id],
    queryFn: async () => { const r = await fetch(`${BASE_URL}/api/picker/dashboard?userId=${user?.id||"demo"}`); return r.json(); },
    refetchInterval: 3000, notifyOnChangeProps:["data"],
  });
  const { data: promotions=[], isLoading: promoLoading, refetch: refetchPromos } = useQuery<Promotion[]>({
    queryKey:["/api/picker/promotions",user?.id],
    queryFn: async () => { const r = await fetch(`${BASE_URL}/api/picker/promotions?userId=${user?.id}`); if(!r.ok)throw new Error("Failed"); return r.json(); },
    enabled:!!user?.id,
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const createPromoMutation  = useMutation({ mutationFn:async(fd:FormData)=>{const r=await fetch(`${BASE_URL}/api/picker/promotions`,{method:"POST",body:fd});if(!r.ok)throw new Error("Failed");return r.json();}, onSuccess:()=>{queryClient.invalidateQueries({queryKey:["/api/picker/promotions"]});refetchPromos();setPromoModalVisible(false);showAlert("Success","Promotion created!");resetPromoForm();}, onError:()=>showAlert("Error","Failed to create") });
  const updatePromoMutation  = useMutation({ mutationFn:async({id,fd}:{id:string;fd:FormData})=>{const r=await fetch(`${BASE_URL}/api/picker/promotions/${id}`,{method:"PATCH",body:fd});if(!r.ok)throw new Error("Failed");return r.json();}, onSuccess:()=>{queryClient.invalidateQueries({queryKey:["/api/picker/promotions"]});refetchPromos();setPromoModalVisible(false);showAlert("Success","Updated!");resetPromoForm();}, onError:()=>showAlert("Error","Failed to update") });
  const deletePromoMutation  = useMutation({ mutationFn:async(id:string)=>{const r=await fetch(`${BASE_URL}/api/picker/promotions/${id}?userId=${user?.id}`,{method:"DELETE"});if(!r.ok)throw new Error("Failed");return r.json();}, onSuccess:()=>{queryClient.invalidateQueries({queryKey:["/api/picker/promotions"]});showAlert("Success","Deleted!");}, onError:()=>showAlert("Error","Failed to delete") });
  const togglePromoMutation  = useMutation({ mutationFn:async({id,isActive}:{id:string;isActive:boolean})=>{const r=await fetch(`${BASE_URL}/api/picker/promotions/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user?.id,isActive})});if(!r.ok)throw new Error("Failed");return r.json();}, onSuccess:()=>queryClient.invalidateQueries({queryKey:["/api/picker/promotions"]}), onError:()=>showAlert("Error","Failed to toggle") });

  // ── Promo helpers ────────────────────────────────────────────────────────
  const resetPromoForm = () => { setPromoTitle("");setPromoDescription("");setPromoType("percentage");setPromoDiscount("");setPromoMinOrder("");setPromoValidUntil(new Date(Date.now()+30*24*60*60*1000).toISOString().split("T")[0]);setPromoInBanner(false);setSelectedPromoId(null);setIsEditingPromo(false);setPromoImage(null);setPromoImageChanged(false); };
  const openPromoModal = (p?: Promotion) => {
    if (p) { setIsEditingPromo(true);setSelectedPromoId(p.id);setPromoTitle(p.title);setPromoDescription(p.description);setPromoType(p.type as any);setPromoDiscount(p.discountValue.toString());setPromoMinOrder(p.minOrder.toString());setPromoValidUntil(new Date(p.validUntil).toISOString().split("T")[0]);setPromoInBanner(p.showInBanner);setPromoImage(p.image||null);setPromoImageChanged(false); }
    else resetPromoForm();
    setPromoModalVisible(true);
  };
  const pickPromoImg = async () => { const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[16,9],quality:0.8}); if(!r.canceled&&r.assets[0]){setPromoImage(r.assets[0].uri);setPromoImageChanged(true);} };
  const appendImg = (fd: FormData, uri: string, key: string) => { const fn=uri.split("/").pop()||"img.jpg"; const m=/\.(\w+)$/.exec(fn); fd.append(key,{uri,name:fn,type:m?`image/${m[1]}`:"image/jpeg"} as any); };
  const handleSavePromo = async () => {
    if (!promoTitle.trim())             { showAlert("Error","Enter a title"); return; }
    if (!promoDiscount||Number(promoDiscount)<=0){ showAlert("Error","Enter valid discount"); return; }
    const fd=new FormData(); fd.append("userId",user?.id||"");fd.append("title",promoTitle.trim());fd.append("description",promoDescription.trim());fd.append("type",promoType);fd.append("discountValue",promoDiscount);fd.append("minOrder",promoMinOrder||"0");fd.append("validUntil",promoValidUntil);fd.append("showInBanner",promoInBanner.toString());
    if(promoImage&&promoImageChanged)appendImg(fd,promoImage,"image");
    if(isEditingPromo&&selectedPromoId)updatePromoMutation.mutate({id:selectedPromoId,fd}); else createPromoMutation.mutate(fd);
  };
  const handleDeletePromo = (id: string) => { Alert.alert("Delete","Are you sure?",[{text:"Cancel",style:"cancel"},{text:"Delete",style:"destructive",onPress:()=>deletePromoMutation.mutate(id)}]); };

  // ── Inventory helpers ────────────────────────────────────────────────────
  const pickImage = async () => { const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:0.7}); if(!r.canceled&&r.assets[0]){setFormImage(r.assets[0].uri);setImageChanged(true);} };
  const openEditModal = (item?: InventoryItem) => {
    if (item) { setIsEditing(true);setSelectedInvId(item.id);setFormName(item.product.name);setFormBrand(item.product.brand||"");setFormDescription(item.product.description||"");setFormCostPrice(item.product.costPrice?.toString()||"");setFormOriginalPrice(item.product.originalPrice?.toString()||"");setFormStock(item.stockCount.toString());setFormLocation(item.location??"");setFormCategoryId(item.categoryId||null);setFormImage(item.product.image??null);setImageChanged(false); }
    else { setIsEditing(false);setSelectedInvId(null);setFormName("");setFormBrand("");setFormDescription("");setFormCostPrice("");setFormOriginalPrice("");setFormStock("");setFormLocation("");setFormCategoryId(null);setFormImage(null);setImageChanged(false); }
    setModalVisible(true);
  };
  const handleSaveProduct = async () => {
    if(!user?.id)                {showAlert("Error","Not logged in");return;}
    if(!formCategoryId)          {showAlert("Category Required","Select a category");return;}
    if(!formName.trim())         {showAlert("Name Required","Enter product name");return;}
    if(!formCostPrice.trim()||isNaN(Number(formCostPrice))||Number(formCostPrice)<=0){showAlert("Invalid Cost","Enter what you paid supplier (> 0)");return;}
    if(!formStock.trim()||isNaN(Number(formStock))||Number(formStock)<0){showAlert("Invalid Stock","Enter valid stock quantity");return;}
    const fd=new FormData(); fd.append("userId",user.id);fd.append("name",formName.trim());fd.append("brand",formBrand.trim()||"Generic");fd.append("description",formDescription.trim()||"");fd.append("costPrice",formCostPrice.trim());fd.append("stock",formStock.trim());fd.append("location",formLocation.trim()||"");fd.append("categoryId",formCategoryId!);
    if(formOriginalPrice.trim())fd.append("originalPrice",formOriginalPrice.trim());
    if(isEditing&&selectedInvId)fd.append("inventoryId",selectedInvId);
    if(formImage&&imageChanged)appendImg(fd,formImage,"image");
    try {
      const url=isEditing?`${BASE_URL}/api/picker/inventory/update`:`${BASE_URL}/api/picker/inventory`;
      const res=await fetch(url,{method:"POST",body:fd});
      const result=await res.json();
      if(res.ok){setModalVisible(false);await queryClient.invalidateQueries({queryKey:["/api/picker/inventory"]});await queryClient.refetchQueries({queryKey:["/api/picker/inventory",user?.id]});showAlert("Success",isEditing?"Updated!":"Product Added!");setFormName("");setFormBrand("");setFormDescription("");setFormCostPrice("");setFormOriginalPrice("");setFormStock("");setFormLocation("");setFormCategoryId(null);setFormImage(null);setImageChanged(false);}
      else showAlert("Error",result.error||"Save failed");
    } catch { showAlert("Error","Network error"); }
  };
  const handleDeleteProduct = (id: string) => { setItemToDelete(id); setDeleteModalVisible(true); };
  const confirmDelete = async () => {
    if(!itemToDelete)return;
    try { const r=await fetch(`${BASE_URL}/api/picker/inventory/${itemToDelete}?userId=${user?.id}`,{method:"DELETE"}); if(r.ok){await queryClient.invalidateQueries({queryKey:["/api/picker/inventory"]});await queryClient.refetchQueries({queryKey:["/api/picker/inventory",user?.id]});showAlert("Success","Item removed");}else showAlert("Error","Delete failed"); }
    catch{showAlert("Error","Network error");}finally{setDeleteModalVisible(false);setItemToDelete(null);}
  };
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    if(!user?.id)return;
    const url=nextStatus==="picking"?`${BASE_URL}/api/orders/${orderId}/take`:`${BASE_URL}/api/orders/${orderId}/pack`;
    const body=nextStatus==="picking"?{userId:user.id,role:"picker"}:{userId:user.id};
    const res=await fetch(url,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!res.ok){const err=await res.json();showAlert("Error",err.error||"Update failed");return;}
    queryClient.invalidateQueries({queryKey:["/api/picker/dashboard",user?.id]});
  };

  const onRefresh = async () => { await Promise.all([refetchInv(),refetchDash(),refetchPromos()]); };

  const ordersToDisplay = useMemo(() => {
    if(!dashboard?.orders)return[];
    return [...(dashboard.orders.pending||[]),(dashboard.orders.active||[]),(dashboard.orders.packed||[])].flat()
      .sort((a:any,b:any)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
  }, [dashboard]);

  const filteredInventory = useMemo(() => {
    if(!inventory)return[];
    return inventory.filter(i=>i.product.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [inventory, searchQuery]);

  const calculatedSellingPrice = useMemo(() => {
    const n=Number(formCostPrice); return(!formCostPrice||isNaN(n)||n<=0)?0:Math.round(n*1.15);
  }, [formCostPrice]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      {/* Header — mirrors DriverDashboardScreen */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: "white", borderBottomColor: "#f1f5f9" }]}>
        <View style={styles.titleRow}>
          <ThemedText style={{ fontSize: 22, fontWeight: "900", color: "#1e293b" }}>Store Ops</ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: BRAND_PURPLE }]} onPress={() => navigation.navigate("Notifications")}>
              <Feather name="bell" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: "#fee2e2" }]} onPress={handleLogout}>
              <Feather name="log-out" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.statusRow, { marginTop: 8, marginBottom: 16 }]}>
          <View style={[styles.statusDot, { backgroundColor: BRAND_MINT }]} />
          <ThemedText type="caption" style={{ color: "#64748b", marginLeft: 6, fontWeight: "700" }}>ONLINE & READY — 15-MIN TARGET</ThemedText>
        </View>
        <View style={styles.tabs}>
          {(["orders","inventory","promotions"] as const).map(tab => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && { borderBottomColor: BRAND_PURPLE }]}>
              <Feather name={tab === "orders" ? "package" : tab === "inventory" ? "box" : "gift"} size={18} color={activeTab === tab ? BRAND_PURPLE : "#94a3b8"} />
              <ThemedText style={[styles.tabText, { color: activeTab === tab ? BRAND_PURPLE : "#94a3b8" }]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={invLoading||dashLoading||promoLoading} onRefresh={onRefresh} tintColor={BRAND_PURPLE} />}>
        {user?.id && <View style={{ marginBottom: 16 }}><StaffEarningsDashboard userId={user.id} role="picker" /></View>}

        {activeTab === "promotions" ? (
          <>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: BRAND_PURPLE }]} onPress={() => openPromoModal()}>
              <Feather name="plus" size={18} color="white" /><ThemedText style={styles.addBtnText}>Create Promotion</ThemedText>
            </TouchableOpacity>
            {promoLoading ? <ActivityIndicator size="large" color={BRAND_PURPLE} style={{ marginTop: 40 }} />
              : promotions.length > 0 ? promotions.map(p => <PromotionCard key={p.id} promotion={p} onEdit={openPromoModal} onDelete={handleDeletePromo} onToggleActive={(id,v)=>togglePromoMutation.mutate({id,isActive:v})} />)
              : <View style={styles.empty}><Feather name="gift" size={50} color="#94a3b8" /><ThemedText style={styles.emptyText}>No promotions yet</ThemedText></View>}
          </>
        ) : activeTab === "inventory" ? (
          <>
            <View style={styles.searchBox}>
              <Feather name="search" size={18} color="#94a3b8" />
              <TextInput placeholder="Find product..." placeholderTextColor="#94a3b8" style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: BRAND_PURPLE }]} onPress={() => openEditModal()}>
              <Feather name="plus" size={18} color="white" /><ThemedText style={styles.addBtnText}>Add Store Item</ThemedText>
            </TouchableOpacity>
            {invLoading ? <ActivityIndicator size="large" color={BRAND_PURPLE} style={{ marginTop: 40 }} />
              : filteredInventory.length > 0 ? <Card style={{ paddingHorizontal: 10 }}>{filteredInventory.map(i => <InventoryItemRow key={i.id} item={i} onEdit={openEditModal} onDelete={handleDeleteProduct} />)}</Card>
              : <View style={styles.empty}><Feather name="inbox" size={50} color="#94a3b8" /><ThemedText style={styles.emptyText}>No items found</ThemedText></View>}
          </>
        ) : (
          <>
            {user?.id && <PreStagingWidget userId={user.id} />}
            {user?.id && <AICoachWidget    userId={user.id} />}
            {dashLoading ? <ActivityIndicator size="large" color={BRAND_PURPLE} style={{ marginTop: 40 }} />
              : ordersToDisplay.length > 0 ? ordersToDisplay.map((o: any) => <OrderCard key={o.id} order={o} onUpdateStatus={handleUpdateOrderStatus} storeName={dashboard?.store?.name || "Store"} userId={user?.id || ""} />)
              : <Card style={styles.emptyCard}><Feather name="package" size={48} color="#cbd5e1" /><ThemedText type="h3" style={{ marginTop: Spacing.md, color: "#64748b" }}>No Active Orders</ThemedText><ThemedText type="body" style={{ marginTop: 8, color: "#94a3b8" }}>New orders will appear here</ThemedText></Card>}
          </>
        )}
      </ScrollView>

      {/* Promo Modal */}
      <Modal visible={promoModalVisible} animationType="slide">
        <ThemedView style={[styles.modalWrap, { paddingTop: insets.top + 20 }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h2">{isEditingPromo ? "Edit Promotion" : "New Promotion"}</ThemedText>
            <TouchableOpacity onPress={() => setPromoModalVisible(false)}><Feather name="x" size={24} color="#1e293b" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.label}>Title *</ThemedText>
            <TextInput style={styles.input} value={promoTitle} onChangeText={setPromoTitle} placeholder="Weekend Special 20% Off" placeholderTextColor="#94a3b8" />
            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput style={[styles.input,{height:60}]} value={promoDescription} onChangeText={setPromoDescription} multiline placeholder="Describe your promotion..." placeholderTextColor="#94a3b8" />
            <ThemedText style={styles.label}>Banner Image (16:9)</ThemedText>
            <TouchableOpacity style={styles.imgPicker} onPress={pickPromoImg}>
              {promoImage ? <Image source={{ uri: promoImage }} style={styles.fullImg} /> : <View style={styles.imgPlaceholder}><Feather name="image" size={40} color="#94a3b8" /><ThemedText style={{ marginTop: 8, color: "#94a3b8" }}>Tap to add image</ThemedText></View>}
            </TouchableOpacity>
            <ThemedText style={styles.label}>Type *</ThemedText>
            <View style={styles.typeRow}>
              {(["percentage","fixed_amount"] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.typeBtn, promoType === t && { backgroundColor: BRAND_PURPLE }]} onPress={() => setPromoType(t)}>
                  <ThemedText style={[styles.typeBtnText, promoType === t && { color: "white" }]}>{t === "percentage" ? "Percentage" : "Fixed Amount"}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}><ThemedText style={styles.label}>Discount {promoType === "percentage" ? "(%)" : "(Rp)"} *</ThemedText><TextInput style={styles.input} value={promoDiscount} onChangeText={setPromoDiscount} keyboardType="numeric" placeholder={promoType === "percentage" ? "20" : "50000"} placeholderTextColor="#94a3b8" /></View>
              <View style={{ flex: 1, marginLeft: 10 }}><ThemedText style={styles.label}>Min Order (Rp)</ThemedText><TextInput style={styles.input} value={promoMinOrder} onChangeText={setPromoMinOrder} keyboardType="numeric" placeholder="100000" placeholderTextColor="#94a3b8" /></View>
            </View>
            <ThemedText style={styles.label}>Valid Until *</ThemedText>
            <TextInput style={styles.input} value={promoValidUntil} onChangeText={setPromoValidUntil} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" />
            <TouchableOpacity style={styles.checkRow} onPress={() => setPromoInBanner(v => !v)}>
              <View style={[styles.checkbox, promoInBanner && { backgroundColor: BRAND_PURPLE }]}>{promoInBanner && <Feather name="check" size={16} color="white" />}</View>
              <ThemedText style={{ marginLeft: 10 }}>Show in home page banner</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: BRAND_PURPLE }]} onPress={handleSavePromo}>
              <ThemedText style={styles.saveBtnText}>{isEditingPromo ? "Update Promotion" : "Create Promotion"}</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Inventory Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <ThemedView style={[styles.modalWrap, { paddingTop: insets.top + 20 }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h2">{isEditing ? "Edit Item" : "New Product"}</ThemedText>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Feather name="x" size={24} color="#1e293b" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.label}>Category *</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
              {Array.isArray(categories) && categories.map(c => (
                <TouchableOpacity key={c.id} onPress={() => setFormCategoryId(c.id)} style={[styles.catChip, formCategoryId === c.id && { backgroundColor: BRAND_PURPLE }]}>
                  <ThemedText style={[styles.chipText, formCategoryId === c.id && { color: "white" }]}>{c.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.imgPicker} onPress={pickImage}>
              {formImage ? <Image source={{ uri: formImage }} style={styles.fullImg} /> : <View style={styles.imgPlaceholder}><Feather name="camera" size={40} color="#94a3b8" /><ThemedText style={{ marginTop: 8, color: "#94a3b8" }}>Tap to add image</ThemedText></View>}
            </TouchableOpacity>
            <ThemedText style={styles.label}>Product Name *</ThemedText>
            <TextInput style={styles.input} value={formName} onChangeText={setFormName} placeholder="Fresh Milk" placeholderTextColor="#94a3b8" />
            <ThemedText style={styles.label}>Brand</ThemedText>
            <TextInput style={styles.input} value={formBrand} onChangeText={setFormBrand} placeholder="Brand name" placeholderTextColor="#94a3b8" />
            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput style={[styles.input,{height:60}]} value={formDescription} onChangeText={setFormDescription} multiline placeholder="Details..." placeholderTextColor="#94a3b8" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.label}>Cost Price (Rp) *</ThemedText>
                <ThemedText type="caption" style={{ color: "#94a3b8", marginBottom: 4 }}>What you paid supplier</ThemedText>
                <TextInput style={styles.input} value={formCostPrice} onChangeText={setFormCostPrice} keyboardType="numeric" placeholder="10000" placeholderTextColor="#94a3b8" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <ThemedText style={styles.label}>Discount Price (Optional)</ThemedText>
                <ThemedText type="caption" style={{ color: "#94a3b8", marginBottom: 4 }}>For "Was Rp X" display</ThemedText>
                <TextInput style={styles.input} value={formOriginalPrice} onChangeText={setFormOriginalPrice} keyboardType="numeric" placeholder="15000" placeholderTextColor="#94a3b8" />
              </View>
            </View>
            <View style={[styles.infoBox, { backgroundColor: BRAND_PURPLE + "10", borderColor: BRAND_PURPLE + "30" }]}>
              <Feather name="info" size={16} color={BRAND_PURPLE} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <ThemedText type="caption" style={{ color: BRAND_PURPLE, fontWeight: "600" }}>Selling Price Auto-Calculated</ThemedText>
                <ThemedText type="caption" style={{ color: "#64748b", marginTop: 2 }}>
                  Cost + 15% margin = Selling Price{calculatedSellingPrice > 0 && `\nRp ${Number(formCostPrice).toLocaleString()} → Rp ${calculatedSellingPrice.toLocaleString()}`}
                </ThemedText>
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}><ThemedText style={styles.label}>Stock *</ThemedText><TextInput style={styles.input} value={formStock} onChangeText={setFormStock} keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8" /></View>
              <View style={{ flex: 1, marginLeft: 10 }}><ThemedText style={styles.label}>Location</ThemedText><TextInput style={styles.input} value={formLocation} onChangeText={setFormLocation} placeholder="Aisle 1" placeholderTextColor="#94a3b8" /></View>
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: BRAND_PURPLE }]} onPress={handleSaveProduct}>
              <ThemedText style={styles.saveBtnText}>{isEditing ? "Update Item" : "Save Item"}</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </ThemedView>
      </Modal>

      <CustomAlertModal visible={alertVisible} title={alertTitle} message={alertMessage} onClose={() => setAlertVisible(false)} />

      <Modal transparent visible={deleteModalVisible} animationType="fade">
        <Pressable style={styles.alertOverlay} onPress={() => setDeleteModalVisible(false)}>
          <View style={styles.alertBox}>
            <ThemedText type="h3" style={styles.alertTitle}>Delete Item</ThemedText>
            <ThemedText style={styles.alertMessage}>Remove this item from inventory?</ThemedText>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={[styles.alertBtn, { backgroundColor: "#e2e8f0", flex: 1 }]} onPress={() => setDeleteModalVisible(false)}><ThemedText style={[styles.alertBtnText, { color: "#334155" }]}>Cancel</ThemedText></TouchableOpacity>
              <TouchableOpacity style={[styles.alertBtn, { backgroundColor: "#ef4444", flex: 1 }]} onPress={confirmDelete}><ThemedText style={styles.alertBtnText}>Delete</ThemedText></TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f8fafc" },
  header:         { paddingHorizontal: 20, borderBottomWidth: 1 },
  titleRow:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusRow:      { flexDirection: "row", alignItems: "center" },
  statusDot:      { width: 8, height: 8, borderRadius: 4 },
  headerActions:  { flexDirection: "row", gap: 10 },
  iconButton:     { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  tabs:           { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  tab:            { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 8, borderBottomWidth: 3, borderBottomColor: "transparent" },
  tabText:        { fontSize: 14, fontWeight: "600" },
  scrollContent:  { padding: 16, paddingBottom: 100 },
  orderCard:      { padding: 16, marginBottom: 16, borderRadius: 20, backgroundColor: "white" },
  orderHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  orderNumber:    { fontSize: 18, fontWeight: "900", color: "#1e293b" },
  orderPrice:     { fontSize: 17, fontWeight: "900", color: BRAND_PURPLE },
  statusPill:     { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4, gap: 6 },
  statusDotSm:    { width: 6, height: 6, borderRadius: 3 },
  statusLabel:    { fontSize: 11, fontWeight: "800" },
  aiBanner:       { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, marginTop: 12, borderWidth: 1 },
  progressBar:    { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill:   { height: "100%", borderRadius: 4 },
  pickCard:       { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 2 },
  pickBadge:      { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  pickNum:        { color: "white", fontWeight: "900", fontSize: 14 },
  pickImg:        { width: 50, height: 50, borderRadius: 8, marginLeft: 10 },
  priorityBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  freshnessNote:  { flexDirection: "row", alignItems: "center", marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  checkCircle:    { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: "center", alignItems: "center", marginLeft: 10 },
  actionBtn:      { flexDirection: "row", padding: 14, borderRadius: 14, marginTop: 15, justifyContent: "center", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width:0,height:2 }, shadowRadius: 4 },
  actionBtnText:  { color: "white", fontWeight: "800", marginLeft: 8, fontSize: 15 },
  promoCard:      { padding: 15, marginBottom: 15 },
  promoImg:       { width: "100%", height: 120, borderRadius: 12, marginBottom: 15 },
  promoHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  activeBadge:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  promoActionBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  invRow:         { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  invImg:         { width: 45, height: 45, borderRadius: 8, backgroundColor: "#f1f5f9" },
  invInfo:        { flex: 1, marginLeft: 12 },
  searchBox:      { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 12, paddingHorizontal: 15, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  searchInput:    { flex: 1, height: 45, marginLeft: 10, color: "#1e293b" },
  addBtn:         { flexDirection: "row", padding: 16, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 16, elevation: 2, shadowColor: BRAND_PURPLE, shadowOpacity: 0.2, shadowOffset: { width:0,height:2 }, shadowRadius: 6 },
  addBtnText:     { color: "white", fontWeight: "800", marginLeft: 8 },
  empty:          { alignItems: "center", marginTop: 50 },
  emptyText:      { marginTop: 10, color: "#94a3b8" },
  emptyCard:      { alignItems: "center", padding: 40, borderRadius: 24 },
  modalWrap:      { flex: 1, paddingHorizontal: 20 },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  label:          { fontSize: 13, fontWeight: "700", marginBottom: 4, marginTop: 10, color: "#1e293b" },
  input:          { padding: 12, borderRadius: 10, marginBottom: 8, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", color: "#1e293b" },
  row:            { flexDirection: "row" },
  infoBox:        { padding: 12, borderRadius: 10, marginBottom: 15, flexDirection: "row", alignItems: "flex-start", borderWidth: 1 },
  imgPicker:      { height: 140, borderRadius: 12, marginBottom: 15, overflow: "hidden", backgroundColor: "#f8fafc", borderWidth: 2, borderColor: "#e2e8f0", borderStyle: "dashed" },
  imgPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  fullImg:        { width: "100%", height: "100%" },
  catChip:        { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f1f5f9", marginRight: 8 },
  chipText:       { fontSize: 13 },
  typeRow:        { flexDirection: "row", gap: 10, marginBottom: 12 },
  typeBtn:        { flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#f1f5f9", alignItems: "center" },
  typeBtnText:    { fontWeight: "600", color: "#475569" },
  checkRow:       { flexDirection: "row", alignItems: "center", marginVertical: 14 },
  checkbox:       { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#e2e8f0", justifyContent: "center", alignItems: "center" },
  saveBtn:        { padding: 16, borderRadius: 14, alignItems: "center", marginTop: 24, marginBottom: 40, elevation: 3, shadowColor: BRAND_PURPLE, shadowOpacity: 0.25, shadowOffset: { width:0,height:3 }, shadowRadius: 8 },
  saveBtnText:    { color: "white", fontWeight: "800", fontSize: 16 },
  alertOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  alertBox:       { backgroundColor: "white", borderRadius: 20, padding: 24, width: "90%", maxWidth: 320, elevation: 8, shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width:0,height:4 }, shadowRadius: 12 },
  alertTitle:     { fontSize: 18, fontWeight: "800", marginBottom: 10, textAlign: "center", color: "#1e293b" },
  alertMessage:   { fontSize: 14, color: "#64748b", marginBottom: 20, textAlign: "center" },
  alertBtn:       { padding: 14, borderRadius: 12, alignItems: "center" },
  alertBtnText:   { color: "white", fontSize: 15, fontWeight: "700" },
});