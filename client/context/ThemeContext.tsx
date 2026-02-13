// context/ThemeContext.tsx
// ============================================
// GLOBAL THEME PROVIDER
// This is the ONE file that fixes dark mode everywhere
// ============================================

import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

interface AppTheme {
  backgroundRoot: string;
  backgroundDefault: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primaryLight: string;
  success: string;
  successLight: string;
  error: string;
  border: string;
  borderLight: string;
  link: string;
  badge: {
    store: { bg: string; text: string };
    time: { bg: string; text: string };
    discount: { bg: string; text: string };
    premium: { bg: string; text: string };
  };
}

const lightTheme: AppTheme = {
  backgroundRoot: '#f8fafc',
  backgroundDefault: '#ffffff',
  cardBackground: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  primary: '#6366f1',
  primaryLight: '#eef2ff',
  success: '#059669',
  successLight: '#d1fae5',
  error: '#ef4444',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  link: '#3b82f6',
  badge: {
    store: { bg: '#d1fae5', text: '#065f46' },
    time: { bg: '#ede9fe', text: '#6366f1' },
    discount: { bg: '#ef4444', text: '#ffffff' },
    premium: { bg: '#fbce1f', text: '#000000' },
  },
};

const darkTheme: AppTheme = {
  backgroundRoot: '#0f172a',
  backgroundDefault: '#1e293b',
  cardBackground: '#1e293b',
  text: '#f1f5f9',              // ✅ THIS IS THE FIX
  textSecondary: '#cbd5e1',      // ✅ THIS IS THE FIX
  textTertiary: '#94a3b8',       // ✅ THIS IS THE FIX
  primary: '#818cf8',
  primaryLight: '#312e81',
  success: '#10b981',
  successLight: '#064e3b',
  error: '#f87171',
  border: '#334155',
  borderLight: '#475569',
  link: '#60a5fa',
  badge: {
    store: { bg: '#064e3b', text: '#6ee7b7' },
    time: { bg: '#312e81', text: '#c7d2fe' },
    discount: { bg: '#7f1d1d', text: '#fca5a5' },
    premium: { bg: '#713f12', text: '#fde047' },
  },
};

interface ThemeContextValue {
  theme: AppTheme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  isDark: false,
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;
  
  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);