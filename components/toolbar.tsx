"use client"

import { BookOpen, PenLine, Download, Trash2 } from "lucide-react"

interface ToolbarProps {
  editorEnabled: boolean
  onToggleEditor: () => void
  onExport: () => void
  onClear: () => void
  usedPages: number
}

export function Toolbar({ editorEnabled, onToggleEditor, onExport, onClear, usedPages }: ToolbarProps) {
  return (
    <header
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6"
      style={{
        backgroundColor: "hsl(0, 0%, 20%)",
        borderBottom: "4px solid",
        borderColor: "hsl(0, 0%, 10%)",
        boxShadow: "0 4px 0 hsl(0, 0%, 8%)",
      }}
    >
      {/* Logo / Title */}
      <div className="flex items-center gap-3">
        <h1
          className="text-sm md:text-base"
          style={{
            color: "hsl(0, 0%, 95%)",
            fontFamily: "var(--font-minecraft), monospace",
            textShadow: "2px 2px 0 hsl(0, 0%, 10%)",
          }}
        >
          Minecraft Book Writer
        </h1>
        <span
          className="hidden md:inline text-[10px] px-2 py-0.5"
          style={{
            backgroundColor: "hsl(100, 40%, 35%)",
            color: "hsl(100, 40%, 95%)",
            fontFamily: "var(--font-minecraft), monospace",
          }}
        >
          {usedPages} pages used
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleEditor}
          className="mc-btn mc-btn-small flex items-center gap-1.5"
          style={
            editorEnabled
              ? {
                  backgroundColor: "hsl(210, 50%, 55%)",
                  color: "white",
                  borderColor: "hsl(210, 50%, 70%) hsl(210, 50%, 30%) hsl(210, 50%, 30%) hsl(210, 50%, 70%)",
                  textShadow: "1px 1px 0 hsl(210, 50%, 30%)",
                }
              : undefined
          }
          aria-label={editorEnabled ? "Disable bulk editor" : "Enable bulk editor"}
        >
          <PenLine className="w-3 h-3" />
          <span className="hidden sm:inline">
            {editorEnabled ? "Editor On" : "Editor Off"}
          </span>
        </button>

        <div className="w-px h-5" style={{ backgroundColor: "hsl(0, 0%, 35%)" }} />

        <button
          onClick={onExport}
          className="mc-btn mc-btn-small flex items-center gap-1.5"
          aria-label="Export book as image"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button
          onClick={onClear}
          className="mc-btn mc-btn-small flex items-center gap-1.5"
          style={{
            backgroundColor: "hsl(0, 50%, 40%)",
            borderColor: "hsl(0, 50%, 55%) hsl(0, 50%, 25%) hsl(0, 50%, 25%) hsl(0, 50%, 55%)",
            color: "hsl(0, 0%, 95%)",
            textShadow: "1px 1px 0 hsl(0, 50%, 20%)",
          }}
          aria-label="Clear all pages"
        >
          <Trash2 className="w-3 h-3" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </header>
  )
}
