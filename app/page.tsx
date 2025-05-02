"use client"

import MinecraftBook from "@/components/minecraft-book"
import MinecraftTextEditor from "@/components/minecraft-text-editor"
import { Switch } from "@/components/ui/switch"
import { useState, useRef } from "react"

export default function Home() {
  const [editorEnabled, setEditorEnabled] = useState(false)
  const writeTextRef = useRef<((text: string) => void) | null>(null)
  
  // Handle text from editor
  const handleWriteText = (text: string) => {
    if (writeTextRef.current) {
      writeTextRef.current(text)
    }
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-4 bg-repeat"
      style={{ 
        backgroundImage: "url('/minecraft-background.png')",
        backgroundColor: "#5c8b52" // Fallback color similar to grass
      }}
    >
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-center mb-8 gap-4">
          <h1 className="text-3xl text-white drop-shadow-lg">
            Minecraft Book Writer
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-white text-sm">Editor</span>
            <Switch 
              checked={editorEnabled} 
              onCheckedChange={setEditorEnabled}
              className="minecraft-toggle" 
            />
          </div>
        </div>
        
        <div className={`flex ${editorEnabled ? 'flex-row' : 'flex-col'} items-center justify-center gap-8 transition-all duration-500`}>
          {/* Editor on the left when enabled */}
          <div 
            className={`transition-all duration-500 w-1/2 ${
              editorEnabled 
                ? 'opacity-100 max-h-[800px] order-1' 
                : 'opacity-0 max-h-0 overflow-hidden absolute -left-full'
            }`}
          >
            <MinecraftTextEditor onWrite={handleWriteText} />
          </div>
          
          {/* Book is always visible, on the right when editor is enabled */}
          <MinecraftBook 
            className={`transition-all duration-500 transform ${editorEnabled ? 'w-1/2 order-2' : 'w-full mx-auto'}`}
            onWriteTextRef={writeTextRef}
            editorEnabled={editorEnabled}
          />
        </div>
      </div>
    </main>
  )
}
