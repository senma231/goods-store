import React, { createContext, useContext, useState, useEffect } from 'react';
import { cart as cartApi } from '@/lib/api';
import { useAuth } from './AuthContext';
import type { CartItem, Product } from '@/types';

interface CartContextType {
  cartItems: CartItem[];
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function refreshCart() {
    setLoading(true);
    try {
      const { items } = await cartApi.get();
      setCartItems(items);
    } catch (error) {
      console.error('获取购物车失败:', error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshCart();
  }, [user]);

  async function addToCart(productId: string, quantity: number = 1) {
    try {
      await cartApi.add(productId, quantity);
      await refreshCart();
    } catch (error) {
      console.error('添加到购物车失败:', error);
      throw error;
    }
  }

  async function removeFromCart(cartItemId: string) {
    try {
      await cartApi.remove(cartItemId);
      await refreshCart();
    } catch (error) {
      console.error('删除购物车项失败:', error);
      throw error;
    }
  }

  async function updateQuantity(cartItemId: string, quantity: number) {
    if (quantity <= 0) {
      await removeFromCart(cartItemId);
      return;
    }

    try {
      await cartApi.update(cartItemId, quantity);
      await refreshCart();
    } catch (error) {
      console.error('更新购物车数量失败:', error);
      throw error;
    }
  }

  async function clearCart() {
    try {
      await cartApi.clear();
      setCartItems([]);
    } catch (error) {
      console.error('清空购物车失败:', error);
      throw error;
    }
  }

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart必须在CartProvider内使用');
  }
  return context;
}
