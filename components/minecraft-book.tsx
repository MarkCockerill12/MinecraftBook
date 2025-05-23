"use client"

import { useState, useEffect, useRef } from "react"
import BookPage from "./book-page"
import { ChevronLeft, ChevronRight, Download, BookOpen } from "lucide-react"
import html2canvas from 'html2canvas'
import { 
  MAX_PAGES, 
  CHARS_PER_PAGE, 
  EDITOR_MODE, 
  TEXT_STYLE
} from "@/lib/book-config"

export interface MinecraftBookProps {
  className?: string;
  onWriteTextRef?: React.MutableRefObject<((text: string) => void) | null>;
  editorEnabled?: boolean;
  exportRef?: React.MutableRefObject<(() => void) | null>;
  bookContent: string[];
  setBookContent: React.Dispatch<React.SetStateAction<string[]>>;
  currentSpread: number;
  setCurrentSpread: React.Dispatch<React.SetStateAction<number>>;
}

export default function MinecraftBook({ className, onWriteTextRef, editorEnabled, exportRef, bookContent, setBookContent, currentSpread, setCurrentSpread }: Readonly<MinecraftBookProps>) {
  const [totalSpreads, setTotalSpreads] = useState(1)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const [isExporting, setIsExporting] = useState(false)
  const bookRef = useRef<HTMLDivElement>(null)
  
  // --- HYDRATION ERROR FIX ---
  // Use a state to track client-side mount for mode-dependent rendering
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Calculate the current left and right page numbers
  const leftPageIndex = currentSpread * 2
  const rightPageIndex = currentSpread * 2 + 1

  // Responsive book scale for desktop: scale linearly with window width
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // Linear scale: 1 at 1200px and above, 0.7 at 700px and below
  const minScale = 0.8;
  const minWidth = 700;
  const maxWidth = 1200;
  let linearBookScale: number;
  if (windowWidth >= maxWidth) {
    linearBookScale = 1;
  } else if (windowWidth <= minWidth) {
    linearBookScale = minScale;
  } else {
    linearBookScale = minScale + (windowWidth - minWidth) * (1 - minScale) / (maxWidth - minWidth);
  }
  const bookScale = editorEnabled ? EDITOR_MODE.bookScale : linearBookScale;

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

  // Ref to always have latest bookContent for exportBook
  const bookContentRef = useRef<string[]>(bookContent);
  useEffect(() => {
    bookContentRef.current = bookContent;
  }, [bookContent]);

  // Simple, robust export function that works reliably in browsers
  const exportBook = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      // Get all pages that have content (use ref to ensure latest)
      const nonEmptyPageIndices = bookContentRef.current
        .map((content: string, index: number) => ({ content, index }))
        .filter(({ content }: { content: string }) => content.trim() !== "")
        .map(({ index }: { index: number }) => index);
      if (nonEmptyPageIndices.length === 0) {
        alert("No content to export. Please add some text first.");
        setIsExporting(false);
        return;
      }
      // Calculate all spreads that need to be exported
      const spreadsToExport = new Set<number>();
      nonEmptyPageIndices.forEach((pageIndex: number) => {
        spreadsToExport.add(Math.floor(pageIndex / 2));
      });
      // Convert to array and sort
      const spreadIndices = Array.from(spreadsToExport).sort((a, b) => a - b);
      // Remember original state to restore later
      const originalSpread = currentSpread;
      // Extract paddings and font size based on the device type
      let leftPadding = '4em';
      let rightPadding = '4em';
      let topPadding = '60px';
      let bottomPadding = '80px';
      let textFontSize = 24;
      if (typeof window !== 'undefined' && window.innerWidth < 640) {
        leftPadding = rightPadding = '1.2em';
        topPadding = '1em';
        bottomPadding = '1.2em';
        textFontSize = 18;
      } else if (editorEnabled) {
        leftPadding = '3em';
        rightPadding = '1.5em';
        topPadding = '2em';
        bottomPadding = '2.5em';
        textFontSize = 22;
      }
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
          if (!bookContentRef.current[leftIdx]?.trim() && !bookContentRef.current[rightIdx]?.trim()) {
            continue;
          }
          // Create the export HTML with paddings and layout matching the live book
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
                padding: ${topPadding} ${rightPadding} ${bottomPadding} ${leftPadding};
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
                ">${bookContentRef.current[leftIdx] ?? ''}</div>
              </div>
              <div class="right-page" style="
                position: absolute;
                right: 0;
                top: 0;
                width: 50%;
                height: 100%;
                padding: ${topPadding} ${leftPadding} ${bottomPadding} ${rightPadding};
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
              ">${bookContentRef.current[rightIdx] ?? ''}</div>
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

  // Expose exportBook function via exportRef (assign directly in render for latest closure)
  if (exportRef) {
    exportRef.current = exportBook;
  }

  // Use mounted to gate all client-only checks (like isMobile)
  if (!mounted) return null;

  return (
    <div className={`relative mx-auto ${className}`} style={{ paddingTop: 86 }}>
      {/* Book container with dynamic scaling */}
      <div 
        className={`relative w-full max-w-3xl mx-auto ${editorEnabled ? 'editor-mode' : ''} transition-transform duration-300`}
        style={{
          transform: `scale(${bookScale})`,
          transformOrigin: 'center top',
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
              zIndex: 1,
            }}
          />
          {/* Book pages structure */}
          <div className="relative w-full h-full">
            {/* Current visible pages (when not animating) */}
            {!isAnimating && (
              <>
                <div className="book-page book-page-left" style={{ zIndex: 10 }}>
                  <div className={`flex flex-col h-full ${editorEnabled ? '' : 'pt-10 pl-16 pr-8 pb-14'}`} style={editorEnabled ? { padding: '2em 1.5em 2.5em 3em' } : {}}>
                    <BookPage
                      content={bookContent[leftPageIndex]}
                      onChange={(text) => handleTextChange(text, true)}
                      pageNumber={leftPageIndex + 1}
                      scale={1}
                      mode={editorEnabled ? 'editor' : 'desktop'}
                    />
                  </div>
                </div>

                <div className="book-page book-page-right" style={{ zIndex: 10 }}>
                  <div className={`flex flex-col h-full ${editorEnabled ? '' : 'pt-10 pl-8 pr-16 pb-14'}`} style={editorEnabled ? { padding: '2em 3em 2.5em 1.5em' } : {}}>
                    <BookPage
                      content={bookContent[rightPageIndex]}
                      onChange={(text) => handleTextChange(text, false)}
                      pageNumber={rightPageIndex + 1}
                      scale={1}
                      mode={editorEnabled ? 'editor' : 'desktop'}
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
                style={{ zIndex: 40 }} // Ensure above book
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

          {/* Navigation buttons - always visible and usable */}
          {currentSpread > 0 && (
            <button
              onClick={prevPage}
              disabled={isAnimating || isExporting}
              className="page-turn-button absolute left-2 sm:left-8 top-1/2 transform -translate-y-1/2 z-30"
              aria-label="Previous page"
              style={{ pointerEvents: isAnimating || isExporting ? 'none' : 'auto' }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {currentSpread < totalSpreads - 1 && (
            <button
              onClick={nextPage}
              disabled={isAnimating || isExporting}
              className="page-turn-button absolute right-2 sm:right-8 top-1/2 transform -translate-y-1/2 z-30"
              aria-label="Next page"
              style={{ pointerEvents: isAnimating || isExporting ? 'none' : 'auto' }}
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
      </div>
      {/* Export button - always under the middle of the book */}
      <div
        className="flex justify-center"
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          marginTop: 0,
          marginBottom: 16,
          zIndex: 50,
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={exportBook}
          disabled={isExporting}
          className={`minecraft-button export-button flex items-center gap-2 w-full max-w-xs mx-auto justify-center ${isExporting ? 'opacity-60' : ''}`}
          aria-label="Export book as images"
          style={{ position: 'relative', zIndex: 40, margin: 0 }}
        >
          <BookOpen className="h-4 w-4" />
          <span>{isExporting ? "Exporting..." : "Export Book Pages"}</span>
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
