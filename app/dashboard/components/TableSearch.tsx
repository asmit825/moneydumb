import { useRef, useEffect } from 'react';

interface TableSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function TableSearch({
  searchQuery,
  setSearchQuery,
  isOpen,
  setIsOpen,
}: TableSearchProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  return (
    <div className="table-search-container" ref={containerRef}>
      <button
        type="button"
        className={`table-search-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Search table"
      >
        <span className="material-symbols-rounded" style={{ fontSize: '1.25rem' }}>search</span>
      </button>
      {isOpen && (
        <div className="table-search-popup fade-in">
          <span className="material-symbols-rounded search-popup-icon">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>close</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
