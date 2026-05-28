import React from 'react';

interface TableHeaderProps {
  label: string;
  sortKey: string;
  activeKey: string | null;
  activeDirection: 'asc' | 'desc' | null;
  onClick: (key: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function TableHeader({
  label,
  sortKey,
  activeKey,
  activeDirection,
  onClick,
  className = '',
  style = {},
}: TableHeaderProps) {
  const isSorted = activeKey === sortKey;
  const icon = isSorted
    ? activeDirection === 'asc'
      ? 'arrow_upward'
      : 'arrow_downward'
    : 'unfold_more';

  return (
    <th
      onClick={() => onClick(sortKey)}
      className={`sortable ${isSorted ? 'active-sort' : ''} ${className}`}
      style={{ cursor: 'pointer', userSelect: 'none', ...style }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {label}
        <span className="material-symbols-rounded sort-indicator-icon" style={{ fontSize: '0.9rem' }}>
          {icon}
        </span>
      </span>
    </th>
  );
}
