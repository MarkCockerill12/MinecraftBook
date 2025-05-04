"use client"

import { useState, useEffect, useRef } from "react"
import BookPage from "./book-page"
import { ChevronLeft, ChevronRight, Download, BookOpen } from "lucide-react"
import html2canvas from 'html2canvas'
import { 
  MAX_PAGES, 
  CHARS_PER_PAGE, 
  EDITOR_MODE, 
  REGULAR_MODE,
  MOBILE_MODE,
  TEXT_STYLE,
  EXPORT_SETTINGS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE
} from "@/lib/book-config"

export interface MinecraftBookProps {
  className?: string;
  onWriteTextRef?: React.MutableRefObject<((text: string) => void) | null>;
  editorEnabled?: boolean;
}

export default function MinecraftBook({ className, onWriteTextRef, editorEnabled }: Readonly<MinecraftBookProps>) {
  const [currentSpread, setCurrentSpread] = useState(0)
  const [bookContent, setBookContent] = useState<string[]>(Array(MAX_PAGES).fill(""))
  const [totalSpreads, setTotalSpreads] = useState(1)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const [isExporting, setIsExporting] = useState(false)
  const bookRef = useRef<HTMLDivElement>(null)
  
  // Calculate the current left and right page numbers
  const leftPageIndex = currentSpread * 2
  const rightPageIndex = currentSpread * 2 + 1

  // Get the appropriate book scale based on mode
  const bookScale = editorEnabled ? EDITOR_MODE.bookScale : REGULAR_MODE.bookScale;

  // Update total spreads when content changes
  useEffect(() => {
    const nonEmptyPages = bookContent.filter((page) => page.trim() !== "").length
    const calculatedSpreads = Math.ceil(nonEmptyPages / 2)
    setTotalSpreads(Math.max(1, calculatedSpreads + (calculatedSpreads < MAX_PAGES / 2 ? 1 : 0)))
  }, [bookContent])

  // Load book content from localStorage on initial render
  useEffect(() => {
    const savedContent = localStorage.getItem("minecraftBookContent")
    if (savedContent) {
      try {
        setBookContent(JSON.parse(savedContent))
      } catch (e) {
        console.error("Failed to load saved book content:", e)
        setBookContent(Array(MAX_PAGES).fill(""))
      }
    }
  }, [])

  // Save content to localStorage when it changes
  const contentRef = useRef(bookContent);
  useEffect(() => {
    // Only update localStorage if content has actually changed
    if (contentRef.current !== bookContent) {
      localStorage.setItem("minecraftBookContent", JSON.stringify(bookContent))
      contentRef.current = bookContent;
    }
  }, [bookContent]);

  const handleTextChange = (text: string, isLeftPage: boolean) => {
    const newBookContent = [...bookContent]
    const pageIndex = isLeftPage ? leftPageIndex : rightPageIndex
    newBookContent[pageIndex] = text.slice(0, CHARS_PER_PAGE)
    setBookContent(newBookContent)
  }

  const nextPage = () => {
    if (currentSpread < MAX_PAGES / 2 - 1 && !isAnimating) {
      setDirection("next")
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentSpread(currentSpread + 1)
        setIsAnimating(false)
      }, 800) // Match this with the CSS animation duration (0.8s)

      // If we're moving to a new blank spread, increment total spreads
      if (currentSpread + 1 >= totalSpreads && totalSpreads < MAX_PAGES / 2) {
        setTotalSpreads(totalSpreads + 1)
      }
    }
  }

  const prevPage = () => {
    if (currentSpread > 0 && !isAnimating) {
      setDirection("prev")
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentSpread(currentSpread - 1)
        setIsAnimating(false)
      }, 800) // Match this with the CSS animation duration (0.8s)
    }
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        prevPage()
      } else if (e.key === "ArrowRight") {
        nextPage()
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentSpread, isAnimating]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Apply Minecraft font to page numbers */
  const pageNumberStyle = {
    fontFamily: TEXT_STYLE.fontFamily,
    fontSize: '12px',
    color: TEXT_STYLE.color,
  };

  // Simple, robust export function that works reliably in browsers
  const exportBook = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    try {
      // Get all pages that have content
      const nonEmptyPageIndices = bookContent
        .map((content, index) => ({ content, index }))
        .filter(({ content }) => content.trim() !== "")
        .map(({ index }) => index);
      
      if (nonEmptyPageIndices.length === 0) {
        alert("No content to export. Please add some text first.");
        setIsExporting(false);
        return;
      }
      
      // Calculate all spreads that need to be exported
      const spreadsToExport = new Set<number>();
      nonEmptyPageIndices.forEach(pageIndex => {
        spreadsToExport.add(Math.floor(pageIndex / 2));
      });
      
      // Convert to array and sort
      const spreadIndices = Array.from(spreadsToExport).sort((a, b) => a - b);
      
      // Remember original state to restore later
      const originalSpread = currentSpread;
      
      // Check if we're on a mobile device
      const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 640;
      
      // Choose the appropriate mode configuration for export
      const modeConfig = isMobileDevice ? MOBILE_MODE : REGULAR_MODE;
      
      // Extract font size based on the appropriate mode config
      const fontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, 24));
      
      // Create a temporary container to attach to the DOM
      const exportContainer = document.createElement('div');
      exportContainer.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 1000px;
        height: 600px;
        overflow: hidden;
      `;
      document.body.appendChild(exportContainer);
      
      // Process each spread one at a time
      for (const spreadIndex of spreadIndices) {
        try {
          // Get current left and right page indices for this spread
          const leftIdx = spreadIndex * 2;
          const rightIdx = spreadIndex * 2 + 1;
          
          // Skip if both pages are empty
          if (!bookContent[leftIdx]?.trim() && !bookContent[rightIdx]?.trim()) {
            continue;
          }
          
          // Adjust font size for mobile if needed
          const textFontSize = isMobileDevice ? 20 : 24; // Slightly smaller font for mobile
          
          // Create the export HTML with maximized text width
          exportContainer.innerHTML = `
            <div class="book-export" style="
              position: relative;
              width: 1000px;
              height: 600px;
              background-image: url('/minecraft-book-open.png');
              background-size: 100% 100%;
              background-repeat: no-repeat;
            ">
              <div class="left-page" style="
                position: absolute;
                left: 0;
                top: 0;
                width: 50%;
                height: 100%;
                padding: 60px 4px 80px 40px;
                box-sizing: border-box;
              ">
                <div style="
                  font-family: monospace;
                  font-size: ${textFontSize}px;
                  white-space: pre-wrap;
                  line-height: 1.2;
                  color: #3F3F3F;
                  letter-spacing: ${TEXT_STYLE.letterSpacing};
                  height: 100%;
                  width: 98%;
                  overflow: hidden;
                  word-break: break-word;
                ">${bookContent[leftIdx] || ''}</div>
              </div>
              <div class="right-page" style="
                position: absolute;
                right: 0;
                top: 0;
                width: 50%;
                height: 100%;
                padding: 60px 40px 80px 4px;
                box-sizing: border-box;
              ">
                <div style="
                  font-family: monospace;
                  font-size: ${textFontSize}px;
                  white-space: pre-wrap;
                  line-height: 1.2;
                  color: #3F3F3F;
                  letter-spacing: ${TEXT_STYLE.letterSpacing};
                  height: 100%;
                  width: 98%;
                  overflow: hidden;
                  word-break: break-word;
                  margin-left: auto;
                ">${bookContent[rightIdx] || ''}</div>
              </div>
              <div class="page-numbers" style="
                position: absolute;
                bottom: 40px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 240px;
                font-family: monospace;
                font-size: 16px;
                color: #3F3F3F;
              ">
                <span>${leftIdx + 1}</span>
                <span>${rightIdx + 1}</span>
              </div>
            </div>
          `;
          
          // Wait for the DOM to update
          await new Promise(r => setTimeout(r, 100));
          
          // Use html2canvas with minimal options
          const bookElement = exportContainer.querySelector('.book-export');
          const canvas = await html2canvas(bookElement as HTMLElement, {
            scale: 2,
            backgroundColor: null,
            logging: false
          });
          
          // Convert to image and download
          canvas.toBlob((blob) => {
            if (!blob) {
              throw new Error("Failed to create image blob");
            }
            
            // Create object URL for the blob
            const url = URL.createObjectURL(blob);
            
            // Create and trigger download link
            const link = document.createElement('a');
            link.href = url;
            link.download = `minecraft-book-pages-${leftIdx + 1}-${rightIdx + 1}.png`;
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
          }, 'image/png');
          
          // Wait between exports
          await new Promise(r => setTimeout(r, 300));
        } catch (error) {
          console.error(`Error exporting spread ${spreadIndex}:`, error);
        }
      }
      
      // Restore original state and clean up
      setCurrentSpread(originalSpread);
      document.body.removeChild(exportContainer);
      
    } catch (error) {
      console.error("Error during export:", error);
      alert("There was an error exporting your book. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Write external text to the book, splitting into pages as needed
  const writeExternalText = (text: string) => {
    if (!text.trim()) return;
    
    // Create a copy of the current book content
    const newBookContent = [...bookContent];
    
    // Split the text into page-sized chunks
    let remainingText = text;
    let pageIndex = 0;
    
    // Find the first empty page to start writing
    while (pageIndex < MAX_PAGES && newBookContent[pageIndex].trim() !== "") {
      pageIndex++;
    }
    
    // Start filling pages with text
    while (remainingText.length > 0 && pageIndex < MAX_PAGES) {
      // Get a chunk of text that fits in a page
      const pageText = remainingText.slice(0, CHARS_PER_PAGE);
      newBookContent[pageIndex] = pageText;
      
      // Remove the used text from the remaining text
      remainingText = remainingText.slice(CHARS_PER_PAGE);
      pageIndex++;
    }
    
    // Update the book content
    setBookContent(newBookContent);
    
    // Navigate to the first page of the newly added content
    const firstNewSpread = Math.floor(Math.max(0, pageIndex - remainingText.length > 0 ? 1 : 0) / 2);
    setCurrentSpread(firstNewSpread);
  };

  // Assign the writeExternalText method to the provided ref
  useEffect(() => {
    if (onWriteTextRef) {
      onWriteTextRef.current = writeExternalText;
    }
  }, [onWriteTextRef]);

  return (
    <div className={`relative mx-auto ${className}`}>
      {/* Book container with dynamic scaling */}
      <div 
        className={`relative w-full max-w-3xl mx-auto ${editorEnabled ? 'editor-mode' : ''} transition-transform duration-300`}
        style={{
          transform: `scale(${bookScale})`,
          transformOrigin: 'center top', // Keep the book aligned at the top when scaled
        }}
      >
        <div ref={bookRef} className="book-container relative aspect-[2/1.2] w-full" data-export-book="true">
          {/* Book background */}
          <div
            className="absolute inset-0 shadow-2xl"
            style={{
              backgroundImage: "url('/minecraft-book-open.png')",
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
              filter: "drop-shadow(0px 8px 20px rgba(0, 0, 0, 0.6))",
              transform: "translateZ(0)",
            }}
          >
            {/* Book pages structure */}
            <div className="relative w-full h-full">
              {/* Current visible pages (when not animating) */}
              {!isAnimating && (
                <>
                  <div className="book-page book-page-left" style={{ zIndex: 10 }}>
                    <div className="flex flex-col pt-10 pl-16 pr-8 pb-14 h-full">
                      <BookPage
                        content={bookContent[leftPageIndex]}
                        onChange={(text) => handleTextChange(text, true)}
                        pageNumber={leftPageIndex + 1}
                        scale={1} // Always use 1 here since we're scaling the entire container
                      />
                    </div>
                  </div>

                  <div className="book-page book-page-right" style={{ zIndex: 10 }}>
                    <div className="flex flex-col pt-10 pl-8 pr-16 pb-14 h-full">
                      <BookPage
                        content={bookContent[rightPageIndex]}
                        onChange={(text) => handleTextChange(text, false)}
                        pageNumber={rightPageIndex + 1}
                        scale={1} // Always use 1 here since we're scaling the entire container
                      />
                    </div>
                  </div>
                </>
              )}
              
              {/* Next spread pages (visible during forward animation) */}
              {isAnimating && direction === "next" && (
                <>
                  <div className="book-page book-page-left" style={{ zIndex: 5 }}>
                    <div className="flex flex-col pt-10 pl-16 pr-8 pb-14 h-full">
                      <BookPage
                        content={bookContent[(currentSpread + 1) * 2]}
                        onChange={(text) => handleTextChange(text, true)}
                        pageNumber={(currentSpread + 1) * 2 + 1}
                        scale={1}
                      />
                    </div>
                  </div>
                </>
              )}
              
              {/* Previous spread pages (visible during backward animation) */}
              {isAnimating && direction === "prev" && (
                <>
                  <div className="book-page book-page-right" style={{ zIndex: 5 }}>
                    <div className="flex flex-col pt-10 pl-8 pr-16 pb-14 h-full">
                      <BookPage
                        content={bookContent[(currentSpread - 1) * 2 + 1]}
                        onChange={(text) => handleTextChange(text, false)}
                        pageNumber={(currentSpread - 1) * 2 + 2}
                        scale={1}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Turning page animation with improved text visibility */}
              {isAnimating && (
                <div 
                  className={`turning-page ${direction === "next" ? "turning-page-right" : "turning-page-left"}`}
                >
                  <div 
                    className="turning-page-element"
                    style={{
                      transformStyle: "preserve-3d",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <div 
                      className={`${direction === "next" ? "animate-page-forward" : "animate-page-backward"}`}
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        transformStyle: "preserve-3d",
                        willChange: "transform",
                      }}
                    >
                      {/* Front face of turning page */}
                      <div 
                        className="turning-page-content turning-page-front"
                        style={{
                          backgroundImage: "url('/minecraft-book-open.png')",
                          backgroundSize: "200% 100%",
                          backgroundPosition: direction === "next" ? "right center" : "left center",
                          transformStyle: "preserve-3d",
                          willChange: "transform",
                        }}
                      >
                        <div 
                          className="flex flex-col h-full overflow-hidden"
                          style={{
                            paddingTop: "10px",
                            paddingBottom: "14px",
                            paddingLeft: direction === "next" ? "8px" : "16px",
                            paddingRight: direction === "next" ? "16px" : "8px",
                            transformStyle: "preserve-3d",
                          }}
                        >
                          {/* BookPage with text that sticks to the page */}
                          <div 
                            style={{ 
                              transform: "translateZ(0.1px)", 
                              transformStyle: "preserve-3d",
                              willChange: "transform", 
                            }}
                          >
                            <BookPage
                              content={direction === "next" ? bookContent[rightPageIndex] : bookContent[leftPageIndex]}
                              onChange={(text) => {}}
                              pageNumber={direction === "next" ? rightPageIndex + 1 : leftPageIndex + 1}
                              scale={1}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Back face of turning page */}
                      <div 
                        className="turning-page-content turning-page-back"
                        style={{
                          backgroundImage: "url('/minecraft-book-open.png')",
                          backgroundSize: "200% 100%",
                          backgroundPosition: direction === "next" ? "left center" : "right center",
                          transformStyle: "preserve-3d",
                          willChange: "transform",
                        }}
                      >
                        <div 
                          className="flex flex-col h-full overflow-hidden"
                          style={{
                            paddingTop: "10px",
                            paddingBottom: "14px",
                            paddingLeft: direction === "next" ? "16px" : "8px",
                            paddingRight: direction === "next" ? "8px" : "16px",
                            transformStyle: "preserve-3d",
                          }}
                        >
                          {/* BookPage with text that sticks to the page */}
                          <div 
                            style={{ 
                              transform: "translateZ(0.1px)", 
                              transformStyle: "preserve-3d",
                              willChange: "transform",
                            }}
                          >
                            <BookPage
                              content={direction === "next" ? bookContent[(currentSpread + 1) * 2] : bookContent[(currentSpread - 1) * 2 + 1]}
                              onChange={(text) => {}}
                              pageNumber={direction === "next" ? (currentSpread + 1) * 2 + 1 : (currentSpread - 1) * 2 + 2}
                              scale={1}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation buttons */}
          {currentSpread > 0 && (
            <button
              onClick={prevPage}
              disabled={isAnimating || isExporting}
              className="page-turn-button absolute left-8 top-1/2 transform -translate-y-1/2 z-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {currentSpread < totalSpreads - 1 && (
            <button
              onClick={nextPage}
              disabled={isAnimating || isExporting}
              className="page-turn-button absolute right-8 top-1/2 transform -translate-y-1/2 z-30"
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Page numbers */}
          <div 
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-sm flex gap-24 z-30"
          >
            <div style={pageNumberStyle}>{leftPageIndex + 1}</div>
            <div style={pageNumberStyle}>{rightPageIndex + 1}</div>
          </div>
        </div>

        {/* Export button */}
        <button
          onClick={exportBook}
          disabled={isExporting}
          className="minecraft-button export-button flex items-center gap-2 mt-8"
          aria-label="Export book as images"
        >
          <BookOpen className="h-4 w-4" />
          <span>{isExporting ? "Exporting..." : "Export Book Pages"}</span>
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
