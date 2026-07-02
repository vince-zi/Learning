import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ClientLayout } from '@/components/layout/ClientLayout'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '学习思考伙伴 — 通过提问发现规律',
  description: '不只是课程，而是一个通过启发式对话引导你自己发现规律的思考伙伴。包含摄影和英语两大学习模块。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
