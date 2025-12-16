import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | null>(null);

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }> = ({ children, asChild }) => {
  const context = React.useContext(DialogContext);
  
  if (!context) {
    throw new Error('DialogTrigger must be used within a Dialog');
  }

  const { onOpenChange } = context;

  const handleClick = () => {
    onOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      ...children.props,
    });
  }

  return (
    <button onClick={handleClick}>
      {children}
    </button>
  );
};

const DialogContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const context = React.useContext(DialogContext);
  const dialogRef = useRef<HTMLDivElement>(null);

  if (!context) {
    throw new Error('DialogContent must be used within a Dialog');
  }

  const { open, onOpenChange } = context;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
        <div
          ref={dialogRef}
          className={`bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-auto ${className}`}
        >
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          {children}
        </div>
      </div>
    </div>
  );
};

const DialogHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}>
    {children}
  </div>
);

const DialogFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}>
    {children}
  </div>
);

const DialogTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h2>
);

const DialogDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 ${className}`}>
    {children}
  </p>
);

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};