import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';

interface EmptySearchResultsProps {
  query?: string;
  message?: string;
  icon?: keyof typeof Feather.glyphMap;
}

export function EmptySearchResults({
  query,
  message,
  icon = 'search',
}: EmptySearchResultsProps) {
  const { theme } = useTheme();

  const defaultMessage = query
    ? `No results found for "${query}"`
    : 'No results found';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.cardBackground },
        ]}
      >
        <Feather
          name={icon}
          size={48}
          color={theme.textSecondary}
          style={{ opacity: 0.3 }}
        />
      </View>
      
      <ThemedText
        style={[
          styles.message,
          { color: theme.textSecondary },
        ]}
      >
        {message || defaultMessage}
      </ThemedText>
      
      <ThemedText
        style={[
          styles.hint,
          { color: theme.textSecondary, opacity: 0.6 },
        ]}
      >
        Try adjusting your search terms
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  message: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
  },
});