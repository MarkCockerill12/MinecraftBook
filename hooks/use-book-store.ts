"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"

const MAX_PAGES = 50
const MAX_CHARS_PER_PAGE = 256
const STORAGE_KEY = "minecraft-book-pages"

export function useBookStore() {
  // Initialize with empty pages (SSR-safe). Hydrate from localStorage in useEffect.
  const [pages, setPages] = useState<string[]>(() => Array(MAX_PAGES).fill(""))
  const [currentSpread, setCurrentSpread] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationDirection, setAnimationDirection] = useState<"left" | "right" | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: string[] = JSON.parse(stored)
        const loaded = Array(MAX_PAGES).fill("")
        for (let i = 0; i < Math.min(parsed.length, MAX_PAGES); i++) {
          loaded[i] = parsed[i] || ""
        }
        setPages(loaded)
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  // Compute active spread count: shows only spreads with content + 1 blank for writing
  const activeSpreadCount = useMemo(() => {
    let lastUsed = -1
    for (let i = pages.length - 1; i >= 0; i--) {
      if (pages[i].trim().length > 0) {
        lastUsed = i
        break
      }
    }
    const lastUsedSpread = lastUsed >= 0 ? Math.floor(lastUsed / 2) : -1
    return Math.min(Math.max(lastUsedSpread + 2, 1), MAX_PAGES / 2)
  }, [pages])

  // Clamp current spread if active spreads shrink
  useEffect(() => {
    if (currentSpread >= activeSpreadCount) {
      setCurrentSpread(Math.max(0, activeSpreadCount - 1))
    }
  }, [activeSpreadCount, currentSpread])

  // Auto-save with debounce (only after hydration)
  useEffect(() => {
    if (!hydrated) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pages))
      } catch {
        // storage full or unavailable
      }
    }, 500)
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [pages, hydrated])

  const leftPageIndex = currentSpread * 2
  const rightPageIndex = currentSpread * 2 + 1

  const updatePage = useCallback((pageIndex: number, text: string) => {
    const clamped = text.slice(0, MAX_CHARS_PER_PAGE)
    setPages((prev) => {
      const next = [...prev]
      next[pageIndex] = clamped
      return next
    })
  }, [])

  const goToNextSpread = useCallback(() => {
    if (currentSpread >= activeSpreadCount - 1 || isAnimating) return
    setAnimationDirection("left")
    setIsAnimating(true)
  }, [currentSpread, activeSpreadCount, isAnimating])

  const goToPrevSpread = useCallback(() => {
    if (currentSpread <= 0 || isAnimating) return
    setAnimationDirection("right")
    setIsAnimating(true)
  }, [currentSpread, isAnimating])

  // Called when animation completes to actually change the spread
  const commitPageTurn = useCallback(() => {
    if (animationDirection === "left") {
      setCurrentSpread((s) => s + 1)
    } else if (animationDirection === "right") {
      setCurrentSpread((s) => s - 1)
    }
    setIsAnimating(false)
    setAnimationDirection(null)
  }, [animationDirection])

  const goToSpread = useCallback(
    (spread: number) => {
      if (spread < 0 || spread >= activeSpreadCount || isAnimating || spread === currentSpread) return
      // Instant navigation (no animation) - used by export
      setCurrentSpread(spread)
    },
    [currentSpread, activeSpreadCount, isAnimating]
  )

  const clearAllPages = useCallback(() => {
    setPages(Array(MAX_PAGES).fill(""))
    setCurrentSpread(0)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const getUsedPageCount = useCallback(() => {
    let lastUsed = 0
    for (let i = pages.length - 1; i >= 0; i--) {
      if (pages[i].trim().length > 0) {
        lastUsed = i + 1
        break
      }
    }
    return lastUsed
  }, [pages])

  const getUsedSpreadCount = useCallback(() => {
    const usedPages = getUsedPageCount()
    if (usedPages === 0) return 0
    return Math.ceil(usedPages / 2)
  }, [getUsedPageCount])

  return {
    pages,
    currentSpread,
    activeSpreadCount,
    leftPageIndex,
    rightPageIndex,
    isAnimating,
    animationDirection,
    hydrated,
    updatePage,
    setPages,
    setCurrentSpread,
    goToNextSpread,
    goToPrevSpread,
    goToSpread,
    commitPageTurn,
    clearAllPages,
    getUsedPageCount,
    getUsedSpreadCount,
    MAX_PAGES,
    MAX_CHARS_PER_PAGE,
  }
}
