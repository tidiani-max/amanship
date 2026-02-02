import React, { useRef, useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from './ThemedText';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onClear?: () => void;
  showMicButton?: boolean;
  onMicPress?: () => void;
  containerStyle?: object;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  autoFocus = false,
  onClear,
  showMicButton = true,
  onMicPress,
  containerStyle,
}: SearchBarProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Slide down animation on mount
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  const handleClear = () => {
    onChangeText('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
          opacity: slideAnim,
        },
        containerStyle,
      ]}
    >
      <View style={styles.searchRow}>
        <Feather name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { color: theme.text },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          autoFocus={autoFocus}
          returnKeyType="search"
        />

        {value.length > 0 && (
          <Pressable
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x-circle" size={18} color="#9ca3af" />
          </Pressable>
        )}

        {showMicButton && (
          <Pressable
            style={styles.micButton}
            onPress={onMicPress}
          >
            <Feather name="mic" size={18} color="white" />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    includeFontPadding: false,
  },
  clearButton: {
    padding: 8,
    marginRight: 4,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});