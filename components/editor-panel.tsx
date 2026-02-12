"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { BookOpen, Eraser } from "lucide-react"

interface EditorPanelProps {
  pages: string[]
  maxChars: number
  maxPages: number
  onFillBook: (pages: string[]) => void
}

/**
 * Split text into pages at word boundaries, respecting the max chars per page.
 * When we hit the limit mid-word, we back up to the last word boundary.
 */
function splitTextIntoPages(text: string, maxCharsPerPage: number, maxPages: number): string[] {
  const result: string[] = []
  let remaining = text

  while (remaining.length > 0 && result.length < maxPages) {
    if (remaining.length <= maxCharsPerPage) {
      result.push(remaining)
      remaining = ""
      break
    }

    // Take up to maxCharsPerPage characters
    let chunk = remaining.slice(0, maxCharsPerPage)

    // Check if we're splitting in the middle of a line - prefer breaking at newlines first
    const lastNewline = chunk.lastIndexOf("\n")

    // Try to find a word boundary (space, newline) to break on
    const lastSpace = chunk.lastIndexOf(" ")

    let breakAt: number

    if (lastNewline >= 0 && lastNewline > maxCharsPerPage * 0.5) {
      // Break at newline if it's reasonably far into the chunk
      breakAt = lastNewline + 1
    } else if (lastSpace >= 0 && lastSpace > maxCharsPerPage * 0.3) {
      // Break at last space if it's at least 30% into the chunk
      breakAt = lastSpace + 1
    } else {
      // No good break point, hard break at limit
      breakAt = maxCharsPerPage
    }

    chunk = remaining.slice(0, breakAt)
    remaining = remaining.slice(breakAt)

    // Trim trailing whitespace from chunk, leading whitespace from remaining
    result.push(chunk.trimEnd())
    remaining = remaining.trimStart()
  }

  // Pad to fill all pages
  while (result.length < maxPages) {
    result.push("")
  }

  return result
}

export function EditorPanel({
  pages,
  maxChars,
  maxPages,
  onFillBook,
}: EditorPanelProps) {
  // Reconstruct text from current pages for initial editor content
  const [editorText, setEditorText] = useState(() => {
    return pages
      .filter((p) => p.trim().length > 0)
      .join("\n\n")
  })
  const [showFillConfirm, setShowFillConfirm] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleFill = useCallback(() => {
    const newPages = splitTextIntoPages(editorText, maxChars, maxPages)
    onFillBook(newPages)
    setShowFillConfirm(true)
    setTimeout(() => setShowFillConfirm(false), 2000)
  }, [editorText, maxChars, maxPages, onFillBook])

  const handleClearEditor = useCallback(() => {
    setEditorText("")
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const totalChars = editorText.length
  const estimatedPages = Math.max(1, Math.ceil(totalChars / maxChars))

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          backgroundColor: "hsl(0, 0%, 20%)",
          border: "2px solid",
          borderColor: "hsl(0, 0%, 10%) hsl(0, 0%, 35%) hsl(0, 0%, 35%) hsl(0, 0%, 10%)",
          fontFamily: "var(--font-minecraft), monospace",
        }}
      >
        <span className="text-xs" style={{ color: "hsl(0, 0%, 80%)" }}>
          Bulk Editor
        </span>
        <span
          className="text-xs"
          style={{
            color: estimatedPages > maxPages ? "hsl(0, 70%, 60%)" : "hsl(0, 0%, 55%)",
          }}
        >
          ~{Math.min(estimatedPages, maxPages)} pages
        </span>
      </div>

      {/* Free-form textarea - no character limit */}
      <textarea
        ref={textareaRef}
        value={editorText}
        onChange={(e) => setEditorText(e.target.value)}
        placeholder="Write as much as you want here. When you're done, click 'Fill Book' to automatically distribute your text across book pages..."
        className="mc-textarea flex-1 w-full p-3 text-sm leading-relaxed mc-scrollbar"
        style={{
          fontFamily: "var(--font-minecraft), monospace",
          minHeight: "340px",
        }}
      />

      {/* Stats bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 text-[10px]"
        style={{
          backgroundColor: "hsl(0, 0%, 15%)",
          border: "2px solid",
          borderColor: "hsl(0, 0%, 8%) hsl(0, 0%, 30%) hsl(0, 0%, 30%) hsl(0, 0%, 8%)",
          color: "hsl(0, 0%, 50%)",
          fontFamily: "var(--font-minecraft), monospace",
        }}
      >
        <span>{totalChars} characters</span>
        <span>{maxChars} chars/page limit</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleClearEditor}
          className="mc-btn mc-btn-small flex items-center gap-1.5"
          aria-label="Clear editor text"
        >
          <Eraser className="w-3 h-3" />
          Clear
        </button>
        <button
          onClick={handleFill}
          disabled={editorText.trim().length === 0}
          className="mc-btn mc-btn-small flex-1 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          style={
            editorText.trim().length > 0
              ? {
                  backgroundColor: "hsl(100, 40%, 40%)",
                  borderColor: "hsl(100, 40%, 55%) hsl(100, 40%, 25%) hsl(100, 40%, 25%) hsl(100, 40%, 55%)",
                  color: "hsl(100, 40%, 95%)",
                  textShadow: "1px 1px 0 hsl(100, 40%, 22%)",
                }
              : undefined
          }
          aria-label="Fill book with editor text"
        >
          <BookOpen className="w-3 h-3" />
          Fill Book
        </button>
      </div>

      {/* Fill confirmation */}
      {showFillConfirm && (
        <div
          className="px-3 py-2 text-[11px] text-center"
          style={{
            backgroundColor: "hsl(100, 40%, 25%)",
            border: "2px solid hsl(100, 40%, 40%)",
            color: "hsl(100, 40%, 85%)",
            fontFamily: "var(--font-minecraft), monospace",
          }}
        >
          Book filled! Check the pages.
        </div>
      )}

      
    </div>
  )
}
