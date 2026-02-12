"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { BookPage } from "./book-page"

interface BookViewProps {
  pages: string[]
  currentSpread: number
  activeSpreadCount: number
  leftPageIndex: number
  rightPageIndex: number
  isAnimating: boolean
  animationDirection: "left" | "right" | null
  onNextSpread: () => void
  onPrevSpread: () => void
  onAnimationEnd: () => void
  compact?: boolean
  editable?: boolean
  onPageChange?: (pageIndex: number, text: string) => void
  maxChars?: number
  isExporting?: boolean
}

export function BookView({
  pages,
  currentSpread,
  activeSpreadCount,
  leftPageIndex,
  rightPageIndex,
  isAnimating,
  animationDirection,
  onNextSpread,
  onPrevSpread,
  onAnimationEnd,
  compact = false,
  editable = false,
  onPageChange,
  maxChars = 256,
  isExporting = false,
}: BookViewProps) {
  const bookRef = useRef<HTMLDivElement>(null)
  const [editingPage, setEditingPage] = useState<number | null>(null)

  // Snapshot of old pages during animation so content doesn't flicker
  const [snapshot, setSnapshot] = useState<{
    leftIdx: number
    rightIdx: number
    leftText: string
    rightText: string
    direction: "left" | "right"
  } | null>(null)

  // When animation starts, capture the OLD spread content
  useEffect(() => {
    if (isAnimating && animationDirection) {
      setSnapshot({
        leftIdx: leftPageIndex,
        rightIdx: rightPageIndex,
        leftText: pages[leftPageIndex] || "",
        rightText: pages[rightPageIndex] || "",
        direction: animationDirection,
      })
    }
  }, [isAnimating, animationDirection]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for animation end on the flipping overlay
  const handleAnimationEnd = useCallback(() => {
    setSnapshot(null)
    onAnimationEnd()
  }, [onAnimationEnd])

  const handleStartEdit = (pageIndex: number) => {
    if (!editable || isAnimating) return
    setEditingPage(pageIndex)
  }

  const handleTextChange = (pageIndex: number, text: string) => {
    onPageChange?.(pageIndex, text)
  }

  const handleBookClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target === bookRef.current || target.closest("[data-book-spine]") || target.closest("[data-book-cover]")) {
      setEditingPage(null)
    }
  }

  // Deselect editing page if we navigate away from it
  useEffect(() => {
    if (editingPage !== null && editingPage !== leftPageIndex && editingPage !== rightPageIndex) {
      setEditingPage(null)
    }
  }, [editingPage, leftPageIndex, rightPageIndex])

  const canGoPrev = currentSpread > 0 && !isAnimating
  const canGoNext = currentSpread < activeSpreadCount - 1 && !isAnimating

  // During animation going forward ("left"): the flipping overlay is the OLD right page
  // rotating from 0 to -180deg on its left edge (flips over the spine).
  // Underneath, the NEW right page is already in place.
  //
  // During animation going backward ("right"): the flipping overlay is the OLD left page
  // rotating from 0 to 180deg on its right edge (flips back over the spine).
  // Underneath, the NEW left page is already in place.

  // What the NEXT spread will be (shown underneath the flipping overlay)
  const nextSpread = animationDirection === "left" ? currentSpread + 1 : currentSpread - 1
  const nextLeft = isAnimating ? nextSpread * 2 : leftPageIndex
  const nextRight = isAnimating ? nextSpread * 2 + 1 : rightPageIndex

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4 w-full px-1 sm:px-2 overflow-x-hidden">
      {/* Left arrow */}
      {!isExporting && (
        <button
          onClick={onPrevSpread}
          disabled={!canGoPrev}
          className="mc-btn shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ padding: compact ? "4px 6px" : "4px 8px sm:6px 10px" }}
          aria-label="Previous page spread"
        >
          <ChevronLeft className={compact ? "w-3 h-3" : "w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5"} />
        </button>
      )}

      {/* Book */}
      <div
        ref={bookRef}
        id="book-export-target"
        data-book-cover
        className="relative flex shrink-0 overflow-hidden"
        onClick={handleBookClick}
        style={{
          backgroundColor: "hsl(25, 40%, 28%)",
          border: compact ? "3px solid hsl(20, 40%, 16%)" : "5px solid hsl(20, 40%, 16%)",
          borderRadius: "3px",
          boxShadow: `
            inset 0 0 12px hsl(20, 45%, 14%),
            inset 2px 0 4px hsl(25, 40%, 35%),
            inset -2px 0 4px hsl(25, 40%, 35%),
            3px 3px 0 hsl(20, 40%, 12%),
            4px 4px 8px rgba(0,0,0,0.4)
          `,
          padding: compact ? "6px" : "8px 10px",
          gap: compact ? "3px" : "6px",
          perspective: "1200px",
        }}
      >
        {/* Spine / binding decoration */}
        <div
          data-book-spine
          className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 z-20 pointer-events-none"
          style={{
            width: compact ? "6px" : "10px",
            background: `linear-gradient(to right, 
              hsl(20, 45%, 12%) 0%, 
              hsl(25, 40%, 22%) 30%, 
              hsl(25, 35%, 18%) 50%, 
              hsl(25, 40%, 22%) 70%, 
              hsl(20, 45%, 12%) 100%
            )`,
            boxShadow: "0 0 6px rgba(0,0,0,0.4)",
          }}
        />

        {/* Binding stitches decoration */}
        <div
          className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 z-20 pointer-events-none flex flex-col justify-evenly items-center"
          style={{ width: compact ? "6px" : "10px" }}
        >
          {Array.from({ length: compact ? 4 : 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: compact ? "2px" : "3px",
                height: compact ? "4px" : "6px",
                backgroundColor: "hsl(35, 50%, 50%)",
                borderRadius: "1px",
                opacity: 0.6,
              }}
            />
          ))}
        </div>

        {/* Left page (static - shows the "destination" content during animation) */}
        <div className="relative z-10">
          <BookPage
            pageIndex={nextLeft}
            text={pages[nextLeft] || ""}
            compact={compact}
            editable={editable && !isAnimating}
            isEditing={editingPage === nextLeft}
            onStartEdit={() => handleStartEdit(nextLeft)}
            onTextChange={(text) => handleTextChange(nextLeft, text)}
            maxChars={maxChars}
            isExporting={isExporting}
          />
        </div>

        {/* Right page (static - shows the "destination" content during animation) */}
        <div className="relative z-10">
          <BookPage
            pageIndex={nextRight}
            text={pages[nextRight] || ""}
            compact={compact}
            editable={editable && !isAnimating}
            isEditing={editingPage === nextRight}
            onStartEdit={() => handleStartEdit(nextRight)}
            onTextChange={(text) => handleTextChange(nextRight, text)}
            maxChars={maxChars}
            isExporting={isExporting}
          />
        </div>

        {/* FLIPPING OVERLAY - Old page animating away */}
        {snapshot && (
          <div
            className="absolute z-30"
            style={{
              // Position over the correct side
              ...(snapshot.direction === "left"
                ? {
                    // Old right page flips left
                    right: compact ? "6px" : "10px",
                    top: compact ? "6px" : "8px",
                    bottom: compact ? "6px" : "8px",
                    transformOrigin: "left center",
                    animation: "flipPageForward 0.45s cubic-bezier(0.4, 0.15, 0.2, 0.85) forwards",
                  }
                : {
                    // Old left page flips right
                    left: compact ? "6px" : "10px",
                    top: compact ? "6px" : "8px",
                    bottom: compact ? "6px" : "8px",
                    transformOrigin: "right center",
                    animation: "flipPageBackward 0.45s cubic-bezier(0.4, 0.15, 0.2, 0.85) forwards",
                  }),
            }}
            onAnimationEnd={handleAnimationEnd}
          >
            <BookPage
              pageIndex={
                snapshot.direction === "left" ? snapshot.rightIdx : snapshot.leftIdx
              }
              text={
                snapshot.direction === "left" ? snapshot.rightText : snapshot.leftText
              }
              compact={compact}
              isExporting={isExporting}
            />
          </div>
        )}
      </div>

      {/* Right arrow */}
      {!isExporting && (
        <button
          onClick={onNextSpread}
          disabled={!canGoNext}
          className="mc-btn shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ padding: compact ? "4px 6px" : "4px 8px sm:6px 10px" }}
          aria-label="Next page spread"
        >
          <ChevronRight className={compact ? "w-3 h-3" : "w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5"} />
        </button>
      )}
    </div>
  )
}
