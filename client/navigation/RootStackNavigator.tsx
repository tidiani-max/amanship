import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import { useOnboarding } from "@/context/OnboardingContext";
import CategoryScreen from "@/screens/CategoryScreen";
import ProductDetailScreen from "@/screens/ProductDetailScreen";
import CartScreen from "@/screens/CartScreen";
import CheckoutScreen from "@/screens/CheckoutScreen";
import OrderSuccessScreen from "@/screens/OrderSuccessScreen";
import OrderTrackingScreen from "@/screens/OrderTrackingScreen";
import OrderDetailScreen from "@/screens/OrderDetailScreen";
import VoiceOrderModal from "@/screens/VoiceOrderModal";
import VoiceConfirmScreen from "@/screens/VoiceConfirmScreen";
import EditAddressScreen from "@/screens/EditAddressScreen";
import HelpCenterScreen from "@/screens/HelpCenterScreen";
import VouchersScreen from "@/screens/VouchersScreen";
import AdminDashboardScreen from "@/screens/AdminDashboardScreen";
import OwnerDashboardScreen from "@/screens/OwnerDashboardScreen";
import PickerDashboardScreen from "@/screens/PickerDashboardScreen";
import DriverDashboardScreen from "@/screens/DriverDashboardScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import LanguageScreen from "@/screens/LanguageScreen";
import AboutScreen from "@/screens/AboutScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Product, Category, Order, CartItem, Address, Voucher } from "@/types";
import PhoneSignupScreen from "@/screens/onboarding/PhoneSignupScreen"; 
import { useAuth } from "@/context/AuthContext";
import ChatScreen from "@/screens/ChatScreen";


export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Auth: undefined;
  Category: { category: Category };
  Chat: { orderId: string };
  ProductDetail: { product: Product };
  Cart: undefined;
  Checkout: undefined;
  OrderSuccess: { orderId: string };
  OrderTracking: { orderId: string };
  OrderDetail: { order: Order };
  VoiceOrderModal: undefined;
  VoiceConfirm: { items: CartItem[] };
  EditAddress: { address?: Address };
  HelpCenter: undefined;
  Vouchers: undefined;
  AdminDashboard: undefined;
  OwnerDashboard: undefined;
  PickerDashboard: undefined;
  DriverDashboard: undefined;
  Notifications: undefined;
  Language: undefined;
  About: undefined;
};


// ... (keep your existing imports)

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { hasCompletedOnboarding, isLoading, completeOnboarding } = useOnboarding();
  const { isAuthenticated, user } = useAuth(); 
  const Stack = createNativeStackNavigator<RootStackParamList>();


  if (isLoading) return null;

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!hasCompletedOnboarding ? (
        <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
          {() => <OnboardingNavigator onComplete={completeOnboarding} />}
        </Stack.Screen>
      ) : !isAuthenticated ? (
  <Stack.Screen name="Auth" options={{ headerShown: false }}>
    {() => <PhoneSignupScreen onComplete={() => {}} />}
  </Stack.Screen>
) : (
        /* PHASE 3: ROLE-BASED PROTECTED APP */
        <>
          {/* --- ADMIN STACK --- */}
          {user?.role === 'admin' && (
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          )}

          {/* --- PICKER STACK --- */}
          {user?.role === 'picker' && (
            <Stack.Screen name="PickerDashboard" component={PickerDashboardScreen} />
          )}

          {/* --- DRIVER STACK --- */}
          {user?.role === 'driver' && (
            <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
          )}

          {/* --- REGULAR USER STACK --- */}
          {(!user?.role || user?.role === 'user' || user?.role === 'customer') && (
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
              <Stack.Screen name="Category" component={CategoryScreen} />
              <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
              <Stack.Screen name="Cart" component={CartScreen} />
              <Stack.Screen name="Checkout" component={CheckoutScreen} />
              <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ headerShown: false }} />
              {/* Note: I'm moving Tracking/Detail to Shared below so Pickers/Drivers can see them too! */}
              <Stack.Screen name="VoiceOrderModal" component={VoiceOrderModal} options={{ presentation: "modal" }} />
              <Stack.Screen name="VoiceConfirm" component={VoiceConfirmScreen} />
              <Stack.Screen name="EditAddress" component={EditAddressScreen} />
              <Stack.Screen name="Vouchers" component={VouchersScreen} />
            </>
          )}

          {/* --- SHARED SCREENS (Available to ALL roles) --- */}
          {/* ADD THE CHAT SCREEN HERE */}
          <Stack.Screen name="Chat" component={ChatScreen} options={{ headerTitle: "Chat with Rider" }} />
          
          {/* IMPORTANT: Move these here so Drivers/Pickers can also open order details */}
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}