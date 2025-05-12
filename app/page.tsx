"use client"

import MinecraftBook from "@/components/minecraft-book"
import MobileMinecraftBook from "@/components/mobile-minecraft-book";
import MinecraftTextEditor from "@/components/minecraft-text-editor"
import { Switch } from "@/components/ui/switch"
import { useState, useRef } from "react"
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const [editorEnabled, setEditorEnabled] = useState(false)
  const writeTextRef = useRef<((text: string) => void) | null>(null)
  const isMobile = useIsMobile();
  
  // Handle text from editor
  const handleWriteText = (text: string) => {
    if (writeTextRef.current) {
      writeTextRef.current(text)
    }
  }

  return (
    <>
      <div
        style={{
          backgroundImage: "url('/minecraft-background.png')",
          backgroundColor: "#5c8b52",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh',
          minWidth: '100vw',
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: -1
        }}
      />
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-repeat">
        <div className="w-full max-w-6xl mx-auto">
          {/* Header with title and toggle positioned correctly */}
          <div className="fixed top-4 left-0 right-0 flex items-center justify-between px-4 z-50">
            <h1 className="text-2xl sm:text-3xl text-white drop-shadow-lg font-minecraft">
              Minecraft Book Writer
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-minecraft">Editor Mode</span>
              <Switch 
                checked={editorEnabled} 
                onCheckedChange={setEditorEnabled}
                className="minecraft-toggle" 
              />
            </div>
          </div>
          
          {/* Responsive layout that adjusts for mobile */}
          <div className={`flex ${editorEnabled ? 'flex-col lg:flex-row' : 'flex-col'} items-center justify-center gap-4 lg:gap-8 transition-all duration-500`}>
            {/* Editor section - centered when in column layout */}
            <div 
              className={`transition-all duration-500 w-full max-w-3xl mx-auto ${
                editorEnabled 
                  ? 'opacity-100 max-h-[800px] order-1 lg:max-w-none lg:w-1/2 lg:mx-0' 
                  : 'opacity-0 max-h-0 overflow-hidden absolute -left-full'
              }`}
            >
              <MinecraftTextEditor onWrite={handleWriteText} />
            </div>
            
            {/* Book section - with enhanced shadow */}
            <div className={`transition-all duration-500 transform ${editorEnabled ? 'w-full lg:w-1/2 order-2 mx-auto lg:mx-0' : 'w-full mx-auto'} max-w-3xl book-shadow`}>
              {isMobile ? (
                <MobileMinecraftBook onWriteTextRef={writeTextRef} />
              ) : (
                <MinecraftBook 
                  onWriteTextRef={writeTextRef}
                  editorEnabled={editorEnabled}
                />
              )}
            </div>
          </div>
        </div>

        {/* Add styles for book shadow and responsive adjustments */}
        <style jsx global>{`
          .book-shadow {
            filter: drop-shadow(0 15px 15px rgba(0, 0, 0, 0.4)) drop-shadow(0 5px 8px rgba(0, 0, 0, 0.3));
            transition: filter 0.3s ease, transform 0.3s ease;
          }
          
          .book-shadow:hover {
            filter: drop-shadow(0 18px 18px rgba(0, 0, 0, 0.45)) drop-shadow(0 7px 10px rgba(0, 0, 0, 0.35));
          }
          
          /* Minecraft font style */
          .font-minecraft {
            font-family: var(--font-pixel), 'Minecraft', monospace !important;
          }
          
          /* Responsive adjustments */
          @media (max-width: 640px) {
            .book-shadow {
              transform: scale(0.9);
            }
          }
          
          /* Minecraft-style toggle */
          .minecraft-toggle {
            background-color: #8B8B8B !important;
            border: 2px solid #5A5A5A !important;
          }
          
          .minecraft-toggle[data-state="checked"] {
            background-color: #5c8b52 !important;
            border: 2px solid #3d5c36 !important;
          }
          
          /* Exporting styles - ensure elements are visible during export */
          .exporting-book textarea {
            opacity: 1 !important;
            color: #3F3F3F !important;
          }
        `}</style>
      </main>
    </>
  )
}
