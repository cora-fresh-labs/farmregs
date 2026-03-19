import type { Metadata } from 'next'
import { Libre_Baskerville, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-heading',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FarmRegs — US Farmer Compliance Dashboard',
  description: 'Know exactly what regulations apply to your farm. Get notified the moment something changes.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%231a1208'/><text x='50' y='62' text-anchor='middle' font-size='50' font-family='serif' fill='%23e8d5a3'>F</text></svg>",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${libreBaskerville.variable} ${dmSans.variable} ${dmMono.variable} font-[family-name:var(--font-body)]`}>
        {children}
      </body>
    </html>
  )
}
