'use client';

import { useState, useEffect, useRef } from 'react';

interface DeleteButtonProps {
  onDelete: () => void | Promise<void>;
  label?: string;
  className?: string;
  countdown?: number;
}

export default function DeleteButton({
  onDelete,
  label = 'Delete',
  className = 'btn btn-danger btn-small',
  countdown = 3,
}: DeleteButtonProps) {
  const [state, setState] = useState<'idle' | 'counting' | 'deleting'>('idle');
  const [count, setCount] = useState(countdown);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleClick = async () => {
    if (state === 'idle') {
      setState('counting');
      setCount(countdown);
      timerRef.current = setInterval(() => {
        setCount((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            setState('deleting');
            Promise.resolve(onDelete()).finally(() => {
              setState('idle');
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (state === 'counting') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setState('deleting');
      try {
        await onDelete();
      } catch (err) {
        console.error(err);
      }
      setState('idle');
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setState('idle');
    setCount(countdown);
  };

  if (state === 'deleting') {
    return (
      <button className={className} disabled style={{ opacity: 0.5 }}>
        ...
      </button>
    );
  }

  if (state === 'counting') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <button
          className={className}
          onClick={handleClick}
          style={{
            animation: 'pulse 0.6s ease-in-out infinite',
            minWidth: 60,
          }}
        >
          {count}s ✓
        </button>
        <button
          className="btn btn-secondary btn-small"
          onClick={handleCancel}
          style={{ padding: '4px 8px', fontSize: '0.7rem' }}
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <button className={className} onClick={handleClick}>
      {label}
    </button>
  );
}
