import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface StoreMetrics {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  codAllowed: boolean;
  totalStaff: number;
  onlineStaff: number;
  pickers: Array<{ id: string; userId: string; status: string }>;
  drivers: Array<{ id: string; userId: string; status: string }>;
  orderCount: number;
  pendingOrders: number;
  activeOrders: number;
}

interface OrderSummary {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  onTheWay: number;
  delivered: number;
  cancelled: number;
}

interface AdminMetrics {
  stores: StoreMetrics[];
  orderSummary: OrderSummary;
  timestamp: string;
}

function MetricCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: string; 
  label: string; 
  value: number; 
  color: string;
}) {
  const { theme } = useTheme();
  
  return (
    <Card style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <ThemedText type="h2" style={styles.metricValue}>
        {value}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
    </Card>
  );
}

function StoreCard({ store, t }: { store: StoreMetrics; t: any }) {
  const { theme } = useTheme();
  
  const onlinePickers = store.pickers.filter((p) => p.status === "online").length;
  const onlineDrivers = store.drivers.filter((d) => d.status === "online").length;
  
  return (
    <Card style={styles.storeCard}>
      <View style={styles.storeHeader}>
        <View style={styles.storeInfo}>
          <ThemedText type="h3">{store.name}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {store.address}
          </ThemedText>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: store.isActive ? theme.success + "20" : theme.error + "20" }
        ]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: store.isActive ? theme.success : theme.error }
          ]} />
          <ThemedText type="small" style={{ 
            color: store.isActive ? theme.success : theme.error 
          }}>
            {store.isActive ? t.admin.activeStores : t.admin.inactive}
          </ThemedText>
        </View>
      </View>
      
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      
      <View style={styles.storeStats}>
        <View style={styles.statItem}>
          <Feather name="user" size={16} color={theme.secondary} />
          <ThemedText type="body" style={styles.statLabel}>
            {t.admin.pickers}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.text }}>
            {onlinePickers}/{store.pickers.length}
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <Feather name="truck" size={16} color={theme.primary} />
          <ThemedText type="body" style={styles.statLabel}>
            {t.admin.drivers}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.text }}>
            {onlineDrivers}/{store.drivers.length}
          </ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <Feather name="package" size={16} color={theme.warning} />
          <ThemedText type="body" style={styles.statLabel}>
            {t.admin.orders}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.text }}>
            {store.orderCount}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.storeTags}>
        {store.codAllowed ? (
          <View style={[styles.tag, { backgroundColor: theme.success + "20" }]}>
            <ThemedText type="small" style={{ color: theme.success }}>
              {t.admin.codAllowed}
            </ThemedText>
          </View>
        ) : null}
        {store.activeOrders > 0 ? (
          <View style={[styles.tag, { backgroundColor: theme.warning + "20" }]}>
            <ThemedText type="small" style={{ color: theme.warning }}>
              {store.activeOrders} {t.orders.active}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  const { data: metrics, isLoading, refetch, isRefetching } = useQuery<AdminMetrics>({
    queryKey: ["/api/admin/metrics"],
    refetchInterval: 30000,
  });
  
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
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            {t.checkout.orderSummary}
          </ThemedText>
          <View style={styles.metricsGrid}>
            <MetricCard
              icon="shopping-bag"
              label={t.admin.totalOrders}
              value={orderSummary?.total || 0}
              color={theme.secondary}
            />
            <MetricCard
              icon="clock"
              label={t.orders.pending}
              value={orderSummary?.pending || 0}
              color={theme.warning}
            />
            <MetricCard
              icon="check-circle"
              label={t.orders.delivered}
              value={orderSummary?.delivered || 0}
              color={theme.success}
            />
            <MetricCard
              icon="x-circle"
              label={t.orders.cancelled}
              value={orderSummary?.cancelled || 0}
              color={theme.error}
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            {t.admin.activePipeline}
          </ThemedText>
          <Card style={styles.pipelineCard}>
            <View style={styles.pipelineRow}>
              <View style={styles.pipelineItem}>
                <View style={[styles.pipelineDot, { backgroundColor: theme.secondary }]} />
                <ThemedText type="body">{t.orders.confirmed}</ThemedText>
                <ThemedText type="h3" style={{ color: theme.secondary }}>
                  {orderSummary?.confirmed || 0}
                </ThemedText>
              </View>
              <Feather name="arrow-right" size={16} color={theme.textSecondary} />
              <View style={styles.pipelineItem}>
                <View style={[styles.pipelineDot, { backgroundColor: theme.warning }]} />
                <ThemedText type="body">{t.orders.preparing}</ThemedText>
                <ThemedText type="h3" style={{ color: theme.warning }}>
                  {orderSummary?.preparing || 0}
                </ThemedText>
              </View>
              <Feather name="arrow-right" size={16} color={theme.textSecondary} />
              <View style={styles.pipelineItem}>
                <View style={[styles.pipelineDot, { backgroundColor: theme.success }]} />
                <ThemedText type="body">{t.orders.ready}</ThemedText>
                <ThemedText type="h3" style={{ color: theme.success }}>
                  {orderSummary?.ready || 0}
                </ThemedText>
              </View>
              <Feather name="arrow-right" size={16} color={theme.textSecondary} />
              <View style={styles.pipelineItem}>
                <View style={[styles.pipelineDot, { backgroundColor: theme.primary }]} />
                <ThemedText type="body">{t.orders.onTheWay}</ThemedText>
                <ThemedText type="h3" style={{ color: theme.primary }}>
                  {orderSummary?.onTheWay || 0}
                </ThemedText>
              </View>
            </View>
          </Card>
        </View>
        
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            {t.admin.stores} ({stores.length})
          </ThemedText>
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} t={t} />
          ))}
          {stores.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Feather name="map-pin" size={32} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                {t.admin.noStoresFound}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: Spacing.md,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  metricValue: {
    marginTop: Spacing.xs,
  },
  pipelineCard: {
    padding: Spacing.md,
  },
  pipelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pipelineItem: {
    alignItems: "center",
    flex: 1,
  },
  pipelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  storeCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  storeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  storeInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  storeStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statLabel: {
    marginRight: Spacing.xs,
  },
  storeTags: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  emptyCard: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  timestamp: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
