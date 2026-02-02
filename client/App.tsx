import React, { useEffect } from "react";
import { StyleSheet, LogBox, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CartProvider } from "@/context/CartContext";
import { LocationProvider } from "@/context/LocationContext";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { SearchProvider } from "@/context/SearchContext";
import { NotificationAlertProvider } from "@/components/NotificationAlertProvider";

// 1. SILENCE ALL ERRORS & WARNINGS (This stops the red/yellow boxes)
LogBox.ignoreAllLogs();

// Configure notification handler BEFORE app renders
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Hook to seed data on mount
 * This populates your database automatically
 */
function useSeedData() {
  useEffect(() => {
    apiRequest("POST", "/api/seed").catch((error) => {
      // Log to console instead of showing alert to user
      console.log("Seed data suppressed or already exists");
    });
  }, []);
}

/**
 * Hook to clear notification alert flag on app start
 */
function useClearAlertFlag() {
  useEffect(() => {
    const clearFlag = async () => {
      try {
        await AsyncStorage.removeItem('@notification_alert_dismissed');
      } catch (error) {
        console.error('Error clearing alert flag:', error);
      }
    };
    clearFlag();
  }, []);
}

// Main App Layout
function AppContent() {
  useSeedData();
  useClearAlertFlag();

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <KeyboardProvider>
          <NavigationContainer>
            {/* NotificationAlertProvider inside Navigation so it can access navigation state if needed */}
            <NotificationAlertProvider>
              <RootStackNavigator />
            </NotificationAlertProvider>
          </NavigationContainer>
          <StatusBar style="auto" />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

/**
 * Root App Component
 * Organized with Data Providers -> Auth -> Content
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnboardingProvider>
          <LanguageProvider>
            <SearchProvider>
              <CartProvider>
                <LocationProvider>
                  {/* ErrorBoundary wraps the content to prevent total app crash */}
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                </LocationProvider>
              </CartProvider>
            </SearchProvider>
          </LanguageProvider>
        </OnboardingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});