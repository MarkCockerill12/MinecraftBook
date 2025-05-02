import React, { useState } from 'react';

interface MinecraftTextEditorProps {
  onWrite: (text: string) => void;
}

export default function MinecraftTextEditor({ onWrite }: MinecraftTextEditorProps) {
  const [editorText, setEditorText] = useState('');

  const handleWriteClick = () => {
    if (editorText.trim()) {
      onWrite(editorText);
      setEditorText(''); // Clear text after writing
    }
  };

  return (
    <div className="minecraft-editor w-full max-w-md">
      <div className="bg-[#C6C6C6] border-2 border-[#373737] p-1 rounded-sm shadow-md">
        <div className="bg-[#8B8B8B] border-t-2 border-l-2 border-[#FFFFFF] border-b-2 border-r-2 border-[#373737] p-1">
          <textarea
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            className="w-full h-64 bg-[#373737] border-2 border-[#373737] text-white p-2 font-minecraft resize-none outline-none"
            placeholder="Write your text here..."
            style={{ fontFamily: "var(--font-pixel), 'Minecraft', monospace" }}
          />
        </div>
      </div>
      
      <button
        onClick={handleWriteClick}
        className="minecraft-button mt-4 w-full text-center py-2"
        aria-label="Write to book"
      >
        Write to Book
      </button>
    </div>
  );
}