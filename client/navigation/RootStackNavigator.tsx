import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
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
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Product, Category, Order, CartItem, Address, Voucher } from "@/types";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Category: { category: Category };
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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!hasCompletedOnboarding ? (
        <Stack.Screen
          name="Onboarding"
          options={{ headerShown: false }}
        >
          {() => <OnboardingNavigator onComplete={() => setHasCompletedOnboarding(true)} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Category"
            component={CategoryScreen}
            options={({ route }) => ({
              headerTitle: route.params.category.name,
            })}
          />
          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={{
              headerTitle: "",
              headerTransparent: true,
            }}
          />
          <Stack.Screen
            name="Cart"
            component={CartScreen}
            options={{
              headerTitle: "Your Cart",
            }}
          />
          <Stack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{
              headerTitle: "Checkout",
            }}
          />
          <Stack.Screen
            name="OrderSuccess"
            component={OrderSuccessScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="OrderTracking"
            component={OrderTrackingScreen}
            options={{
              headerTitle: "Track Order",
            }}
          />
          <Stack.Screen
            name="OrderDetail"
            component={OrderDetailScreen}
            options={{
              headerTitle: "Order Details",
            }}
          />
          <Stack.Screen
            name="VoiceOrderModal"
            component={VoiceOrderModal}
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="VoiceConfirm"
            component={VoiceConfirmScreen}
            options={{
              headerTitle: "Confirm Your Order",
            }}
          />
          <Stack.Screen
            name="EditAddress"
            component={EditAddressScreen}
            options={{
              headerTitle: "Edit Address",
            }}
          />
          <Stack.Screen
            name="HelpCenter"
            component={HelpCenterScreen}
            options={{
              headerTitle: "Help Center",
            }}
          />
          <Stack.Screen
            name="Vouchers"
            component={VouchersScreen}
            options={{
              headerTitle: "My Vouchers",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
