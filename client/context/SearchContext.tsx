import React, { createContext, useContext, useState, useRef } from 'react';

export type SearchScope = 'global' | 'category' | 'history' | 'deals' | 'profile';

interface SearchContextType {
  // Search state
  isSearchActive: boolean;
  setIsSearchActive: (active: boolean) => void;
  
  // Search scope (which page we're searching from)
  searchScope: SearchScope;
  setSearchScope: (scope: SearchScope) => void;
  
  // Search query
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Reference to home screen search input (for auto-focus)
  homeSearchRef: React.RefObject<any> | null;
  setHomeSearchRef: (ref: React.RefObject<any> | null) => void;
  
  // Category-specific search context
  activeCategoryId: string | null;
  setActiveCategoryId: (id: string | null) => void;
  
  // Methods
  triggerSearch: () => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchScope, setSearchScope] = useState<SearchScope>('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [homeSearchRef, setHomeSearchRef] = useState<React.RefObject<any> | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const triggerSearch = () => {
    setIsSearchActive(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchActive(false);
  };

  const value: SearchContextType = {
    isSearchActive,
    setIsSearchActive,
    searchScope,
    setSearchScope,
    searchQuery,
    setSearchQuery,
    homeSearchRef,
    setHomeSearchRef,
    activeCategoryId,
    setActiveCategoryId,
    triggerSearch,
    clearSearch,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}