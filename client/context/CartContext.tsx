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

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/cart?userId=${user?.id}`);
      return res.json();
    },
    onSuccess: () => {
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
    clearMutation.mutate();
  }, [clearMutation, user?.id]);

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