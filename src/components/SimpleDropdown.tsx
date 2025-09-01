import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SimpleDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
}

const SimpleDropdown: React.FC<SimpleDropdownProps> = ({ isOpen, onClose, trigger, children }) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const getDropdownPosition = () => {
    if (!triggerRef.current) return { top: 0, left: 0 };
    
    const rect = triggerRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: rect.left,
    };
  };

  return (
    <>
      <div ref={triggerRef}>
        {trigger}
      </div>
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-background border shadow-xl rounded-md p-2 z-[9999]"
          style={getDropdownPosition()}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
};

export default SimpleDropdown;