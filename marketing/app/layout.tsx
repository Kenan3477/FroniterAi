import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { HotjarScript } from '@/components/analytics/HotjarScript'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Frontier - AI-Powered Business Operations Platform',
  description: 'Transform your business operations with comprehensive financial analysis, strategic planning, and market research. Get actionable insights in minutes, not weeks.',
  keywords: 'business analysis, financial planning, market research, strategic planning, business intelligence, AI analytics',
  authors: [{ name: 'Frontier Team' }],
  creator: 'Frontier',
  publisher: 'Frontier',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://frontier.business'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Frontier - AI-Powered Business Operations Platform',
    description: 'Transform your business operations with comprehensive financial analysis, strategic planning, and market research.',
    siteName: 'Frontier',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Frontier Business Operations Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frontier - AI-Powered Business Operations Platform',
    description: 'Transform your business operations with comprehensive financial analysis, strategic planning, and market research.',
    images: ['/og-image.jpg'],
    creator: '@FrontierBiz',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    other: {
      'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION || '',
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className={inter.className}>
        <Header />
        <main className="pt-20">
          {children}
        </main>
        <Footer />
        <Analytics />
        <GoogleAnalytics />
        <HotjarScript />
      </body>
    </html>
  )
}
