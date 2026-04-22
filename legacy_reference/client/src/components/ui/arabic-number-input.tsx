import { Input } from './input';
import { forwardRef, useState, useEffect } from 'react';

export interface ArabicNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'> {
  'data-testid'?: string;
  onValueChange?: (values: { floatValue?: number; formattedValue: string; value: string }) => void;
  value?: number | string;
}

export const ArabicNumberInput = forwardRef<HTMLInputElement, ArabicNumberInputProps>(
  ({ onValueChange, value, onChange, onBlur, ...props }, ref) => {
    // Maintain local string state to preserve trailing decimals during typing
    const [localValue, setLocalValue] = useState<string>(() => {
      if (value === null || value === undefined || value === '') return '';
      return value.toString();
    });

    // Sync external value changes to local state
    useEffect(() => {
      if (value === null || value === undefined || value === '') {
        setLocalValue('');
      } else {
        setLocalValue(value.toString());
      }
    }, [value]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Input component has already normalized Arabic→English
      const stringValue = e.target.value;
      
      // Update local state immediately (preserves trailing decimals like "10.")
      setLocalValue(stringValue);
      
      // Parse immediately for RHF sync (may be undefined for partial input)
      const cleanValue = stringValue.trim().replace(/[\.\-]+$/, '');
      const floatValue = cleanValue === '' ? undefined : parseFloat(cleanValue);
      
      // Emit both string and parsed float on every change
      // This keeps RHF updated while preserving display string
      onValueChange?.({
        value: stringValue,
        formattedValue: stringValue,
        floatValue: isNaN(floatValue as number) ? undefined : floatValue,
      });
      
      // Call original onChange if provided
      onChange?.(e);
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const stringValue = localValue.trim();
      
      // Remove trailing decimal/minus for clean display
      const cleanValue = stringValue.replace(/[\.\-]+$/, '');
      
      // Parse to float
      const floatValue = cleanValue === '' ? undefined : parseFloat(cleanValue);
      
      // Clean up display: if valid number, show cleaned version
      if (floatValue !== undefined && !isNaN(floatValue)) {
        setLocalValue(floatValue.toString());
      } else if (stringValue === '' || cleanValue === '') {
        setLocalValue('');
      }
      
      // Call original onBlur if provided
      onBlur?.(e);
    };
    
    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    );
  }
);

ArabicNumberInput.displayName = 'ArabicNumberInput';
