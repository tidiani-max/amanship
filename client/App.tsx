import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
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
import { NotificationAlertProvider } from "@/components/NotificationAlertProvider"; // ✅ ADD THIS

// ✅ Configure notification handler BEFORE app renders
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function SeedDataOnMount() {
  useEffect(() => {
    apiRequest("POST", "/api/seed").catch(() => {});
  }, []);
  return null;
}

// ✅ NEW: Clear notification alert flag on app start
function ClearAlertFlag() {
  useEffect(() => {
    const clearFlag = async () => {
      try {
        await AsyncStorage.removeItem('@notification_alert_dismissed');
        console.log('✅ Notification alert flag cleared - alert will show if needed');
      } catch (error) {
        console.error('❌ Error clearing alert flag:', error);
      }
    };
    
    clearFlag();
  }, []);
  
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OnboardingProvider>
            <LanguageProvider>
              <CartProvider>
                <LocationProvider>
                  <SeedDataOnMount />
                  <ClearAlertFlag /> {/* ✅ ADD THIS */}
                  
                  <SafeAreaProvider>
                    <GestureHandlerRootView style={styles.root}>
                      <KeyboardProvider>
                        {/* ✅ WRAP NavigationContainer with NotificationAlertProvider */}
                        <NotificationAlertProvider>
                          <NavigationContainer>
                            <RootStackNavigator />
                          </NavigationContainer>
                        </NotificationAlertProvider>
                        
                        <StatusBar style="auto" />
                      </KeyboardProvider>
                    </GestureHandlerRootView>
                  </SafeAreaProvider>
                </LocationProvider>
              </CartProvider>
            </LanguageProvider>
          </OnboardingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});