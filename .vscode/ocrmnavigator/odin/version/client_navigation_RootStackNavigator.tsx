import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import { useOnboarding } from "@/context/OnboardingContext";
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
import PickerDashboardScreen from "@/screens/PickerDashboardScreen";
import DriverDashboardScreen from "@/screens/DriverDashboardScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import LanguageScreen from "@/screens/LanguageScreen";
import AboutScreen from "@/screens/AboutScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Product, Category, Order, CartItem } from "@/types";
import PhoneSignupScreen from "@/screens/onboarding/PhoneSignupScreen";
import { useAuth } from "@/context/AuthContext";
import ChatScreen from "@/screens/ChatScreen";
import StoreOwnerDashboardScreen from "@/screens/StoreOwnerDashboardScreen";
import ConfirmPinMapScreen from "../screens/ConfirmPinMapScreen";

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
  EditAddress: undefined;
  HelpCenter: undefined;
  Vouchers: undefined;
  AdminDashboard: undefined;
  OwnerDashboard: undefined;
  PickerDashboard: undefined;
  DriverDashboard: undefined;
  Notifications: undefined;
  Language: undefined;
  About: undefined;
  StoreProducts: { store: { id: string; name: string; distance: number } };
  StoreOwnerDashboard: undefined;
  ConfirmPinMap: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── Not authenticated ───────────────────────────────────────────────────────
function UnauthenticatedStack({ onComplete }: { onComplete: () => void }) {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Auth" options={{ headerShown: false }}>
        {() => <PhoneSignupScreen onComplete={() => {}} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ─── Admin ───────────────────────────────────────────────────────────────────
function AdminStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ headerShown: false }}
      />
      {/* Shared screens admin might need */}
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
    </Stack.Navigator>
  );
}

// ─── Store Owner ─────────────────────────────────────────────────────────────
function StoreOwnerStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="StoreOwnerDashboard"
        component={StoreOwnerDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
    </Stack.Navigator>
  );
}

// ─── Picker ───────────────────────────────────────────────────────────────────
function PickerStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="PickerDashboard"
        component={PickerDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerTitle: "Chat with Customer" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
    </Stack.Navigator>
  );
}

// ─── Driver ───────────────────────────────────────────────────────────────────
function DriverStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="DriverDashboard"
        component={DriverDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerTitle: "Chat with Customer" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
    </Stack.Navigator>
  );
}

// ─── Customer ─────────────────────────────────────────────────────────────────
function CustomerStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="VoiceOrderModal" component={VoiceOrderModal} options={{ presentation: "modal" }} />
      <Stack.Screen name="VoiceConfirm" component={VoiceConfirmScreen} />
      <Stack.Screen name="EditAddress" component={EditAddressScreen} />
      <Stack.Screen name="Vouchers" component={VouchersScreen} />
      <Stack.Screen name="ConfirmPinMap" component={ConfirmPinMapScreen} options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerTitle: "Chat with Rider" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
    </Stack.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function RootStackNavigator() {
  const { hasCompletedOnboarding, isLoading, completeOnboarding } = useOnboarding();
  const { isAuthenticated, user } = useAuth();

  if (isLoading) return null;

  // 1. Not onboarded yet
  if (!hasCompletedOnboarding) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding">
          {() => <OnboardingNavigator onComplete={completeOnboarding} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  // 2. Not logged in
  if (!isAuthenticated) {
    return <UnauthenticatedStack onComplete={() => {}} />;
  }

  // 3. Logged in — route by role
  const role = user?.role;
  console.log("🔑 User role:", role); // handy for debugging

  if (role === "admin") return <AdminStack />;
  if (role === "store_owner") return <StoreOwnerStack />;
  if (role === "picker") return <PickerStack />;
  if (role === "driver") return <DriverStack />;

  // Default: customer / user / undefined
  return <CustomerStack />;
}