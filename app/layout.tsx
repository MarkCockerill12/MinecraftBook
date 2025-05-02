import type { Metadata } from 'next'
import './globals.css'
import localFont from 'next/font/local'

// Load a guaranteed working fallback font
import { VT323 } from 'next/font/google'

const pixelFont = VT323({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pixel',
})

// Try loading the Minecraft font, but don't rely on it
const minecraftFont = localFont({
  src: '../public/fonts/minecraft_font.ttf',
  variable: '--font-minecraft',
  display: 'optional', // Changed to optional so it won't block rendering
  preload: false,      // Don't preload since it might be corrupted
  fallback: ['monospace']
})

export const metadata: Metadata = {
  title: 'Minecraft Book',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${minecraftFont.variable} ${pixelFont.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Minecraft Book</title>
        <style type="text/css" dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: 'Minecraft';
            src: url('/fonts/minecraft_font.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: optional;
          }
          
          :root {
            --font-minecraft-family: var(--font-pixel), monospace;
          }

          html, body, * {
            font-family: var(--font-pixel), monospace !important;
          }
        `}} />
      </head>
      <body className={`font-minecraft ${pixelFont.className}`}>{children}</body>
    </html>
  )
}
