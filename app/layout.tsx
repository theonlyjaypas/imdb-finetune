import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chatbot App',
  description: 'A simple chatbot application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 transition-colors duration-200 dark:bg-slate-950">{children}</body>
    </html>
  )
}
