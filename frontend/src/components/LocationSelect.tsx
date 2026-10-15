import React from 'react';
import { getAllStates, getCitiesForState } from '../data/indiaLocations';

interface StateSelectProps {
  id?: string;
  value: string;
  onChange: (state: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export const StateSelect: React.FC<StateSelectProps> = ({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  className = 'form-control',
  placeholder = 'Select Indian State / UT',
}) => {
  const states = getAllStates();

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      className={className}
      aria-label="Select Indian State or Union Territory"
    >
      <option value="">{placeholder}</option>
      {states.map((st) => (
        <option key={st} value={st}>
          {st}
        </option>
      ))}
    </select>
  );
};

interface CitySelectProps {
  id?: string;
  selectedState?: string | null;
  value: string;
  onChange: (city: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  allowCustom?: boolean;
}

export const CitySelect: React.FC<CitySelectProps> = ({
  id,
  selectedState,
  value,
  onChange,
  disabled = false,
  required = false,
  className = 'form-control',
  placeholder = 'Select City',
  allowCustom = true,
}) => {
  const cities = React.useMemo(() => getCitiesForState(selectedState), [selectedState]);
  const [customModeOverride, setCustomModeOverride] = React.useState<boolean | null>(null);

  // If user hasn't explicitly toggled, auto-enable custom mode if value exists but isn't in predefined list
  const isCustomMode = customModeOverride !== null
    ? customModeOverride
    : Boolean(value && cities.length > 0 && !cities.includes(value));

  if (!selectedState) {
    return (
      <select
        id={id}
        disabled
        className={className}
        aria-label="City selector disabled"
      >
        <option value="">Select State first</option>
      </select>
    );
  }

  if (isCustomMode && allowCustom) {
    return (
      <div className="flex gap-2 items-center">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className={className}
          placeholder="Enter city name..."
          aria-label="Custom City Name"
        />
        <button
          type="button"
          className="btn btn-secondary btn-xs whitespace-nowrap"
          onClick={() => {
            setCustomModeOverride(false);
            if (cities.length > 0) onChange(cities[0]);
          }}
          title="Return to standard city list"
        >
          List
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <select
        id={id}
        value={value}
        onChange={(e) => {
          if (e.target.value === '__CUSTOM__') {
            setCustomModeOverride(true);
            onChange('');
          } else {
            onChange(e.target.value);
          }
        }}
        disabled={disabled}
        required={required}
        className={className}
        aria-label="Select City"
      >
        <option value="">{placeholder}</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        {allowCustom && <option value="__CUSTOM__">Other / Custom City...</option>}
      </select>
    </div>
  );
};
