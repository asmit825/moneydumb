import { useState, useMemo } from 'react';

export default function useTable<T extends Record<string, any>>(
  data: T[] = [],
  options: {
    searchKeys?: Array<keyof T | ((item: T) => any)>;
    sortExtractors?: Record<string, (item: T) => any>;
    defaultSort?: { key: string; direction: 'asc' | 'desc' | null };
  } = {}
) {
  const { searchKeys, sortExtractors, defaultSort } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key || null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(defaultSort?.direction || null);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        direction = 'desc';
      } else if (sortDirection === 'desc') {
        direction = null;
        key = '';
      }
    }
    setSortKey(key || null);
    setSortDirection(direction);
  };

  const processedData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    let result = [...data];
    const query = searchQuery.toLowerCase().trim();

    // 1. Filter by Search Query
    if (query) {
      result = result.filter((item) => {
        if (!item) return false;

        if (Array.isArray(searchKeys) && searchKeys.length > 0) {
          return searchKeys.some((k) => {
            const val = typeof k === 'function' ? k(item) : item[k as string];
            if (val == null) return false;
            return String(val).toLowerCase().includes(query);
          });
        }

        return Object.values(item).some((val) => {
          if (val == null) return false;
          return String(val).toLowerCase().includes(query);
        });
      });
    }

    // 2. Sort by Active Key
    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        let aVal = sortExtractors && typeof sortExtractors[sortKey] === 'function'
          ? sortExtractors[sortKey](a)
          : a[sortKey];
        
        let bVal = sortExtractors && typeof sortExtractors[sortKey] === 'function'
          ? sortExtractors[sortKey](b)
          : b[sortKey];

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal === bVal) return 0;
        if (aVal == null || aVal === '') return 1;
        if (bVal == null || bVal === '') return -1;

        const aNum = Number(aVal);
        const bNum = Number(bVal);
        if (!isNaN(aNum) && !isNaN(bNum) && typeof aVal !== 'boolean' && typeof bVal !== 'boolean') {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, searchKeys, sortKey, sortDirection, sortExtractors]);

  return {
    data: processedData,
    sortKey,
    sortDirection,
    requestSort,
    searchQuery,
    setSearchQuery,
    searchOpen,
    setSearchOpen,
  };
}
