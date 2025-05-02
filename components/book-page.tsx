"use client"

import { useRef, useEffect, useState } from "react"
import { debounce } from "lodash"

interface BookPageProps {
  readonly content: string
  readonly onChange: (text: string) => void
  readonly pageNumber: number
}

export default function BookPage({ content, onChange, pageNumber }: Readonly<BookPageProps>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(14) // Default font size in px
  const fontSizeRef = useRef(fontSize)
  const contentRef = useRef(content)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Constants for Minecraft font
  const MAX_CHARS = 256
  const PADDING_VERTICAL = 0 // No padding to maximize text space
  const MIN_FONT_SIZE = 10
  const MAX_FONT_SIZE = 48 // Increased to allow larger text

  // Special constants for different layout modes
  const getOptimalSizingConstantsForLayout = () => {
    // Check if we're in editor mode (smaller book)
    const isEditorMode = containerRef.current?.closest('.editor-mode') !== null;
    
    if (isEditorMode) {
      // Sizing for editor mode
      return {
        charsPerLine: 18, // Target characters per line
        linesPerPage: 14, // Target lines per page
        fillFactor: 0.9,  // 90% fill factor for editor mode
      };
    } else {
      // Full-sized book
      return {
        charsPerLine: 14,  // Target characters per line - matches Minecraft
        linesPerPage: 12,  // Target lines per page
        fillFactor: 0.95,  // 95% fill factor for full size
      };
    }
  };

  // Auto-focus on the first page
  useEffect(() => {
    if (pageNumber === 1 && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [pageNumber])

  // Calculate optimal font size based on container dimensions
  const calculateOptimalFontSize = () => {
    if (!containerRef.current) return fontSize;
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight - PADDING_VERTICAL;
    
    if (containerWidth <= 0 || containerHeight <= 0) return fontSize;

    // Get layout-specific sizing constants
    const { charsPerLine, linesPerPage, fillFactor } = getOptimalSizingConstantsForLayout();
    
    // Calculate horizontal and vertical space constraints
    // Width calculation - how big can each character be?
    const widthPerChar = containerWidth / charsPerLine;
    
    // Height calculation - how tall can each line be?
    const heightPerLine = containerHeight / linesPerPage;
    
    // Minecraft font is roughly square, so we can use the minimum dimension
    // to ensure characters fit both horizontally and vertically
    let calculatedFontSize = Math.min(widthPerChar * 2.5, heightPerLine);
    
    // Apply the fill factor to ensure text fits properly
    calculatedFontSize *= fillFactor;
    
    // Enforce min/max constraints
    return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, calculatedFontSize));
  }

  // Handle window resize with debounce to avoid too many calculations
  const debouncedResize = useRef(
    debounce(() => {
      const newSize = calculateOptimalFontSize()
      if (Math.abs(newSize - fontSizeRef.current) > 0.5) {
        setFontSize(newSize)
        fontSizeRef.current = newSize
      }
    }, 10) // Reduced from 100ms to 10ms for faster response
  ).current

  // Set up resize listener, ResizeObserver, and initial calculation
  useEffect(() => {
    fontSizeRef.current = fontSize
    contentRef.current = content
    
    // Initial size calculation
    const initialSize = calculateOptimalFontSize()
    if (initialSize !== fontSize) {
      setFontSize(initialSize)
      fontSizeRef.current = initialSize
    }
    
    // Setup ResizeObserver for more precise container size tracking
    if (containerRef.current && !resizeObserverRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(() => {
        debouncedResize()
      })
      resizeObserverRef.current.observe(containerRef.current)
    }
    
    // Handle window resize
    window.addEventListener('resize', debouncedResize)
    
    return () => {
      window.removeEventListener('resize', debouncedResize)
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      debouncedResize.cancel()
    }
  }, [])

  // Use an observer to detect layout changes from parent containers
  useEffect(() => {
    // Force immediate recalculation when editor is toggled or other layout changes occur
    const recalculateSize = () => {
      const newSize = calculateOptimalFontSize();
      if (Math.abs(newSize - fontSizeRef.current) > 0.5) {
        setFontSize(newSize);
        fontSizeRef.current = newSize;
      }
    };

    // Set up a mutation observer to detect container size changes
    const mutationObserver = new MutationObserver(() => {
      // Delay slightly to allow DOM to settle after class changes
      setTimeout(recalculateSize, 50);
    });

    // Observe all parent elements for attribute changes (specifically class changes)
    let element: HTMLElement | null = containerRef.current;
    while (element && element !== document.body) {
      mutationObserver.observe(element, { 
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      element = element.parentElement;
    }

    // Observe the document body for class changes (in case of global layout shifts)
    mutationObserver.observe(document.body, { 
      attributes: true,
      attributeFilter: ['class']
    });

    // Also force a recalculation on initial render
    recalculateSize();

    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  // Add a resize handler specifically for editor toggle changes
  useEffect(() => {
    const handleResize = () => {
      const newSize = calculateOptimalFontSize();
      if (Math.abs(newSize - fontSizeRef.current) > 0.5) {
        setFontSize(newSize);
        fontSizeRef.current = newSize;
      }
    };

    // Force a recalculation on every render with a slight delay
    const timeoutId = setTimeout(handleResize, 50);
    
    return () => {
      clearTimeout(timeoutId);
    };
  });

  // Recalculate when content changes significantly
  useEffect(() => {
    // Clear previous timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current)
    }
    
    // Check if content length has changed significantly
    const contentLengthChanged = Math.abs((content?.length || 0) - (contentRef.current?.length || 0)) > 5
    
    if (contentLengthChanged) {
      contentRef.current = content
      
      // Delayed recalculation to allow content to render
      resizeTimeoutRef.current = setTimeout(() => {
        const newSize = calculateOptimalFontSize()
        if (Math.abs(newSize - fontSizeRef.current) > 0.5) {
          setFontSize(newSize)
          fontSizeRef.current = newSize
        }
      }, 200)
    }
  }, [content])

  // Visual feedback for character limit
  const isNearLimit = content.length > MAX_CHARS * 0.9
  const isAtLimit = content.length >= MAX_CHARS

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full overflow-hidden">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 w-full bg-transparent resize-none outline-none font-minecraft overflow-hidden"
        style={{
          fontFamily: "var(--font-pixel), 'Minecraft', monospace !important",
          fontSize: `${fontSize}px`,
          lineHeight: `${fontSize * 1.2}px`, // Consistent line height for better readability
          color: "#3F3F3F",
          padding: "2px",
          letterSpacing: "0.02em", // Reduced from 0.05em for more Minecraft-like spacing
          fontKerning: "none", // Keep disabled to prevent character pairs from overlapping
          fontVariantLigatures: "none", // Keep disabled to maintain Minecraft style
        }}
        placeholder="Write your text here..."
        maxLength={MAX_CHARS}
      />
      <style jsx global>{`
        textarea::placeholder {
          font-family: var(--font-pixel), 'Minecraft', monospace !important;
          color: rgba(63, 63, 63, 0.7);
          opacity: 0.7;
        }
      `}</style>
      <div 
        className={`text-center text-xs mt-2 font-minecraft transition-colors duration-200 ${isNearLimit ? (isAtLimit ? 'text-red-600' : 'text-amber-600') : 'text-[#5d5033]'}`}
        style={{ 
          fontFamily: "var(--font-pixel), 'Minecraft', monospace !important",
        }}
      >
        {content.length} / {MAX_CHARS} characters
      </div>
    </div>
  )
}
