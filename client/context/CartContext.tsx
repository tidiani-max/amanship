import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { Product, CartItem as CartItemType } from "@/types";
import { useAuth } from "@/context/AuthContext";

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

interface CartItemFromAPI {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
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
    inStock: boolean;
    stockCount: number;
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
const { data: cartData = [], isLoading } = useQuery<CartItemFromAPI[]>({
    queryKey: ["/api/cart", user?.id], // Add user.id to the key
    queryFn: async () => {
      // Add the userId to the URL
      const res = await apiRequest("GET", `/api/cart?userId=${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id, // Only fetch if user is logged in
  });

  const items: CartItemType[] = cartData.map((item) => ({
  product: {
    id: item.product.id,
    name: item.product.name,
    brand: item.product.brand,
    price: item.product.price,
    originalPrice: item.product.originalPrice || undefined,
    image: item.product.image || "",
    category: item.product.categoryId,
    description: item.product.description || "",
    nutrition: item.product.nutrition,
  },
  quantity: item.quantity,
  cartItemId: item.id,
}));


const addMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      // Include userId here!
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
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });

const removeMutation = useMutation({
    mutationFn: async (cartItemId: string) => {
      // Ensure this is hitting the correct ID
      const res = await apiRequest("DELETE", `/api/cart/${cartItemId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
    },
  });

const clearMutation = useMutation({
    mutationFn: async () => {
      // Tell the backend WHICH user's cart to clear
      const res = await apiRequest("DELETE", `/api/cart?userId=${user?.id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
    },
  });

  const addToCart = useCallback((product: Product, quantity = 1) => {
    addMutation.mutate({ productId: product.id, quantity });
  }, [addMutation]);

  const removeFromCart = useCallback((productId: string) => {
    const item = items.find((i) => i.product.id === productId);
    if (item && (item as any).cartItemId) {
      removeMutation.mutate((item as any).cartItemId);
    }
  }, [items, removeMutation]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const item = items.find((i) => i.product.id === productId);
    if (item && (item as any).cartItemId) {
      if (quantity <= 0) {
        removeMutation.mutate((item as any).cartItemId);
      } else {
        updateMutation.mutate({ cartItemId: (item as any).cartItemId, quantity });
      }
    }
  }, [items, updateMutation, removeMutation]);

  const clearCart = useCallback(() => {
    clearMutation.mutate();
  }, [clearMutation]);

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
