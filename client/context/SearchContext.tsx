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
  const [searchState, setSearchState] = useState<SearchState>({
    isActive: false,
    scope: 'global',
    query: '',
  });
  
  const [homeSearchRef, setHomeSearchRef] = useState<React.RefObject<any> | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const isSearchActive = searchState.isActive;
  const searchScope = searchState.scope;
  const searchQuery = searchState.query;

  const setIsSearchActive = useCallback((active: boolean) => {
    // ENHANCED: Log the FULL call stack to find the culprit
    const stack = new Error().stack;
    console.log('🔄 setIsSearchActive called:', active);
    console.log('📍 Full Stack Trace:');
    if (stack) {
      const lines = stack.split('\n').slice(1, 10); // First 10 lines
      lines.forEach((line, i) => {
        console.log(`   ${i}: ${line.trim()}`);
      });
    }
    
    setSearchState(prev => {
      console.log('   Previous state:', prev.isActive, '→ New state:', active);
      return { ...prev, isActive: active };
    });
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