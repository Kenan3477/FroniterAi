import React, { useState, createContext, useContext, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType | null>(null);

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  defaultValue = '',
  children
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  
  const currentValue = value ?? internalValue;
  
  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setInternalValue(newValue);
    }
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ 
      value: currentValue, 
      onValueChange: handleValueChange,
      open,
      onOpenChange: setOpen
    }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

const SelectTrigger: React.FC<SelectTriggerProps> = ({ children, className = '' }) => {
  const context = useContext(SelectContext);
  
  if (!context) {
    throw new Error('SelectTrigger must be used within Select');
  }

  const { open, onOpenChange } = context;

  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => onOpenChange(!open)}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
};

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder = 'Select...', className = '' }) => {
  const context = useContext(SelectContext);
  
  if (!context) {
    throw new Error('SelectValue must be used within Select');
  }

  const { value } = context;

  return (
    <span className={className}>
      {value || placeholder}
    </span>
  );
};

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

const SelectContent: React.FC<SelectContentProps> = ({ children, className = '' }) => {
  const context = useContext(SelectContext);
  const contentRef = useRef<HTMLDivElement>(null);
  
  if (!context) {
    throw new Error('SelectContent must be used within Select');
  }

  const { open, onOpenChange } = context;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm ${className}`}
    >
      {children}
    </div>
  );
};

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const SelectItem: React.FC<SelectItemProps> = ({ value, children, className = '' }) => {
  const context = useContext(SelectContext);
  
  if (!context) {
    throw new Error('SelectItem must be used within Select');
  }

  const { value: selectedValue, onValueChange } = context;
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      className={`relative w-full cursor-pointer select-none py-2 pl-3 pr-9 text-left hover:bg-gray-100 ${
        isSelected ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
      } ${className}`}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  );
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };