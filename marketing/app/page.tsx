import { Metadata } from 'next'
import { HeroSection } from '@/components/landing/HeroSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { DifferentiatorsSection } from '@/components/landing/DifferentiatorsSection'
import { BenefitsSection } from '@/components/landing/BenefitsSection'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'
import { CTASection } from '@/components/landing/CTASection'
import { StatsSection } from '@/components/landing/StatsSection'
import { IntegrationsSection } from '@/components/landing/IntegrationsSection'

export const metadata: Metadata = {
  title: 'Frontier Operations Platform - Revolutionize Your Business Operations',
  description: 'Transform your business operations with AI-powered automation, real-time analytics, and seamless integrations. Increase efficiency by 40% and reduce costs by 30%.',
  keywords: [
    'business operations platform',
    'operations management software',
    'business process automation',
    'workflow optimization',
    'operational efficiency',
    'business intelligence',
    'enterprise operations',
    'digital transformation',
    'process improvement',
    'business automation'
  ],
  openGraph: {
    title: 'Frontier Operations Platform - Revolutionize Your Business Operations',
    description: 'Transform your business operations with AI-powered automation, real-time analytics, and seamless integrations. Trusted by 500+ companies worldwide.',
    url: 'https://frontier-ops.com',
    siteName: 'Frontier Operations',
    images: [
      {
        url: '/og-image-landing.jpg',
        width: 1200,
        height: 630,
        alt: 'Frontier Operations Platform Dashboard',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frontier Operations Platform - Revolutionize Your Business Operations',
    description: 'Transform your business operations with AI-powered automation and real-time analytics.',
    images: ['/twitter-image-landing.jpg'],
  },
}

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <StatsSection />
      <DifferentiatorsSection />
      <FeaturesSection />
      <BenefitsSection />
      <IntegrationsSection />
      <TestimonialsSection />
      <CTASection />
    </main>
  )
}
