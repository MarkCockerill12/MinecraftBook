"use client"

import { useState, useEffect, useRef } from "react"
import BookPage from "./book-page"
import { ChevronLeft, ChevronRight, Download, BookOpen } from "lucide-react"
import html2canvas from 'html2canvas'

const MAX_PAGES = 50 // 25 spreads (left and right pages)
const CHARS_PER_PAGE = 256 // Minecraft allows around 256 characters per page

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

  // Update total spreads when content changes
  useEffect(() => {
    const nonEmptyPages = bookContent.filter((page) => page.trim() !== "").length
    const calculatedSpreads = Math.ceil(nonEmptyPages / 2)
    setTotalSpreads(Math.max(1, calculatedSpreads + (calculatedSpreads < MAX_PAGES / 2 ? 1 : 0)))
  }, [bookContent])

  // Auto-save book content to localStorage
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
  // Adding a dependency check to avoid infinite updates
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
    fontFamily: 'var(--font-minecraft), Minecraft, monospace',
    fontSize: '12px',
    color: '#3F3F3F',
  };

  // Helper function for export - forces a wait for rendering to complete
  const forceRenderCycles = async () => {
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 50);
          });
        }, 50);
      });
    });
  };

  // Completely rewritten export function to fix image capture issues
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
        setIsExporting(false);
        return; // No pages to export
      }
      
      // Calculate all spreads that need to be exported
      const spreadsToExport = new Set<number>();
      nonEmptyPageIndices.forEach(pageIndex => {
        spreadsToExport.add(Math.floor(pageIndex / 2));
      });
      
      // Convert to array and sort
      const spreadIndices = Array.from(spreadsToExport).sort((a, b) => a - b);
      
      const originalSpread = currentSpread;
      const images = [];
      
      // Temporarily add an export class to improve text rendering during export
      document.body.classList.add('exporting-book');
      
      for (const spreadIndex of spreadIndices) {
        // Change to the spread we want to export
        setCurrentSpread(spreadIndex);
        
        // Wait longer for rendering to complete to ensure text is fully rendered
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Take a screenshot of the book
        if (bookRef.current) {
          // Hide navigation buttons during export
          const buttonsToHide = bookRef.current.querySelectorAll('.page-turn-button, .export-button');
          buttonsToHide.forEach(button => {
            (button as HTMLElement).style.visibility = 'hidden';
          });
          
          // Ensure textareas are rendered correctly for export
          const textareas = bookRef.current.querySelectorAll('textarea');
          textareas.forEach(textarea => {
            // Make text more visible by adding styles directly to the DOM element
            textarea.style.opacity = '1';
            textarea.style.color = '#3F3F3F'; // Ensure dark text color
          });
          
          // Prepare for image capture
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Create a new canvas with html2canvas
          const canvas = await html2canvas(bookRef.current, {
            scale: 2, // Higher resolution for better text quality
            backgroundColor: null, // Transparent background
            logging: false,
            useCORS: true,
            allowTaint: true,
            onclone: (clonedDoc) => {
              // Find all textarea elements in the clone
              const clonedTextareas = clonedDoc.querySelectorAll('textarea');
              
              // Replace each textarea with a div containing the same text
              clonedTextareas.forEach((textarea) => {
                const text = (textarea as HTMLTextAreaElement).value;
                
                // Create a div to replace the textarea
                const div = clonedDoc.createElement('div');
                div.style.fontFamily = "var(--font-pixel), 'Minecraft', monospace";
                div.style.fontSize = textarea.style.fontSize;
                div.style.lineHeight = textarea.style.lineHeight;
                div.style.color = '#3F3F3F';
                div.style.whiteSpace = 'pre-wrap';
                div.style.padding = textarea.style.padding;
                div.style.letterSpacing = textarea.style.letterSpacing;
                div.style.width = '100%';
                div.style.height = '100%';
                div.style.overflow = 'hidden';
                div.textContent = text;
                
                // Replace the textarea with our div
                textarea.parentNode?.replaceChild(div, textarea);
              });
              
              return clonedDoc;
            }
          });
          
          // Restore visibility
          buttonsToHide.forEach(button => {
            (button as HTMLElement).style.visibility = '';
          });
          
          // Convert to image
          const image = canvas.toDataURL("image/png");
          const pageNumbers = `${spreadIndex * 2 + 1}-${spreadIndex * 2 + 2}`;
          
          // Create download link
          const link = document.createElement("a");
          link.href = image;
          link.download = `minecraft-book-pages-${pageNumbers}.png`;
          
          images.push({ link, index: spreadIndex });
        }
      }
      
      // Download all images
      for (const { link } of images) {
        link.click();
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay between downloads
      }
      
      // Reset to original spread
      setCurrentSpread(originalSpread);
    } catch (error) {
      console.error("Error exporting book:", error);
    } finally {
      // Always clean up
      document.body.classList.remove('exporting-book');
      setIsExporting(false);
    }
  };

  // New method to write external text to the book, splitting into pages as needed
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
      {/* Book container */}
      <div className={`relative w-full max-w-3xl mx-auto ${editorEnabled ? 'editor-mode' : ''}`}>
        <div ref={bookRef} className="book-container relative aspect-[2/1.2] w-full" data-export-book="true">
          {/* Book background */}
          <div
            className="absolute inset-0 shadow-xl"
            style={{
              backgroundImage: "url('/minecraft-book-open.png')",
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
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
                      />
                    </div>
                  </div>

                  <div className="book-page book-page-right" style={{ zIndex: 10 }}>
                    <div className="flex flex-col pt-10 pl-8 pr-16 pb-14 h-full">
                      <BookPage
                        content={bookContent[rightPageIndex]}
                        onChange={(text) => handleTextChange(text, false)}
                        pageNumber={rightPageIndex + 1}
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
