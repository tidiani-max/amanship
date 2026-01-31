import React from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; // Ensure you have this installed

import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import OrdersScreen from "@/screens/OrdersScreen";
import AccountScreen from "@/screens/AccountScreen";
import VouchersScreen from "@/screens/VouchersScreen";

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#3b82f6', // Bright blue for active
          tabBarInactiveTintColor: '#64748b', // Muted slate
          tabBarShowLabel: true,
          tabBarStyle: {
            position: "absolute",
            bottom: 30, // Floats above the bottom
            left: 20,
            right: 20,
            backgroundColor: '#111827', // Deep dark navy/black
            borderRadius: 40, // Fully rounded pill shape
            height: 75,
            paddingBottom: 12,
            paddingTop: 12,
            borderTopWidth: 0,
            // Shadow for the pill
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 10,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1,
            marginTop: 4,
          },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStackNavigator}
          options={{
            tabBarLabel: "SHOP",
            tabBarIcon: ({ color }) => <Feather name="shopping-bag" size={20} color={color} />,
          }}
        />
        
        <Tab.Screen
          name="DealsTab"
          component={VouchersScreen} 
          options={{
            tabBarLabel: "DEALS",
            tabBarIcon: ({ color }) => <Feather name="star" size={20} color={color} />,
          }}
        />

        {/* CENTRAL SEARCH BUTTON - CUSTOM UI */}
        <Tab.Screen
          name="SearchTab"
          component={HomeStackNavigator} // Placeholder
          options={{
            tabBarLabel: "", // Hide label for search
            tabBarButton: (props) => (
              <Pressable
                onPress={() => console.log("Search Pressed")}
                style={styles.searchButtonContainer}
              >
                <LinearGradient
                  colors={['#4f46e5', '#a855f7']} // Zendo Purple Gradient
                  style={styles.searchButtonGradient}
                >
                  <Feather name="search" size={28} color="white" />
                </LinearGradient>
              </Pressable>
            ),
          }}
        />

        <Tab.Screen
          name="HistoryTab"
          component={OrdersScreen}
          options={{
            tabBarLabel: "HISTORY",
            tabBarIcon: ({ color }) => <Feather name="clock" size={20} color={color} />,
          }}
        />

        <Tab.Screen
          name="AccountTab"
          component={AccountScreen}
          options={{
            tabBarLabel: "PROFILE",
            tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} />,
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  searchButtonContainer: {
    top: -30, // Lifts the search button out of the bar
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonGradient: {
    width: 65,
    height: 65,
    borderRadius: 22, // Squircle shape to match your theme
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 4,
    borderColor: '#0f172a', // Matches the tab bar background to create "cutout" look
  },
});