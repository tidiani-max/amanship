import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { Product, CartItem as CartItemType } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CartContextType {
  items: CartItemType[];
  isLoading: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ✅ Storage keys for tracking location
const CART_LOCATION_KEY = "@zendo_cart_location";
const LOCATION_THRESHOLD_KM = 5; // Clear cart if user moves more than 5km

// ✅ Distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ✅ API response type that matches your backend
interface CartItemFromAPI {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  storeId: string;
  product: {
    id: string;
    name: string;
    brand: string;
    price: number;
    originalPrice: number | null;
    image: string | null;
    categoryId: string;
    description: string | null;
    nutrition: any;
    inStock?: boolean;
    stockCount?: number;
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { location } = useLocation();
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // ✅ Load last location on mount
  useEffect(() => {
    loadLastLocation();
  }, []);

  // ✅ Check location changes and clear cart if moved too far
  useEffect(() => {
    if (!location?.latitude || !location?.longitude) return;
    if (!user?.id) return;

    checkLocationChange(location.latitude, location.longitude);
  }, [location, user?.id]);

  const loadLastLocation = async () => {
    try {
      const stored = await AsyncStorage.getItem(CART_LOCATION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLastLocation(parsed);
        console.log(`📍 Loaded last cart location: ${parsed.lat}, ${parsed.lng}`);
      }
    } catch (error) {
      console.error("❌ Failed to load last location:", error);
    }
  };

  const saveLocation = async (lat: number, lng: number) => {
    try {
      const locationData = { lat, lng };
      await AsyncStorage.setItem(CART_LOCATION_KEY, JSON.stringify(locationData));
      setLastLocation(locationData);
      console.log(`✅ Saved cart location: ${lat}, ${lng}`);
    } catch (error) {
      console.error("❌ Failed to save location:", error);
    }
  };

  const checkLocationChange = async (newLat: number, newLng: number) => {
    if (!lastLocation) {
      // First time - just save location
      await saveLocation(newLat, newLng);
      return;
    }

    const distance = calculateDistance(
      lastLocation.lat,
      lastLocation.lng,
      newLat,
      newLng
    );

    console.log(`📏 Distance from last cart location: ${distance.toFixed(2)}km`);

    if (distance > LOCATION_THRESHOLD_KM) {
      console.log(`⚠️ User moved ${distance.toFixed(2)}km - clearing cart`);
      
      // Clear cart on server
      await clearCartMutation.mutateAsync();
      
      // Save new location
      await saveLocation(newLat, newLng);
      
      // Show notification to user
      console.log("🔔 Cart cleared due to location change");
    }
  };

  const { data: cartData = [], isLoading } = useQuery<CartItemFromAPI[]>({
    queryKey: ["/api/cart", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cart?userId=${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  // ✅ Map API response to your CartItem type
  const items: CartItemType[] = React.useMemo(() => {
    return cartData.map((item): CartItemType => ({
      product: {
        id: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        price: item.product.price,
        originalPrice: item.product.originalPrice ?? undefined,
        image: item.product.image ?? undefined,
        categoryId: item.product.categoryId,
        category: item.product.categoryId, // For backward compatibility
        description: item.product.description ?? "",
        nutrition: item.product.nutrition,
        inStock: item.product.inStock,
        stockCount: item.product.stockCount,
        storeId: item.storeId,
      },
      quantity: item.quantity,
      cartItemId: item.id,
    }));
  }, [cartData]);

  const addMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const res = await apiRequest("POST", "/api/cart", { 
        productId, 
        quantity, 
        userId: user?.id 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) => {
      const res = await apiRequest("PUT", `/api/cart/${cartItemId}`, { quantity });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (cartItemId: string) => {
      const res = await apiRequest("DELETE", `/api/cart/${cartItemId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
    },
  });



const clearCartMutation = useMutation({
  mutationFn: async () => {
    if (!user?.id) {
      console.warn("Cannot clear cart: No user ID");
      return { success: true }; // Return success to prevent error
    }

    try {
      const res = await apiRequest("DELETE", `/api/cart?userId=${user.id}`);
      
      // ✅ FIX: Check if response is ok before parsing
      if (!res.ok) {
        console.error(`❌ Clear cart failed: ${res.status} ${res.statusText}`);
        // If cart is already empty (404), treat as success
        if (res.status === 404) {
          console.log("Cart already empty, treating as success");
          return { success: true };
        }
        throw new Error(`Failed to clear cart: ${res.status}`);
      }

      return res.json();
    } catch (error) {
      console.error("❌ Clear cart error:", error);
      // Don't throw - just log and return success to prevent UI errors
      return { success: true };
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
  },
  onError: (error) => {
    console.error("❌ Clear cart mutation error:", error);
    // Invalidate anyway to refresh cart state
    queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
  },
});

  const addToCart = useCallback((product: Product, quantity = 1) => {
    if (!user?.id) {
      console.warn("Cannot add to cart: User not logged in");
      return;
    }
    addMutation.mutate({ productId: product.id, quantity });
  }, [addMutation, user?.id]);

  const removeFromCart = useCallback((productId: string) => {
    const item = items.find((i) => i.product.id === productId);
    if (item?.cartItemId) {
      removeMutation.mutate(item.cartItemId);
    }
  }, [items, removeMutation]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const item = items.find((i) => i.product.id === productId);
    if (item?.cartItemId) {
      if (quantity <= 0) {
        removeMutation.mutate(item.cartItemId);
      } else {
        updateMutation.mutate({ cartItemId: item.cartItemId, quantity });
      }
    }
  }, [items, updateMutation, removeMutation]);

  const clearCart = useCallback(() => {
    if (!user?.id) {
      console.warn("Cannot clear cart: User not logged in");
      return;
    }
    clearCartMutation.mutate();
  }, [clearCartMutation, user?.id]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}