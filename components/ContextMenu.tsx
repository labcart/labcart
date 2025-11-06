'use client';

import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string; // e.g., "F2", "Delete"
}

export interface ContextMenuSection {
  items: ContextMenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  sections: ContextMenuSection[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, sections, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off-screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (rect.right > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 8;
      }

      if (rect.bottom > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 8;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[220px] rounded shadow-xl border animate-fade-in-scale"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        backgroundColor: 'var(--background)',
        borderColor: 'var(--border)',
        padding: '4px 0'
      }}
    >
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex}>
          {section.items.map((item, itemIndex) => (
            <button
              key={itemIndex}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  onClose();
                }
              }}
              disabled={item.disabled}
              className="w-full text-left px-3 py-1.5 text-sm flex items-center justify-between transition-colors"
              style={{
                color: item.disabled ? 'rgba(44, 40, 38, 0.4)' : item.danger ? '#dc3545' : 'var(--text)',
                cursor: item.disabled ? 'default' : 'pointer',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!item.disabled) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <span>{item.label}</span>
              {item.shortcut && (
                <span style={{ opacity: 0.5, fontSize: '11px', marginLeft: '24px' }}>
                  {item.shortcut}
                </span>
              )}
            </button>
          ))}
          {sectionIndex < sections.length - 1 && (
            <div className="h-px mx-2 my-1" style={{ backgroundColor: 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  );
}
