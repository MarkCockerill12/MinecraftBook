"use client"

import { useState, useCallback, useEffect } from "react"
import { useBookStore } from "@/hooks/use-book-store"
import { Toolbar } from "./toolbar"
import { BookView } from "./book-view"
import { EditorPanel } from "./editor-panel"

export function BookWriter() {
  const store = useBookStore()
  const [editorEnabled, setEditorEnabled] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === "TEXTAREA" ||
        target.tagName === "INPUT" ||
        target.isContentEditable
      )
        return

      if (e.key === "ArrowLeft") {
        e.preventDefault()
        store.goToPrevSpread()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        store.goToNextSpread()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [store])

  const handleFillBook = useCallback(
    (newPages: string[]) => {
      for (let i = 0; i < newPages.length; i++) {
        store.updatePage(i, newPages[i])
      }
      store.goToSpread(0)
    },
    [store]
  )

  // Export all used spreads as PNGs
  const handleExport = useCallback(async () => {
    const usedSpreads = store.getUsedSpreadCount()
    if (usedSpreads === 0) return

    setIsExporting(true)
    const originalSpread = store.currentSpread

    try {
      const html2canvas = (await import("html2canvas")).default
      await new Promise((r) => setTimeout(r, 150))

      for (let i = 0; i < usedSpreads; i++) {
        store.setCurrentSpread(i)
        await new Promise((r) => setTimeout(r, 250))

        const target = document.getElementById("book-export-target")
        if (!target) continue

        const canvas = await html2canvas(target, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
        })

        const link = document.createElement("a")
        link.download = `minecraft-book-pages-${i * 2 + 1}-${i * 2 + 2}.png`
        link.href = canvas.toDataURL("image/png")
        link.click()

        if (i < usedSpreads - 1) {
          await new Promise((r) => setTimeout(r, 300))
        }
      }
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      store.setCurrentSpread(originalSpread)
      setIsExporting(false)
    }
  }, [store])

  const handleClear = useCallback(() => setShowClearConfirm(true), [])
  const confirmClear = useCallback(() => {
    store.clearAllPages()
    setShowClearConfirm(false)
  }, [store])

  // Don't render until hydrated to avoid localStorage mismatch
  if (!store.hydrated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center pixel-perfect"
        style={{
          backgroundImage: "url('/images/mc.png')",
          backgroundRepeat: "repeat",
          imageRendering: "pixelated",
        }}
      >
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ backgroundColor: "hsla(0, 0%, 0%, 0.5)" }}
        />
        <p
          className="relative z-10 text-sm"
          style={{
            color: "hsl(0, 0%, 70%)",
            fontFamily: "var(--font-minecraft), monospace",
            textShadow: "1px 1px 0 hsl(0, 0%, 10%)",
          }}
        >
          Loading book...
        </p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col pixel-perfect"
      style={{
        backgroundImage: "url('/images/mc.png')",
        backgroundRepeat: "repeat",
        imageRendering: "pixelated",
      }}
    >
      {/* Dark overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ backgroundColor: "hsla(0, 0%, 0%, 0.5)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Toolbar
          editorEnabled={editorEnabled}
          onToggleEditor={() => setEditorEnabled((v) => !v)}
          onExport={handleExport}
          onClear={handleClear}
          usedPages={store.getUsedPageCount()}
        />

        <main className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-6">
          {editorEnabled ? (
            <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start w-full max-w-5xl">
              {/* Editor */}
              <div
                className="w-full lg:flex-1 lg:min-w-[320px] lg:max-w-[480px] p-4"
                style={{
                  backgroundColor: "hsl(0, 0%, 12%)",
                  border: "4px solid",
                  borderColor: "hsl(0, 0%, 8%) hsl(0, 0%, 25%) hsl(0, 0%, 25%) hsl(0, 0%, 8%)",
                }}
              >
                <EditorPanel
                  pages={store.pages}
                  maxChars={store.MAX_CHARS_PER_PAGE}
                  maxPages={store.MAX_PAGES}
                  onFillBook={handleFillBook}
                />
              </div>

              {/* Compact book preview */}
              <div className="flex-shrink-0">
                <BookView
                  pages={store.pages}
                  currentSpread={store.currentSpread}
                  activeSpreadCount={store.activeSpreadCount}
                  leftPageIndex={store.leftPageIndex}
                  rightPageIndex={store.rightPageIndex}
                  isAnimating={store.isAnimating}
                  animationDirection={store.animationDirection}
                  onNextSpread={store.goToNextSpread}
                  onPrevSpread={store.goToPrevSpread}
                  onAnimationEnd={store.commitPageTurn}
                  compact
                />
              </div>
            </div>
          ) : (
            <BookView
              pages={store.pages}
              currentSpread={store.currentSpread}
              activeSpreadCount={store.activeSpreadCount}
              leftPageIndex={store.leftPageIndex}
              rightPageIndex={store.rightPageIndex}
              isAnimating={store.isAnimating}
              animationDirection={store.animationDirection}
              onNextSpread={store.goToNextSpread}
              onPrevSpread={store.goToPrevSpread}
              onAnimationEnd={store.commitPageTurn}
              editable
              onPageChange={store.updatePage}
              maxChars={store.MAX_CHARS_PER_PAGE}
              isExporting={isExporting}
            />
          )}
        </main>
      </div>

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "hsla(0, 0%, 0%, 0.7)" }}
            onClick={() => setShowClearConfirm(false)}
          />
          <div
            className="relative z-10 p-6 max-w-sm w-full"
            style={{
              backgroundColor: "hsl(0, 0%, 20%)",
              border: "4px solid",
              borderColor: "hsl(0, 0%, 35%) hsl(0, 0%, 8%) hsl(0, 0%, 8%) hsl(0, 0%, 35%)",
              fontFamily: "var(--font-minecraft), monospace",
            }}
          >
            <h2
              className="text-sm mb-4"
              style={{
                color: "hsl(0, 70%, 60%)",
                textShadow: "1px 1px 0 hsl(0, 0%, 10%)",
              }}
            >
              Clear All Pages?
            </h2>
            <p className="text-xs mb-6" style={{ color: "hsl(0, 0%, 70%)" }}>
              This will permanently delete all your book content. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="mc-btn mc-btn-small"
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="mc-btn mc-btn-small"
                style={{
                  backgroundColor: "hsl(0, 50%, 40%)",
                  borderColor: "hsl(0, 50%, 55%) hsl(0, 50%, 25%) hsl(0, 50%, 25%) hsl(0, 50%, 55%)",
                  color: "hsl(0, 0%, 95%)",
                  textShadow: "1px 1px 0 hsl(0, 50%, 20%)",
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
