import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface StaffEarningsProps {
  userId: string;
  role: "picker" | "driver";
}

export function StaffEarningsDashboard({ userId, role }: StaffEarningsProps) {
  const { theme } = useTheme();
  const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN!;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/staff/earnings/today", userId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/staff/earnings/today?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch earnings");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <Card style={styles.loadingCard}>
        <ActivityIndicator size="small" color={theme.primary} />
      </Card>
    );
  }

  if (!data) return null;

  const bonusPerUnit = role === "driver" ? data.rates.deliveryBonus : data.rates.orderBonus;
  const unitsToday = role === "driver" ? data.today.deliveries : data.today.orders;
  const unitsLabel = role === "driver" ? "deliveries" : "orders";
  const cardColor = role === "driver" ? "#8b5cf6" : "#10b981";

  return (
    <Card style={styles.container}>
      <LinearGradient
        colors={[cardColor, cardColor + 'dd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather 
              name={role === "driver" ? "truck" : "package"} 
              size={24} 
              color="white" 
            />
          </View>
          <ThemedText style={styles.headerTitle}>
            Today's Earnings
          </ThemedText>
        </View>

        {/* Main Stats */}
        <View style={styles.mainStats}>
          <View style={styles.statRow}>
            <ThemedText style={styles.statLabel}>
              {unitsToday} {unitsLabel}
            </ThemedText>
            <ThemedText style={styles.bonusAmount}>
              Rp {data.today.bonus.toLocaleString()}
            </ThemedText>
          </View>
          
          <ThemedText style={styles.rateText}>
            @ Rp {bonusPerUnit.toLocaleString()} per {role === "driver" ? "delivery" : "order"}
          </ThemedText>
        </View>

        {/* Comparison with Yesterday */}
        {data.comparison.yesterdayBonus > 0 && (
          <View style={[
            styles.comparisonCard,
            { backgroundColor: 'rgba(255,255,255,0.15)' }
          ]}>
            <View style={styles.comparisonRow}>
              <Feather 
                name={data.comparison.change >= 0 ? "trending-up" : "trending-down"} 
                size={16} 
                color={data.comparison.change >= 0 ? "#10b981" : "#f59e0b"} 
              />
              <ThemedText style={styles.comparisonText}>
                {data.comparison.change >= 0 ? "+" : ""}
                Rp {Math.abs(data.comparison.change).toLocaleString()} vs yesterday
              </ThemedText>
            </View>
          </View>
        )}

        {/* Motivation */}
        <View style={styles.motivationCard}>
          <ThemedText style={styles.motivationIcon}>
            {data.motivation.icon}
          </ThemedText>
          <ThemedText style={styles.motivationText}>
            {data.motivation.message}
          </ThemedText>
        </View>

        {/* Monthly Projection */}
        <View style={styles.monthlySection}>
          <ThemedText style={styles.monthLabel}>This Month</ThemedText>
          <View style={styles.monthlyBreakdown}>
            <View style={styles.breakdownRow}>
              <ThemedText style={styles.breakdownLabel}>Base Salary</ThemedText>
              <ThemedText style={styles.breakdownValue}>
                Rp {data.monthToDate.baseSalary.toLocaleString()}
              </ThemedText>
            </View>
            <View style={styles.breakdownRow}>
              <ThemedText style={styles.breakdownLabel}>
                Bonuses ({role === "driver" ? data.monthToDate.deliveries : data.monthToDate.orders} {unitsLabel})
              </ThemedText>
              <ThemedText style={styles.breakdownValue}>
                + Rp {data.monthToDate.bonus.toLocaleString()}
              </ThemedText>
            </View>
            <View style={[styles.breakdownRow, styles.totalRow]}>
              <ThemedText style={styles.totalLabel}>Projected Total</ThemedText>
              <ThemedText style={styles.totalValue}>
                Rp {data.monthToDate.projectedTotal.toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    padding: 0,
  },
  gradient: {
    padding: Spacing.lg,
  },
  loadingCard: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  mainStats: {
    marginBottom: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  bonusAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -1,
  },
  rateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  comparisonCard: {
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  comparisonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  motivationIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  motivationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  monthlySection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: Spacing.md,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthlyBreakdown: {
    gap: Spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  breakdownLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
  },
});