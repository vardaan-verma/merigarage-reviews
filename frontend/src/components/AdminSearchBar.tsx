import React, { useState, useEffect } from 'react';

interface AdminSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  debounceMs?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const AdminSearchBar: React.FC<AdminSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  disabled = false,
  className = '',
  id,
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync internal state when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced notification to parent
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [localValue, debounceMs, onChange, value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className={`admin-search-bar relative flex items-center ${className}`}>
      <span className="material-symbols-outlined absolute left-3.5 text-muted pointer-events-none text-base">
        search
      </span>
      <input
        type="text"
        id={id}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-surface-raised border border-border rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 text-muted hover:text-white transition-colors flex items-center justify-center p-0.5"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </div>
  );
};
