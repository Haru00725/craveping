"use client";

import { useState, useCallback } from "react";
import { Dish } from "./useMenuData";

export interface CartItem {
  dish:     Dish;
  quantity: number;
}

export function useOrderCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((dish: Dish) => {
    setItems(prev => {
      const existing = prev.find(i => i.dish.id === dish.id);
      if (existing) {
        return prev.map(i => i.dish.id === dish.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { dish, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((dishId: string) => {
    setItems(prev => prev
      .map(i => i.dish.id === dishId ? { ...i, quantity: i.quantity - 1 } : i)
      .filter(i => i.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems  = items.reduce((s, i) => s + i.quantity, 0);
  const totalPaise  = items.reduce((s, i) => s + i.dish.price * i.quantity, 0);

  return { items, addItem, removeItem, clearCart, totalItems, totalPaise };
}