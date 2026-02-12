"use client"

import { useRef, useEffect, useCallback, useState } from "react"

interface BookPageProps {
  pageIndex: number
  text: string
  compact?: boolean
  editable?: boolean
  isEditing?: boolean
  onStartEdit?: () => void
  onTextChange?: (text: string) => void
  maxChars?: number
  isExporting?: boolean
}

export function BookPage({
  pageIndex,
  text,
  compact = false,
  editable = false,
  isEditing = false,
  onStartEdit,
  onTextChange,
  maxChars = 256,
  isExporting = false,
}: BookPageProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(compact ? 8 : 12)

  // Dynamically size font so maxChars fills the content area exactly
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const measure = () => {
      const h = el.clientHeight
      const w = el.clientWidth
      if (h === 0 || w === 0) return

      const sizer = document.createElement("div")
      sizer.style.position = "absolute"
      sizer.style.visibility = "hidden"
      sizer.style.width = `${w}px`
      sizer.style.whiteSpace = "pre-wrap"
      sizer.style.wordBreak = "break-word"
      sizer.style.fontFamily = "var(--font-minecraft), monospace"
      sizer.style.lineHeight = "1.5"
      sizer.style.padding = "0"
      sizer.style.overflow = "hidden"
      const sample = "Abcde fghij klmno pqrst uvwxy zabcd efghi jklmn opqrs tuvwx yzabc defgh ijklm nopqr stuvw xyzab cdefg hijkl mnopq rstuv wxyza bcdef ghijk lmnop qrstu vwxyz abcde fghij klmno pqrst uvwxy zabcd efghi jklmn opqrs tuvwx yzabc defgh ijklm nopqr stuvw xyzab cdefg hijkl mnopq rstuv wxyza bcdef ghijk lmnop ".slice(0, maxChars)
      sizer.textContent = sample
      document.body.appendChild(sizer)

      let lo = 3
      let hi = compact ? 14 : 22
      let best = lo

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2)
        sizer.style.fontSize = `${mid}px`
        // The text must fit within the available height with buffer
        if (sizer.scrollHeight <= h) {
          best = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }

      // After finding the largest font that fits, reduce it by 1-2px for safety
      best = Math.max(3, best - 2)

      document.body.removeChild(sizer)
      setFontSize(best)
    }

    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    return () => obs.disconnect()
  }, [compact, maxChars])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      if (val.length <= maxChars && onTextChange) {
        onTextChange(val)
      }
    },
    [maxChars, onTextChange]
  )

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (editable && !isEditing && onStartEdit) {
      onStartEdit()
    }
  }, [editable, isEditing, onStartEdit])

  const showPlaceholder = editable && !isEditing && !text && !isExporting

  return (
    <div
      className={`page-parchment relative flex flex-col select-none ${
        compact
          ? "w-[160px] h-[220px] sm:w-[180px] sm:h-[240px]"
          : "w-[180px] h-[240px] xs:w-[200px] xs:h-[280px] sm:w-[240px] sm:h-[320px] md:w-[280px] md:h-[370px] lg:w-[300px] lg:h-[400px]"
      } ${editable && !isEditing ? "cursor-pointer" : ""}`}
      onClick={handleClick}
    >
      {/* Content area */}
      <div
        ref={contentRef}
        className={`flex-1 overflow-hidden ${compact ? "p-2.5 pt-3" : "p-4 pt-5 sm:p-5 sm:pt-6"}`}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            maxLength={maxChars}
            className="w-full h-full resize-none outline-none bg-transparent whitespace-pre-wrap break-words overflow-hidden"
            style={{
              color: "hsl(30, 30%, 15%)",
              fontFamily: "var(--font-minecraft), monospace",
              caretColor: "hsl(30, 30%, 15%)",
              wordBreak: "break-word",
              border: "none",
              padding: 0,
              fontSize: `${fontSize}px`,
              lineHeight: "1.5",
              overflow: "hidden",
            }}
          />
        ) : (
          <div
            className="w-full h-full whitespace-pre-wrap break-words overflow-hidden"
            style={{
              color: "hsl(30, 30%, 15%)",
              fontFamily: "var(--font-minecraft), monospace",
              wordBreak: "break-word",
              fontSize: `${fontSize}px`,
              lineHeight: "1.5",
            }}
          >
            {text || (showPlaceholder ? (
              <span style={{ color: "hsl(30, 20%, 60%)", fontSize: `${Math.max(fontSize - 1, 7)}px` }}>
                {"Click to edit..."}
              </span>
            ) : null)}
          </div>
        )}
      </div>

      {/* Character count badge when editing */}
      {isEditing && (
        <div
          className={`absolute ${compact ? "top-0.5 right-1.5 text-[7px]" : "top-1 right-2 text-[9px]"}`}
          style={{
            color: text.length > maxChars * 0.9 ? "hsl(0, 70%, 50%)" : "hsl(30, 20%, 55%)",
            fontFamily: "var(--font-minecraft), monospace",
          }}
        >
          {text.length}/{maxChars}
        </div>
      )}

      {/* Page number */}
      <div
        className={`text-center shrink-0 ${compact ? "pb-1.5 text-[8px]" : "pb-2 text-[10px] sm:text-xs"}`}
        style={{
          color: "hsl(30, 20%, 50%)",
          fontFamily: "var(--font-minecraft), monospace",
        }}
      >
        Page {pageIndex + 1}
      </div>
    </div>
  )
}
