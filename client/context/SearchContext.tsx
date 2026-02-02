import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

export type SearchScope = 'global' | 'history' | 'cart' | 'deals';

export interface SearchContextType {
  globalQuery: string;
  setGlobalQuery: (query: string) => void;
  debouncedQuery: string;
  clearSearch: () => void;
  isSearchActive: boolean;
  setIsSearchActive: (active: boolean) => void;
  searchScope: SearchScope;
  setSearchScope: (scope: SearchScope) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

interface SearchProviderProps {
  children: ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [globalQuery, setGlobalQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [searchScope, setSearchScope] = useState<SearchScope>('global');
  
  // Debounce the search query by 300ms
  const debouncedQuery = useDebounce(globalQuery, 300);

  const clearSearch = useCallback(() => {
    setGlobalQuery('');
    setIsSearchActive(false);
  }, []);

  // Auto-clear search when changing scopes
  useEffect(() => {
    if (searchScope !== 'global') {
      setGlobalQuery('');
    }
  }, [searchScope]);

  const value: SearchContextType = {
    globalQuery,
    setGlobalQuery,
    debouncedQuery,
    clearSearch,
    isSearchActive,
    setIsSearchActive,
    searchScope,
    setSearchScope,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchContextType {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}