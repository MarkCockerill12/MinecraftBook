"use client"

import { useRef, useEffect, useState } from "react"
import { debounce } from "lodash"
import { 
  CHARS_PER_PAGE, 
  MIN_FONT_SIZE, 
  MAX_FONT_SIZE, 
  PADDING_VERTICAL, 
  REGULAR_MODE, 
  EDITOR_MODE,
  MOBILE_MODE,
  TEXT_STYLE 
} from "@/lib/book-config"

interface BookPageProps {
  readonly content: string
  readonly onChange: (text: string) => void
  readonly pageNumber: number
  charLimit?: number // Optional override for per-page char limit
  mode?: 'mobile' | 'desktop' | 'editor' // Explicit mode
}

export default function BookPage({ content, onChange, pageNumber, scale = 1, charLimit, mode }: Readonly<BookPageProps & { scale?: number, charLimit?: number, mode?: 'mobile' | 'desktop' | 'editor' }>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(MIN_FONT_SIZE * scale)
  const fontSizeRef = useRef(fontSize)
  const contentRef = useRef(content)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  
  // Track text dimensions to enforce hard limits
  const [maxLines, setMaxLines] = useState(EDITOR_MODE.linesPerPage)
  const [maxCharsPerLine, setMaxCharsPerLine] = useState(EDITOR_MODE.charsPerLine)
  const [textAreaHeight, setTextAreaHeight] = useState<number | null>(null)

  // Get layout-specific sizing constants based on mode
  const getOptimalSizingConstantsForLayout = () => {
    if (mode === 'mobile') return MOBILE_MODE;
    if (mode === 'editor') return EDITOR_MODE;
    return REGULAR_MODE;
  };

  // Utility to get the correct char limit for the current mode
  const getCharLimit = () => {
    if (typeof charLimit === 'number') return charLimit;
    // Desktop always uses CHARS_PER_PAGE
    return CHARS_PER_PAGE;
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
    
    // Save these values for the hard limits
    setMaxLines(linesPerPage);
    setMaxCharsPerLine(charsPerLine);
    
    // Calculate horizontal and vertical space constraints
    const widthPerChar = containerWidth / charsPerLine;
    const heightPerLine = containerHeight / linesPerPage;
    
    // Minecraft font is roughly square, so we use the minimum dimension
    let calculatedFontSize = Math.min(widthPerChar * 2.5, heightPerLine);
    
    // Apply the fill factor to ensure text fits properly
    calculatedFontSize *= fillFactor;
    
    // Calculate the exact height for the text area based on these dimensions
    setTextAreaHeight(linesPerPage * calculatedFontSize * TEXT_STYLE.lineHeightFactor);
    
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
    }, 10)
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

  // Always update maxLines and maxCharsPerLine when mode changes
  useEffect(() => {
    const { linesPerPage, charsPerLine } = getOptimalSizingConstantsForLayout();
    setMaxLines(linesPerPage);
    setMaxCharsPerLine(charsPerLine);
  }, [mode]);

  // Force recalculation when editor mode changes
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

    // Observe all parent elements for attribute changes that might affect layout
    let element: HTMLElement | null = containerRef.current;
    while (element && element !== document.body) {
      mutationObserver.observe(element, { 
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      element = element.parentElement;
    }

    // Observe the document body for global class changes
    mutationObserver.observe(document.body, { 
      attributes: true,
      attributeFilter: ['class']
    });

    // Force a recalculation on initial render and mode change
    recalculateSize();

    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  // Recalculate when content changes significantly
  useEffect(() => {
    // Check if content length has changed enough to warrant recalculation
    const contentLengthChanged = Math.abs((content?.length || 0) - (contentRef.current?.length || 0)) > 5
    
    if (contentLengthChanged) {
      contentRef.current = content
      
      // Recalculate font size since content changed substantially
      const newSize = calculateOptimalFontSize()
      if (Math.abs(newSize - fontSizeRef.current) > 0.5) {
        setFontSize(newSize)
        fontSizeRef.current = newSize
      }
    }
  }, [content]);

  // Add effect to stabilize maxCharsPerLine and prevent random changes
  useEffect(() => {
    // Cache the initial values once they're calculated
    const stableCharsPerLine = maxCharsPerLine;
    const stableMaxLines = maxLines;
    
    // Add a stability mechanism to prevent random changes in dimensions
    let timeoutId: NodeJS.Timeout;
    
    const checkForUnintendedChanges = () => {
      // If values changed for no good reason, reset them
      if (maxCharsPerLine !== stableCharsPerLine || maxLines !== stableMaxLines) {
        // Force recalculation with latest measurements
        const newSize = calculateOptimalFontSize();
        setFontSize(newSize);
        fontSizeRef.current = newSize;
      }
      
      // Continue checking periodically
      timeoutId = setTimeout(checkForUnintendedChanges, 2000);
    };
    
    // Start checking
    timeoutId = setTimeout(checkForUnintendedChanges, 2000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [maxCharsPerLine, maxLines]);

  // Process text to enforce line and character limits
  const enforceTextConstraints = (text: string): string => {
    const lines = text.split('\n');
    
    // Limit the number of lines
    if (lines.length > maxLines) {
      lines.length = maxLines;
    }
    
    // Limit the characters per line
    const constrainedLines = lines.map(line => 
      line.length > maxCharsPerLine ? line.substring(0, maxCharsPerLine) : line
    );
    
    // Limit total characters
    let result = constrainedLines.join('\n');
    const charLimit = getCharLimit();
    if (result.length > charLimit) {
      result = result.substring(0, charLimit);
    }
    
    return result;
  };

  // Handle text input with hard constraints and smart line wrapping
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    const oldValue = content;
    const cursorPosition = e.target.selectionStart;
    
    // For delete operations, just apply normally
    if (newValue.length < oldValue.length) {
      onChange(newValue);
      return;
    }
    
    // Split the text into lines
    const oldLines = oldValue.split('\n');
    const newLines = newValue.split('\n');
    
    // Create a copy to work with
    let processedLines = [...newLines];
    
    // Find which line was modified (and how)
    let modifiedLineIndex = -1;
    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      if (i >= oldLines.length || i >= newLines.length || oldLines[i] !== newLines[i]) {
        modifiedLineIndex = i;
        break;
      }
    }
    
    // If we couldn't identify a modified line, just enforce basic constraints
    if (modifiedLineIndex === -1) {
      const constrained = enforceTextConstraints(newValue);
      onChange(constrained);
      return;
    }
    
    // Process lines to ensure they don't exceed character limits
    // and handle overflow properly
    for (let i = 0; i < processedLines.length; i++) {
      // If this line is too long, we need to handle the overflow
      if (processedLines[i].length > maxCharsPerLine) {
        // Get the content that will remain on this line
        const keepContent = processedLines[i].substring(0, maxCharsPerLine);
        // Get the overflow that needs to move to the next line
        const overflowContent = processedLines[i].substring(maxCharsPerLine);
        
        // Update the current line
        processedLines[i] = keepContent;
        
        // Handle the overflow content
        if (i < processedLines.length - 1) {
          // If there's a next line, prepend the overflow to it
          processedLines[i + 1] = overflowContent + processedLines[i + 1];
        } else if (processedLines.length < maxLines) {
          // If there's no next line but we have room, create a new line
          processedLines.push(overflowContent);
        }
        // Otherwise, the overflow is lost as we're at max lines
      }
    }
    
    // Continue checking subsequent lines for cascade overflow effects
    let checkAgain = true;
    let iterationLimit = 10; // Prevent infinite loops
    
    while (checkAgain && iterationLimit > 0) {
      checkAgain = false;
      iterationLimit--;
      
      for (let i = 0; i < processedLines.length - 1; i++) {
        if (processedLines[i].length > maxCharsPerLine) {
          checkAgain = true;
          
          // Handle overflow to next line
          const keepContent = processedLines[i].substring(0, maxCharsPerLine);
          const overflowContent = processedLines[i].substring(maxCharsPerLine);
          
          processedLines[i] = keepContent;
          processedLines[i + 1] = overflowContent + processedLines[i + 1];
        }
      }
      
      // Handle the last line separately
      const lastIndex = processedLines.length - 1;
      if (processedLines[lastIndex] && processedLines[lastIndex].length > maxCharsPerLine) {
        const keepContent = processedLines[lastIndex].substring(0, maxCharsPerLine);
        const overflowContent = processedLines[lastIndex].substring(maxCharsPerLine);
        
        processedLines[lastIndex] = keepContent;
        
        if (processedLines.length < maxLines) {
          processedLines.push(overflowContent);
          checkAgain = true;
        }
      }
    }
    
    // Enforce line limit
    if (processedLines.length > maxLines) {
      processedLines.length = maxLines;
    }
    
    // Join lines and enforce total character limit
    let processedText = processedLines.join('\n');
    const charLimit = getCharLimit();
    if (processedText.length > charLimit) {
      processedText = processedText.substring(0, charLimit);
    }
    
    // Apply changes if the text has changed
    if (processedText !== oldValue) {
      onChange(processedText);
      
      // Attempt to maintain cursor position
      if (textareaRef.current) {
        setTimeout(() => {
          if (textareaRef.current && document.activeElement === textareaRef.current) {
            // Calculate a reasonable cursor position 
            let newCursorPos = cursorPosition;
            
            // If cursor was at the end of a line that wrapped, move to the beginning of the next line
            if (modifiedLineIndex >= 0 && oldLines[modifiedLineIndex] && 
                cursorPosition >= oldLines.slice(0, modifiedLineIndex).join('\n').length + 
                (modifiedLineIndex > 0 ? modifiedLineIndex : 0) + oldLines[modifiedLineIndex].length) {
              // Position at beginning of next line
              const prevLinesLength = processedLines.slice(0, modifiedLineIndex + 1).join('\n').length;
              newCursorPos = prevLinesLength + 1; // +1 for the newline character
            }
            
            textareaRef.current.selectionStart = Math.min(newCursorPos, processedText.length);
            textareaRef.current.selectionEnd = Math.min(newCursorPos, processedText.length);
          }
        }, 0);
      }
    }
  };

  // Visual feedback for character limit
  const isNearLimit = content.length > getCharLimit() * 0.9;
  const isAtLimit = content.length >= getCharLimit();

  // Update font size when scale changes
  useEffect(() => {
    // Force recalculation when scale changes
    const newSize = calculateOptimalFontSize();
    setFontSize(newSize);
  }, [scale]);

  return (
    <div ref={containerRef} className="relative flex-1 flex flex-col h-full overflow-hidden">
      <div className="absolute inset-0 pointer-events-none border-minecraft-page"></div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={e => {
          // Prevent input that would exceed line or char limits
          let value = e.target.value;
          let charLimit = getCharLimit();
          // Remove extra lines
          let lines = value.split('\n').slice(0, maxLines);
          // Remove extra chars per line
          lines = lines.map(line => line.slice(0, maxCharsPerLine));
          // Join and trim to char limit
          let processed = lines.join('\n').slice(0, charLimit);
          if (processed !== value) {
            // If user pasted or typed too much, forcibly trim
            e.target.value = processed;
          }
          onChange(processed);
        }}
        className="flex-1 w-full bg-transparent resize-none outline-none font-minecraft"
        style={{
          fontFamily: TEXT_STYLE.fontFamily,
          fontSize: `${fontSize}px`,
          lineHeight: `${fontSize * TEXT_STYLE.lineHeightFactor}px`,
          color: TEXT_STYLE.color,
          padding: "2px",
          letterSpacing: TEXT_STYLE.letterSpacing,
          fontKerning: "none",
          fontVariantLigatures: "none",
          overflowY: "hidden",
          height: textAreaHeight ? `${textAreaHeight}px` : 'auto',
          maxHeight: "100%",
          wordWrap: "break-word",
          whiteSpace: "pre-wrap",
        }}
        wrap="hard"
        placeholder="Write your text here..."
        maxLength={getCharLimit()}
        onKeyDown={e => {
          // Prevent entering new lines if we're at the maximum
          if (e.key === 'Enter' && content.split('\n').length >= maxLines) {
            e.preventDefault();
          }
          // Prevent typing if at char limit
          if (content.length >= getCharLimit() && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
          }
        }}
      />
      <style>{`
        textarea::placeholder {
          font-family: ${TEXT_STYLE.fontFamily};
          color: rgba(63, 63, 63, 0.7);
          opacity: 0.7;
        }
        .border-minecraft-page {
          box-shadow: inset 0 0 1px rgba(0,0,0,0.1);
          pointer-events: none;
        }
      `}</style>
      {/* Character and line counter with visual feedback */}
      {(() => {
        let colorClass = 'text-[#5d5033]';
        if (isAtLimit) {
          colorClass = 'text-red-600';
        } else if (isNearLimit) {
          colorClass = 'text-amber-600';
        }
        return (
          <div 
            className={`text-center text-xs mt-2 font-minecraft transition-colors duration-200 ${colorClass}`}
            style={{ 
              fontFamily: TEXT_STYLE.fontFamily,
            }}
          >
            {content.length} / {getCharLimit()} characters | Lines: {content.split('\n').length}/{maxLines}
          </div>
        );
      })()}
    </div>
  )
}
