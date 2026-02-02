import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, NavigationState } from "@react-navigation/native";

import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import OrdersScreen from "@/screens/OrdersScreen";
import AccountScreen from "@/screens/AccountScreen";
import VouchersScreen from "@/screens/VouchersScreen";
import { useSearch, SearchScope } from "@/context/SearchContext";

const Tab = createBottomTabNavigator();

// Type guard to safely get route name
function getCurrentRouteName(state: NavigationState | undefined): string {
  if (!state) return 'HomeTab';
  
  const route = state.routes[state.index];
  if (!route) return 'HomeTab';
  
  return route.name || 'HomeTab';
}

export default function MainTabNavigator() {
  const navigation = useNavigation();
  const { setIsSearchActive, setSearchScope } = useSearch();

  const handleSearchPress = () => {
    // Get current route name safely
    const state = navigation.getState();
    const routeName = getCurrentRouteName(state);

    console.log("🔍 Search pressed from:", routeName);

    // Map route names to search scopes
    const scopeMap: Record<string, SearchScope> = {
      'HomeTab': 'global',
      'HistoryTab': 'history',
      'DealsTab': 'deals',
    };

    // Get scope or default to global
    const scope = scopeMap[routeName] || 'global';
    
    // Set search state
    setSearchScope(scope);
    setIsSearchActive(true);

    // Navigate to home if on unsupported screen
    if (!scopeMap[routeName]) {
      navigation.navigate("HomeTab" as never);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#64748b',
          tabBarShowLabel: true,
          tabBarStyle: {
            position: "absolute",
            bottom: 30,
            left: 20,
            right: 20,
            backgroundColor: '#111827',
            borderRadius: 40,
            height: 75,
            paddingBottom: 12,
            paddingTop: 12,
            borderTopWidth: 0,
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

        {/* CENTRAL SEARCH BUTTON */}
        <Tab.Screen
          name="SearchTab"
          component={HomeStackNavigator}
          listeners={{
            tabPress: (e) => {
              // Prevent default navigation
              e.preventDefault();
              handleSearchPress();
            },
          }}
          options={{
            tabBarLabel: "",
            tabBarButton: (props) => (
              <Pressable
                onPress={handleSearchPress}
                style={styles.searchButtonContainer}
                accessibilityLabel="Search"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={['#4f46e5', '#a855f7']}
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
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonGradient: {
    width: 65,
    height: 65,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 4,
    borderColor: '#0f172a',
  },
});