import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "@/screens/HomeScreen";
import CategoryScreen from "@/screens/CategoryScreen";
import ProductDetailScreen from "@/screens/ProductDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Category, Product } from "@/types";

// Update the ParamList to include Category and ProductDetail
export type HomeStackParamList = {
  Home: undefined;
  Category: { category: Category };
  ProductDetail: { product: Product };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Category" 
        component={CategoryScreen} 
        options={{ headerShown: false }} // Keep false if you use your custom header
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}