import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, NavigationState, getFocusedRouteNameFromRoute } from "@react-navigation/native";

import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import OrdersScreen from "@/screens/OrdersScreen";
import AccountScreen from "@/screens/AccountScreen";
import VouchersScreen from "@/screens/VouchersScreen";
import { useSearch, SearchScope } from "@/context/SearchContext";

const Tab = createBottomTabNavigator();

function getActiveRouteName(state: NavigationState | undefined): string {
  if (!state) return 'Home';
  const route = state.routes[state.index];
  if (!route) return 'Home';
  if (route.state) return getActiveRouteName(route.state as NavigationState);
  return route.name;
}

// These are all route names that mean "we're on the Home screen"
const HOME_ROUTES = new Set(['Home', 'Main', 'HomeTab', 'HomeScreen', 'index']);

export default function MainTabNavigator() {
  const navigation = useNavigation();
  const { triggerSearch, homeSearchRef } = useSearch();

  const handleSearchPress = () => {
    const state = navigation.getState();
    const activeRouteName = getActiveRouteName(state);

    console.log("🔍 Search triggered for:", activeRouteName);
    console.log("🎯 homeSearchRef exists?", !!homeSearchRef?.current);

    // 1. If we're on any Home-like route, just focus the search input
    if (HOME_ROUTES.has(activeRouteName)) {
      homeSearchRef?.current?.focus();
      return; // Always return — never fall through to triggerSearch
    }

    // 2. Category screen
    if (activeRouteName === 'Category') {
      triggerSearch('category');
      return;
    }

    // 3. All other tabs
    const scopeMap: Record<string, SearchScope> = {
      'HomeTab': 'global',
      'HistoryTab': 'history',
      'DealsTab': 'deals',
      'AccountTab': 'profile',
    };

    const scope = scopeMap[activeRouteName] || 'global';
    triggerSearch(scope);
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: ((route) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? "";
            const hideOnScreens = ["ProductDetail", "Cart", "Checkout"];
            if (hideOnScreens.includes(routeName)) return { display: "none" };

            return {
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
              elevation: 10,
            };
          })(route),
          tabBarLabelStyle: { fontSize: 10, fontWeight: '900', marginTop: 4 },
        })}
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

        <Tab.Screen
          name="SearchTab"
          component={HomeStackNavigator}
          listeners={{ tabPress: (e) => { e.preventDefault(); handleSearchPress(); } }}
          options={{
            tabBarLabel: "",
            tabBarButton: () => (
              <Pressable onPress={handleSearchPress} style={styles.searchButtonContainer}>
                <LinearGradient colors={['#4f46e5', '#a855f7']} style={styles.searchButtonGradient}>
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
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  searchButtonContainer: { top: -30, justifyContent: 'center', alignItems: 'center' },
  searchButtonGradient: {
    width: 65, height: 65, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#0f172a',
  },
});