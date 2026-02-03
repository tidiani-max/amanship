import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  theme: any;
}

// Custom search input component that works on both web and mobile
function SearchInput({ value, onChangeText, placeholder, theme }: SearchInputProps) {
  const inputRef = useRef<TextInput>(null);
  const hasFocused = useRef(false);

  useEffect(() => {
    // Only focus once when component first mounts
    if (!hasFocused.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        hasFocused.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  if (Platform.OS === 'web') {
    // For web, create a custom div-based input to avoid aria-hidden issues
    return (
      <div
        style={{
          flex: 1,
          marginLeft: 12,
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(e: any) => onChangeText(e.target.value)}
          placeholder={placeholder}
          autoFocus
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            fontSize: 16,
            backgroundColor: 'transparent',
            color: theme.text || '#000',
            fontFamily: 'System',
          }}
        />
      </div>
    );
  }

  // For mobile, use regular TextInput
  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#64748b"
      autoFocus
      returnKeyType="search"
      style={{
        flex: 1,
        fontSize: 16,
        marginLeft: 12,
        color: theme.text || '#000',
      }}
    />
  );
}

interface SearchOverlayHeaderProps {
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  placeholder?: string;
  theme: any;
}

export const SearchOverlayHeader = React.memo(function SearchOverlayHeader({
  value,
  onChangeText,
  onClose,
  placeholder = 'Search...',
  theme,
}: SearchOverlayHeaderProps) {
  return (
    <View style={[styles.searchHeader, { backgroundColor: theme.cardBackground || '#fff' }]}>
      <View style={styles.searchInputWrapper}>
        <Feather name="search" size={20} color="#64748b" />
        
        <SearchInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          theme={theme}
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
        <Feather name="x" size={24} color={theme.text || '#000'} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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