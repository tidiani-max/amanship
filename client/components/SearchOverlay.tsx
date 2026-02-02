import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { SearchBar } from '@/components/SearchBar';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';

interface SearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function SearchOverlay({
  visible,
  onClose,
  value,
  onChangeText,
  placeholder = 'Search...',
  children,
}: SearchOverlayProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Backdrop */}
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessible={false}
          />

          {/* Content */}
          <Animated.View
            style={[
              styles.content,
              {
                backgroundColor: theme.backgroundRoot,
                paddingTop: insets.top,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header with Search Bar */}
            <View
              style={[
                styles.header,
                { 
                  backgroundColor: theme.cardBackground,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border || '#e5e7eb',
                }
              ]}
            >
              <View style={styles.searchBarContainer}>
                <View style={styles.searchInputWrapper}>
                  <Feather name="search" size={20} color="#64748b" />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChangeText(e.target.value)}
                    placeholder={placeholder}
                    autoFocus
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: 16,
                      marginLeft: 12,
                      backgroundColor: 'transparent',
                      color: theme.text,
                    }}
                  />
                  {value.length > 0 && (
                    <Pressable
                      onPress={() => onChangeText('')}
                      style={styles.clearButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="x-circle" size={18} color="#64748b" />
                    </Pressable>
                  )}
                </View>

                <Pressable
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>
            </View>

            {/* Search Results */}
            <View style={{ flex: 1 }}>
              {children}
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  clearButton: {
    padding: 4,
  },
  closeButton: {
    padding: 8,
  },
});