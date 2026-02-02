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

// Helper to get the deepest active route name in navigation state
function getActiveRouteName(state: NavigationState | undefined): string {
  if (!state) return 'Home';
  
  const route = state.routes[state.index];
  if (!route) return 'Home';
  
  // If this route has nested state, recurse
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  
  return route.name;
}

export default function MainTabNavigator() {
  const navigation = useNavigation();
  const { 
    setIsSearchActive, 
    setSearchScope, 
    homeSearchRef,
    setActiveCategoryId,
    searchScope,
  } = useSearch();

  const handleSearchPress = () => {
    const state = navigation.getState();
    const activeRouteName = getActiveRouteName(state);

    console.log("🔍 Search pressed from route:", activeRouteName);

    // HOME SCREEN BEHAVIOR - Focus existing search bar
    if (activeRouteName === 'Home') {
      if (homeSearchRef?.current) {
        console.log("✅ Focusing home search bar");
        homeSearchRef.current.focus();
      } else {
        console.warn('⚠️ Home search ref not available');
      }
      return;
    }

    // CATEGORY SCREEN BEHAVIOR - Search within category
    if (activeRouteName === 'Category') {
      setSearchScope('category');
      setIsSearchActive(true);
      return;
    }

    // OTHER SCREENS BEHAVIOR - Show overlay with appropriate scope
    const scopeMap: Record<string, SearchScope> = {
      'HistoryTab': 'history',
      'DealsTab': 'deals',
      'AccountTab': 'profile',
    };

    const scope = scopeMap[activeRouteName] || 'global';
    setSearchScope(scope);
    setIsSearchActive(true);

    // Navigate to home if on unsupported screen
    if (!scopeMap[activeRouteName] && activeRouteName !== 'Home' && activeRouteName !== 'Category') {
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