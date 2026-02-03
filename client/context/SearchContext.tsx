import React, { createContext, useContext, useState, useCallback } from 'react';

export type SearchScope = 'global' | 'category' | 'history' | 'deals' | 'profile';

interface SearchState {
  isActive: boolean;
  scope: SearchScope;
  query: string;
}

interface SearchContextType {
  isSearchActive: boolean;
  setIsSearchActive: (active: boolean) => void;
  
  searchScope: SearchScope;
  setSearchScope: (scope: SearchScope) => void;
  
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  homeSearchRef: React.RefObject<any> | null;
  setHomeSearchRef: (ref: React.RefObject<any> | null) => void;
  
  activeCategoryId: string | null;
  setActiveCategoryId: (id: string | null) => void;
  
  triggerSearch: (scope: SearchScope) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  // CRITICAL FIX: Combine related states to avoid race conditions
  const [searchState, setSearchState] = useState<SearchState>({
    isActive: false,
    scope: 'global',
    query: '',
  });
  
  const [homeSearchRef, setHomeSearchRef] = useState<React.RefObject<any> | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Expose individual values for backward compatibility
  const isSearchActive = searchState.isActive;
  const searchScope = searchState.scope;
  const searchQuery = searchState.query;

  const setIsSearchActive = useCallback((active: boolean) => {
    // DEBUGGING: Log the call stack to find who's setting it to false
    console.log('🔄 setIsSearchActive called:', active, 'from:', new Error().stack?.split('\n')[2]);
    setSearchState(prev => ({ ...prev, isActive: active }));
  }, []);

  const setSearchScope = useCallback((scope: SearchScope) => {
    console.log('🔄 setSearchScope called:', scope);
    setSearchState(prev => ({ ...prev, scope }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    console.log('🔄 setSearchQuery called:', query);
    setSearchState(prev => ({ ...prev, query }));
  }, []);

  const triggerSearch = useCallback((scope: SearchScope) => {
    console.log('🔍 triggerSearch called with scope:', scope);
    
    // CRITICAL FIX: Single state update = single render cycle
    setSearchState({
      isActive: true,
      scope: scope,
      query: '',
    });
    
    console.log('✅ Search state updated to active');
  }, []);

  const clearSearch = useCallback(() => {
    console.log('🧹 clearSearch called');
    setSearchState({
      isActive: false,
      scope: 'global',
      query: '',
    });
  }, []);

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