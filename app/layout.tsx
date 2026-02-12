import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'

import './globals.css'

const minecraft = localFont({
  src: [
    {
      path: '../public/fonts/MinecraftRegular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-minecraft',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Minecraft Book Writer',
  description: 'Write and edit Minecraft books with an authentic in-game experience. Create writable books with up to 50 pages, export as images, and more.',
}

export const viewport: Viewport = {
  themeColor: '#3d2b1f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={minecraft.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
