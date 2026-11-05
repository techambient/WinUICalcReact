import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Open_Sans } from 'next/font/google'
import './globals.css'

const fallbackSans = Open_Sans({ subsets: ['latin'], variable: '--font-fallback-sans', display: 'swap' })

export const metadata: Metadata = {
  title: 'Calculator',
  description:
    'A faithful Windows 11 Calculator clone with Standard, Scientific, Graphing, Programmer, Date calculation and unit converters, built in the WinUI 3 style.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f3f3' },
    { media: '(prefers-color-scheme: dark)', color: '#202020' },
  ],
}

const themeScript = `(function(){try{var p=localStorage.getItem('calc-theme')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${fallbackSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
