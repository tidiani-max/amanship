import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Animated,
  Keyboard,
  FlatList,
  Text,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSearch } from '@/context/SearchContext';
import { Product, Order } from '@/types';

interface SearchOverlayProps {
  onResultPress?: (result: any) => void;
  onClose?: () => void;
}

export default function SearchOverlay({ onResultPress, onClose }: SearchOverlayProps) {
  const { 
    isSearchActive, 
    setIsSearchActive, 
    searchQuery, 
    setSearchQuery, 
    searchScope,
    activeCategoryId,
  } = useSearch();

  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  // Auto-focus when overlay appears
  useEffect(() => {
    if (isSearchActive) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Focus input after animation
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSearchActive]);

  // Search logic based on scope
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsLoading(true);
      try {
        let endpoint = '';
        
        switch (searchScope) {
          case 'category':
            // Search within specific category
            endpoint = `/api/category/products?categoryId=${activeCategoryId}&search=${searchQuery}`;
            break;
          case 'history':
            // Search order history
            endpoint = `/api/orders/search?query=${searchQuery}`;
            break;
          case 'deals':
            // Search vouchers/promotions
            endpoint = `/api/vouchers/search?query=${searchQuery}`;
            break;
          case 'global':
          default:
            // Global product search
            endpoint = `/api/products/search?query=${searchQuery}`;
            break;
        }

        const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}${endpoint}`);
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchScope, activeCategoryId]);

  const handleClose = () => {
    setIsSearchActive(false);
    setSearchQuery('');
    setResults([]);
    Keyboard.dismiss();
    onClose?.();
  };

  const handleResultPress = (result: any) => {
    handleClose();
    onResultPress?.(result);
  };

  const renderResult = ({ item }: { item: any }) => {
    // Render based on search scope
    switch (searchScope) {
      case 'history':
        return (
          <Pressable
            style={styles.resultItem}
            onPress={() => handleResultPress(item)}
          >
            <View style={styles.orderResult}>
              <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
              <Text style={styles.orderDate}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              <Text style={styles.orderTotal}>Rp {item.total.toLocaleString('id-ID')}</Text>
            </View>
          </Pressable>
        );
      
      case 'deals':
        return (
          <Pressable
            style={styles.resultItem}
            onPress={() => handleResultPress(item)}
          >
            <View style={styles.voucherResult}>
              <Feather name="gift" size={24} color="#10b981" />
              <View style={styles.voucherInfo}>
                <Text style={styles.voucherCode}>{item.code}</Text>
                <Text style={styles.voucherDescription}>{item.description}</Text>
              </View>
            </View>
          </Pressable>
        );
      
      default:
        // Product result
        return (
          <Pressable
            style={styles.resultItem}
            onPress={() => handleResultPress(item)}
          >
            <Image
              source={{ uri: item.image || 'https://via.placeholder.com/60' }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.productBrand}>{item.brand}</Text>
              <Text style={styles.productPrice}>
                Rp {item.price.toLocaleString('id-ID')}
              </Text>
            </View>
          </Pressable>
        );
    }
  };

  if (!isSearchActive) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      
      <Animated.View
        style={[
          styles.searchContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={`Search ${searchScope === 'category' ? 'in category' : searchScope}...`}
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Feather name="x-circle" size={18} color="#64748b" />
            </Pressable>
          )}
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="#64748b" />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderResult}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        ) : searchQuery.length > 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="search" size={48} color="#64748b" />
            <Text style={styles.emptyText}>No results found</Text>
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  searchContainer: {
    backgroundColor: '#1f2937',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productBrand: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  productPrice: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },
  orderResult: {
    flex: 1,
  },
  orderNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  orderDate: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  orderTotal: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },
  voucherResult: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voucherInfo: {
    marginLeft: 12,
    flex: 1,
  },
  voucherCode: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  voucherDescription: {
    color: '#64748b',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 16,
  },
});