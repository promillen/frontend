import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SimpleDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

const SimpleDropdown: React.FC<SimpleDropdownProps> = ({ isOpen, onClose, trigger, children, align = 'left' }) => {
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

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, onClose]);

  const getDropdownPosition = () => {
    if (!triggerRef.current) return { top: 0, left: 0 };
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Approximate dropdown dimensions (can be refined per component)
    const dropdownWidth = 280;
    const dropdownHeight = 300;
    
    // Calculate top position - always below trigger with consistent gap
    let top = triggerRect.bottom + 12;
    
    // If dropdown would go off bottom of screen, position it above the trigger
    if (top + dropdownHeight > viewportHeight - 20) {
      top = triggerRect.top - dropdownHeight - 12;
    }
    
    // Calculate left position based on alignment
    let left = triggerRect.left;
    
    switch (align) {
      case 'right':
        // Align right edge of dropdown with right edge of trigger
        left = triggerRect.right - dropdownWidth;
        break;
      case 'center':
        // Center dropdown under trigger
        left = triggerRect.left + (triggerRect.width - dropdownWidth) / 2;
        break;
      case 'left':
      default:
        // Align left edge of dropdown with left edge of trigger
        left = triggerRect.left;
        break;
    }
    
    // Ensure dropdown stays within viewport bounds
    left = Math.max(16, Math.min(left, viewportWidth - dropdownWidth - 16));
    top = Math.max(16, top);
    
    return { top, left };
  };

  return (
    <>
      <div ref={triggerRef} onClick={(e) => e.stopPropagation()}>
        {trigger}
      </div>
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-background border shadow-xl rounded-md p-2 z-[99999]"
          style={getDropdownPosition()}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
};

export default SimpleDropdown;