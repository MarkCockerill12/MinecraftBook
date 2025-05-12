import { useRef, useState, useEffect } from "react";
import BookPage from "./book-page";
import { MAX_PAGES, MOBILE_MODE, TEXT_STYLE } from "@/lib/book-config";

export default function MobileMinecraftBook({ className, onWriteTextRef }: Readonly<{ className?: string, onWriteTextRef?: React.MutableRefObject<((text: string) => void) | null> }>) {
  const [currentSpread, setCurrentSpread] = useState(0);
  const [bookContent, setBookContent] = useState<string[]>(Array(MAX_PAGES).fill(""));
  const [totalSpreads, setTotalSpreads] = useState(1);
  const bookRef = useRef<HTMLDivElement>(null);

  const leftPageIndex = currentSpread * 2;
  const rightPageIndex = currentSpread * 2 + 1;

  useEffect(() => {
    const nonEmptyPages = bookContent.filter((page) => page.trim() !== "").length;
    const calculatedSpreads = Math.ceil(nonEmptyPages / 2);
    setTotalSpreads(Math.max(1, calculatedSpreads + (calculatedSpreads < MAX_PAGES / 2 ? 1 : 0)));
  }, [bookContent]);

  useEffect(() => {
    const savedContent = localStorage.getItem("minecraftBookContent");
    if (savedContent) {
      let parsed = null;
      try {
        parsed = JSON.parse(savedContent);
      } catch {}
      setBookContent(Array.isArray(parsed) ? parsed : Array(MAX_PAGES).fill(""));
    }
  }, []);

  // Enforce 206 char limit for mobile
  const handleTextChange = (text: string, isLeftPage: boolean) => {
    const newBookContent = [...bookContent];
    const pageIndex = isLeftPage ? leftPageIndex : rightPageIndex;
    newBookContent[pageIndex] = text.slice(0, MOBILE_MODE.chars_per_page);
    setBookContent(newBookContent);
  };

  // Navigation handlers for mobile
  const canPrev = currentSpread > 0;
  const canNext = currentSpread < totalSpreads - 1;
  const handlePrev = () => {
    if (canPrev && !isAnimating) {
      setDirection("prev");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSpread(currentSpread - 1);
        setIsAnimating(false);
      }, 800); // Match CSS animation duration
    }
  };
  const handleNext = () => {
    if (canNext && !isAnimating) {
      setDirection("next");
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSpread(currentSpread + 1);
        setIsAnimating(false);
      }, 800);
    }
  };

  // --- WRITE TO BOOK REF FIX (clear all pages before writing) ---
  const writeExternalText = (text: string) => {
    // Clear all pages, then write new text split into pages
    const newBookContent = Array(MAX_PAGES).fill("");
    let remainingText = text;
    let pageIndex = 0;
    while (remainingText.length > 0 && pageIndex < MAX_PAGES) {
      newBookContent[pageIndex] = remainingText.slice(0, MOBILE_MODE.chars_per_page);
      remainingText = remainingText.slice(MOBILE_MODE.chars_per_page);
      pageIndex++;
    }
    setBookContent(newBookContent);
    setCurrentSpread(0);
  };

  useEffect(() => {
    if (onWriteTextRef) {
      onWriteTextRef.current = writeExternalText;
    }
  }, [onWriteTextRef, writeExternalText]);

  // --- PAGE TURN ANIMATION STATE ---
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  return (
    <div className={`relative mx-auto ${className}`} style={{ maxWidth: 400, minWidth: 0, marginBottom: 0, paddingBottom: 0 }}>
      <div
        className="relative mx-auto"
        style={{
          width: 400,
          height: 260,
          background: "none",
          borderRadius: 8,
          boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          overflow: "hidden",
          marginBottom: 0,
          paddingBottom: 0,
        }}
      >
        <div ref={bookRef} className="book-container relative w-full h-full" data-export-book="true">
          <div className="absolute inset-0" style={{ backgroundImage: "url('/minecraft-book-open.png')", backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }} />
          <div className="relative w-full h-full flex">
            <div className="book-page book-page-left flex-1 flex flex-col p-2" style={{ zIndex: 10 }}>
              <BookPage
                content={bookContent[leftPageIndex]}
                onChange={text => handleTextChange(text, true)}
                pageNumber={leftPageIndex + 1}
                scale={1}
                charLimit={MOBILE_MODE.chars_per_page}
                mode="mobile"
              />
            </div>
            <div className="book-page book-page-right flex-1 flex flex-col p-2" style={{ zIndex: 10 }}>
              <BookPage
                content={bookContent[rightPageIndex]}
                onChange={text => handleTextChange(text, false)}
                pageNumber={rightPageIndex + 1}
                scale={1}
                charLimit={MOBILE_MODE.chars_per_page}
                mode="mobile"
              />
            </div>
          </div>
          {/* Page turn animation overlay (mobile) */}
          {isAnimating && (
            <div 
              className={`turning-page ${direction === "next" ? "turning-page-right" : "turning-page-left"}`}
              style={{ zIndex: 40 }}
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
                      <div 
                        style={{ 
                          transform: "translateZ(0.1px)", 
                          transformStyle: "preserve-3d",
                          willChange: "transform", 
                        }}
                      >
                        <BookPage
                          content={direction === "next" ? bookContent[rightPageIndex] : bookContent[leftPageIndex]}
                          onChange={() => {}}
                          pageNumber={direction === "next" ? rightPageIndex + 1 : leftPageIndex + 1}
                          scale={1}
                          mode="mobile"
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
                      <div 
                        style={{ 
                          transform: "translateZ(0.1px)", 
                          transformStyle: "preserve-3d",
                          willChange: "transform",
                        }}
                      >
                        <BookPage
                          content={direction === "next" ? bookContent[(currentSpread + 1) * 2] : bookContent[(currentSpread - 1) * 2 + 1]}
                          onChange={() => {}}
                          pageNumber={direction === "next" ? (currentSpread + 1) * 2 + 1 : (currentSpread - 1) * 2 + 2}
                          scale={1}
                          mode="mobile"
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
      {/* Navigation and export below the book, only for mobile */}
      <div style={{ width: 400, margin: '16px auto 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div className="flex justify-between items-center w-full" style={{ maxWidth: 400 }}>
          <button onClick={handlePrev} disabled={!canPrev || isAnimating} className="page-turn-button" aria-label="Previous page">&#60;</button>
          <div className="flex justify-between text-xs" style={{ color: TEXT_STYLE.color, minWidth: 60 }}>
            <span>{leftPageIndex + 1}</span>
            <span>{rightPageIndex + 1}</span>
          </div>
          <button onClick={handleNext} disabled={!canNext || isAnimating} className="page-turn-button" aria-label="Next page">&#62;</button>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('export-minecraft-book'))}
          className="minecraft-button export-button flex items-center gap-2 w-full max-w-xs mx-auto justify-center"
          aria-label="Export book as images"
          style={{ height: 40 }}
        >
          <span>Export</span>
        </button>
      </div>
    </div>
  );
}
