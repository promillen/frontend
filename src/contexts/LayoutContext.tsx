import React, { createContext, useContext, useState, ReactNode } from 'react';

type LayoutType = 'classic' | 'modern';

interface LayoutContextType {
  layout: LayoutType;
  setLayout: (layout: LayoutType) => void;
  toggleLayout: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
  // Load saved layout preference from localStorage, default to classic
  const [layout, setLayout] = useState<LayoutType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('iot-tracker-layout');
      return (saved as LayoutType) || 'classic';
    }
    return 'classic';
  });

  const handleSetLayout = (newLayout: LayoutType) => {
    setLayout(newLayout);
    localStorage.setItem('iot-tracker-layout', newLayout);
  };

  const toggleLayout = () => {
    const newLayout = layout === 'classic' ? 'modern' : 'classic';
    handleSetLayout(newLayout);
  };

  return (
    <LayoutContext.Provider value={{ layout, setLayout: handleSetLayout, toggleLayout }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};