import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  description: string;
  size?: 'xs' | 'sm';
  className?: string;
}

/**
 * Compact RTL-aware question-mark help trigger.
 * Opens on hover AND toggles/pins on click, rendered via portal so it never
 * clips inside overflow-hidden cards or horizontally scrollable tables.
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title,
  description,
  size = 'sm',
  className = '',
}) => {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const tooltipId = useId();

  const isOpen = hoverOpen || pinnedOpen;

  const updatePosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const popoverWidth = 276;
    const margin = 12;

    // Prefer opening above the trigger if there is room, otherwise open below
    const openAbove = rect.top > 210;
    const top = openAbove ? rect.top - 10 : rect.bottom + 10;

    // Center horizontally around trigger, clamped cleanly inside viewport
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(
      margin,
      Math.min(window.innerWidth - popoverWidth - margin, left)
    );

    setCoords({ top, left, placement: openAbove ? 'top' : 'bottom' });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleReposition = () => updatePosition();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinnedOpen(false);
        setHoverOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setPinnedOpen(false);
      setHoverOpen(false);
    };

    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearCloseTimer();
    setHoverOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setHoverOpen(false);
    }, 140);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    clearCloseTimer();
    setPinnedOpen((prev) => !prev);
  };

  const iconClass = size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={() => {
          if (!pinnedOpen) setHoverOpen(false);
        }}
        aria-label={`راهنمای ${title}`}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        className={`inline-flex items-center justify-center rounded-full text-[#9A8B84] hover:text-[#C86D2D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C86D2D]/40 transition-colors align-middle shrink-0 no-print ${className}`}
      >
        <HelpCircle className={iconClass} />
      </button>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            id={tooltipId}
            role="tooltip"
            dir="rtl"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '276px',
              transform:
                coords.placement === 'top' ? 'translateY(-100%)' : 'none',
              zIndex: 9999,
            }}
            className="rounded-xl border border-[#DFD5C8] bg-[#FFFFFF] p-3.5 shadow-lg text-right space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-[#F2ECE4]">
              <span className="text-xs font-extrabold text-[#C86D2D] leading-snug">
                {title}
              </span>
              {pinnedOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setPinnedOpen(false);
                    setHoverOpen(false);
                  }}
                  aria-label="بستن راهنما"
                  className="p-0.5 rounded text-[#87756E] hover:text-[#2A1F1D] shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs leading-relaxed text-[#4F403C]">
              {description}
            </p>
          </div>,
          document.body
        )}
    </>
  );
};
