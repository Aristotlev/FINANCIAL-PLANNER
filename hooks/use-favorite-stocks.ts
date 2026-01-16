"use client";

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'omnifolio-favorite-stocks';
const MAX_FAVORITES = 50;

export interface FavoriteStock {
  symbol: string;
  addedAt: number;
}

export function useFavoriteStocks() {
  const [favorites, setFavorites] = useState<FavoriteStock[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavorites(parsed);
      }
    } catch (error) {
      console.error('Error loading favorite stocks:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error('Error saving favorite stocks:', error);
      }
    }
  }, [favorites, isLoaded]);

  const addFavorite = useCallback((symbol: string): boolean => {
    const upperSymbol = symbol.toUpperCase();
    
    // Check if already favorited
    if (favorites.some(f => f.symbol === upperSymbol)) {
      return false;
    }
    
    // Check max limit
    if (favorites.length >= MAX_FAVORITES) {
      return false;
    }
    
    setFavorites(prev => [...prev, { symbol: upperSymbol, addedAt: Date.now() }]);
    return true;
  }, [favorites]);

  const removeFavorite = useCallback((symbol: string) => {
    const upperSymbol = symbol.toUpperCase();
    setFavorites(prev => prev.filter(f => f.symbol !== upperSymbol));
  }, []);

  const toggleFavorite = useCallback((symbol: string): boolean => {
    const upperSymbol = symbol.toUpperCase();
    const isFavorited = favorites.some(f => f.symbol === upperSymbol);
    
    if (isFavorited) {
      removeFavorite(upperSymbol);
      return false;
    } else {
      return addFavorite(upperSymbol);
    }
  }, [favorites, addFavorite, removeFavorite]);

  const isFavorite = useCallback((symbol: string): boolean => {
    return favorites.some(f => f.symbol.toUpperCase() === symbol.toUpperCase());
  }, [favorites]);

  const getFavoriteSymbols = useCallback((): string[] => {
    return favorites.map(f => f.symbol);
  }, [favorites]);

  const clearAllFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    getFavoriteSymbols,
    clearAllFavorites,
    favoriteCount: favorites.length,
    maxFavorites: MAX_FAVORITES,
    canAddMore: favorites.length < MAX_FAVORITES,
    isLoaded,
  };
}
