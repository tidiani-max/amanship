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

  useEffect(() => {
    // Focus the input when the component mounts
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    // CRITICAL: Blur the input when the component unmounts
    // This removes the focus BEFORE the parent can be hidden
    return () => {
      inputRef.current?.blur();
      clearTimeout(timer);
    };
  }, []);

  // Use TextInput for BOTH Web and Mobile
  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#64748b"
      autoFocus={true}
      returnKeyType="search"
      style={{
        flex: 1,
        fontSize: 16,
        marginLeft: 12,
        color: theme.text || '#000',
        // This removes the blue outline on Web
        ...Platform.select({
          web: { outlineStyle: 'none' } as any,
        }),
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