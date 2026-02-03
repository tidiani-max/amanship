import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  Clipboard,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useSearch } from '@/context/SearchContext';
import { SearchOverlayHeader } from '@/components/SearchOverlayHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  type: string;
  discount: number;
  discountType: string;
  minOrder: number;
  maxDiscount?: number;
  expiresAt: string;
  assignedAt: string;
  usageCount: number;
  remainingUses: number;
  icon: string;
  color: string;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: string;
  discountValue?: number;
  minOrder: number;
  maxDiscount?: number;
  validUntil: string;
  claimedAt: string;
  bannerImage?: string;
  icon: string;
  color: string;
}

interface HistoryItem {
  id: string;
  voucherCode?: string;
  voucherTitle?: string;
  discountApplied: number;
  orderNumber?: string;
  orderTotal?: number;
  usedAt: string;
}

export default function VouchersScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isSearchActive, setIsSearchActive, searchScope, setSearchScope } = useSearch();
  const [activeTab, setActiveTab] = useState<'vouchers' | 'promotions' | 'history'>('vouchers');
  const [refreshing, setRefreshing] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Set search scope for this screen
  useEffect(() => {
    console.log('🎁 VouchersScreen - Setting search scope to deals');
    setSearchScope('deals');
    
    return () => {
      console.log('🎁 VouchersScreen - Cleaning up');
    };
  }, [setSearchScope]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch assigned vouchers
      const vouchersRes = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/vouchers/assigned?userId=${user?.id}`
      );
      const vouchersData = await vouchersRes.json();
      setVouchers(vouchersData);

      // Fetch claimed promotions
      const promotionsRes = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/promotions/claimed?userId=${user?.id}`
      );
      const promotionsData = await promotionsRes.json();
      setPromotions(promotionsData);

      // Fetch history
      const historyRes = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/vouchers/history?userId=${user?.id}`
      );
      const historyData = await historyRes.json();
      setHistory(historyData);

    } catch (error) {
      console.error('Failed to fetch data:', error);
      Alert.alert('Error', 'Failed to load vouchers and promotions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const copyToClipboard = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Copied!', `Voucher code ${code} copied to clipboard`);
  };

  // Filter data based on search
  const filteredVouchers = useMemo(() => {
    if (!localSearchQuery.trim()) return vouchers;
    
    const query = localSearchQuery.toLowerCase();
    return vouchers.filter(v => 
      v.title?.toLowerCase().includes(query) ||
      v.code?.toLowerCase().includes(query) ||
      v.description?.toLowerCase().includes(query)
    );
  }, [vouchers, localSearchQuery]);

  const filteredPromotions = useMemo(() => {
    if (!localSearchQuery.trim()) return promotions;
    
    const query = localSearchQuery.toLowerCase();
    return promotions.filter(p => 
      p.title?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  }, [promotions, localSearchQuery]);

  const filteredHistory = useMemo(() => {
    if (!localSearchQuery.trim()) return history;
    
    const query = localSearchQuery.toLowerCase();
    return history.filter(h => 
      h.voucherCode?.toLowerCase().includes(query) ||
      h.voucherTitle?.toLowerCase().includes(query) ||
      h.orderNumber?.toLowerCase().includes(query)
    );
  }, [history, localSearchQuery]);

  const handleCloseSearch = () => {
    console.log('🔴 VouchersScreen - Closing search overlay');
    setIsSearchActive(false);
    setLocalSearchQuery('');
  };

  const formatDiscount = (item: Voucher | Promotion) => {
    if ('discountType' in item) {
      // Voucher
      if (item.discountType === 'percentage') {
        return `${item.discount}% OFF`;
      }
      return `Rp ${item.discount.toLocaleString('id-ID')} OFF`;
    } else {
      // Promotion
      if (item.type === 'percentage') {
        return `${item.discountValue}% OFF`;
      } else if (item.type === 'fixed_amount') {
        return `Rp ${item.discountValue?.toLocaleString('id-ID')} OFF`;
      }
      return 'Special Offer';
    }
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getVoucherBadge = (type: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      welcome: { label: 'WELCOME', color: '#10b981' },
      loyalty: { label: 'LOYALTY', color: '#3b82f6' },
      winback: { label: 'COMEBACK', color: '#f59e0b' },
      birthday: { label: 'BIRTHDAY', color: '#ec4899' },
      seasonal: { label: 'SEASONAL', color: '#8b5cf6' },
    };
    return badges[type] || { label: type.toUpperCase(), color: '#6b7280' };
  };

  const renderVoucher = (voucher: Voucher) => {
    const daysLeft = getDaysUntilExpiry(voucher.expiresAt);
    const isExpiringSoon = daysLeft <= 7;
    const badge = getVoucherBadge(voucher.type);

    return (
      <TouchableOpacity
        key={voucher.id}
        style={[styles.card, { borderLeftColor: voucher.color }]}
        onPress={() => copyToClipboard(voucher.code)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
          {isExpiringSoon && (
            <View style={styles.warningBadge}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.warningText}>{daysLeft}d left</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardTitle}>{voucher.title}</Text>
        <Text style={styles.cardDescription}>{voucher.description}</Text>

        <View style={styles.discountContainer}>
          <Text style={styles.discountText}>{formatDiscount(voucher)}</Text>
        </View>

        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Code:</Text>
          <Text style={styles.code}>{voucher.code}</Text>
          <Ionicons name="copy-outline" size={20} color="#10b981" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Min. order: Rp {voucher.minOrder.toLocaleString('id-ID')}
          </Text>
          <Text style={styles.footerText}>
            {voucher.remainingUses} use{voucher.remainingUses !== 1 ? 's' : ''} left
          </Text>
        </View>

        <Text style={styles.expiryText}>
          Expires: {new Date(voucher.expiresAt).toLocaleDateString('id-ID')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPromotion = (promo: Promotion) => {
    const daysLeft = getDaysUntilExpiry(promo.validUntil);
    const isExpiringSoon = daysLeft <= 7;

    return (
      <View key={promo.id} style={[styles.card, { borderLeftColor: promo.color }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: '#8b5cf6' }]}>
            <Text style={styles.badgeText}>PROMOTION</Text>
          </View>
          {isExpiringSoon && (
            <View style={styles.warningBadge}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.warningText}>{daysLeft}d left</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardTitle}>{promo.title}</Text>
        <Text style={styles.cardDescription}>{promo.description}</Text>

        <View style={styles.discountContainer}>
          <Text style={styles.discountText}>{formatDiscount(promo)}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Min. order: Rp {promo.minOrder.toLocaleString('id-ID')}
          </Text>
          {promo.maxDiscount && (
            <Text style={styles.footerText}>
              Max: Rp {promo.maxDiscount.toLocaleString('id-ID')}
            </Text>
          )}
        </View>

        <Text style={styles.expiryText}>
          Valid until: {new Date(promo.validUntil).toLocaleDateString('id-ID')}
        </Text>
      </View>
    );
  };

  const renderHistoryItem = (item: HistoryItem) => {
    return (
      <View key={item.id} style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.historyTitle}>{item.voucherTitle || 'Discount Applied'}</Text>
            <Text style={styles.historyCode}>Code: {item.voucherCode}</Text>
          </View>
        </View>

        <View style={styles.historyDetails}>
          <View style={styles.historyRow}>
            <Text style={styles.historyLabel}>Discount:</Text>
            <Text style={styles.historyValue}>
              Rp {item.discountApplied.toLocaleString('id-ID')}
            </Text>
          </View>
          {item.orderNumber && (
            <View style={styles.historyRow}>
              <Text style={styles.historyLabel}>Order:</Text>
              <Text style={styles.historyValue}>{item.orderNumber}</Text>
            </View>
          )}
          {item.orderTotal && (
            <View style={styles.historyRow}>
              <Text style={styles.historyLabel}>Total:</Text>
              <Text style={styles.historyValue}>
                Rp {item.orderTotal.toLocaleString('id-ID')}
              </Text>
            </View>
          )}
          <Text style={styles.historyDate}>
            {new Date(item.usedAt).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const shouldShowOverlay = isSearchActive && searchScope === 'deals';

  console.log('🎨 VouchersScreen - Rendering, shouldShowOverlay:', shouldShowOverlay);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Rewards</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'vouchers' && styles.activeTab]}
            onPress={() => setActiveTab('vouchers')}
          >
            <Ionicons
              name="ticket"
              size={20}
              color={activeTab === 'vouchers' ? '#10b981' : '#6b7280'}
            />
            <Text
              style={[styles.tabText, activeTab === 'vouchers' && styles.activeTabText]}
            >
              Vouchers ({vouchers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'promotions' && styles.activeTab]}
            onPress={() => setActiveTab('promotions')}
          >
            <Ionicons
              name="pricetag"
              size={20}
              color={activeTab === 'promotions' ? '#8b5cf6' : '#6b7280'}
            />
            <Text
              style={[styles.tabText, activeTab === 'promotions' && styles.activeTabText]}
            >
              Promotions ({promotions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons
              name="time"
              size={20}
              color={activeTab === 'history' ? '#3b82f6' : '#6b7280'}
            />
            <Text
              style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {activeTab === 'vouchers' && (
            <View style={styles.section}>
              {vouchers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="ticket-outline" size={64} color="#d1d5db" />
                  <Text style={styles.emptyTitle}>No vouchers yet</Text>
                  <Text style={styles.emptyText}>
                    Vouchers will be automatically assigned based on your activity
                  </Text>
                </View>
              ) : (
                vouchers.map(renderVoucher)
              )}
            </View>
          )}

          {activeTab === 'promotions' && (
            <View style={styles.section}>
              {promotions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="pricetag-outline" size={64} color="#d1d5db" />
                  <Text style={styles.emptyTitle}>No promotions claimed</Text>
                  <Text style={styles.emptyText}>
                    Check the home screen for available promotions
                  </Text>
                </View>
              ) : (
                promotions.map(renderPromotion)
              )}
            </View>
          )}

          {activeTab === 'history' && (
            <View style={styles.section}>
              {history.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={64} color="#d1d5db" />
                  <Text style={styles.emptyTitle}>No history yet</Text>
                  <Text style={styles.emptyText}>
                    Your used vouchers will appear here
                  </Text>
                </View>
              ) : (
                history.map(renderHistoryItem)
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* SEARCH OVERLAY */}
      {shouldShowOverlay && (
        <View style={overlayStyles.searchOverlay}>
          <Pressable style={overlayStyles.backdrop} onPress={handleCloseSearch} />
          
          <View style={[overlayStyles.searchContent, { backgroundColor: '#f9fafb', paddingTop: insets.top + 60 }]}>
            <SearchOverlayHeader
              value={localSearchQuery}
              onChangeText={setLocalSearchQuery}
              onClose={handleCloseSearch}
              placeholder="Search vouchers and promotions..."
              theme={{ text: '#111827', cardBackground: '#fff' }}
            />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {activeTab === 'vouchers' && (
                filteredVouchers.length > 0 ? (
                  filteredVouchers.map(renderVoucher)
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={64} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No vouchers found</Text>
                    <Text style={styles.emptyText}>
                      Try searching with different keywords
                    </Text>
                  </View>
                )
              )}
              {activeTab === 'promotions' && (
                filteredPromotions.length > 0 ? (
                  filteredPromotions.map(renderPromotion)
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={64} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No promotions found</Text>
                    <Text style={styles.emptyText}>
                      Try searching with different keywords
                    </Text>
                  </View>
                )
              )}
              {activeTab === 'history' && (
                filteredHistory.length > 0 ? (
                  filteredHistory.map(renderHistoryItem)
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={64} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No history found</Text>
                    <Text style={styles.emptyText}>
                      Try searching with different keywords
                    </Text>
                  </View>
                )
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#10b981',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warningText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  discountContainer: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  discountText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  code: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#6b7280',
  },
  expiryText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  historyCode: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  historyDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  historyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  historyDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

const overlayStyles = StyleSheet.create({
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  searchContent: {
    flex: 1,
  },
});