import { Metadata } from 'next'
import { ComparisonHero } from '@/components/comparison/ComparisonHero'
import { FeatureComparison } from '@/components/comparison/FeatureComparison'
import { CompetitorAnalysis } from '@/components/comparison/CompetitorAnalysis'
import { WhyChooseFrontier } from '@/components/comparison/WhyChooseFrontier'
import { MigrationSection } from '@/components/comparison/MigrationSection'
import { ComparisonCTA } from '@/components/comparison/ComparisonCTA'

export const metadata: Metadata = {
  title: 'Frontier vs Competitors - See Why We\'re the Clear Choice',
  description: 'Compare Frontier Operations Platform with leading competitors. See why 500+ companies choose us for superior features, better pricing, and faster implementation.',
  keywords: [
    'operations platform comparison',
    'business process management comparison',
    'workflow automation competitors',
    'enterprise operations software',
    'business automation comparison',
    'operations management alternatives',
    'frontier vs competitors',
    'best operations platform'
  ],
  openGraph: {
    title: 'Frontier vs Competitors - See Why We\'re the Clear Choice',
    description: 'Comprehensive comparison showing why Frontier leads in features, pricing, and performance against all major competitors.',
    url: 'https://frontier-ops.com/comparison',
    siteName: 'Frontier Operations',
    images: [
      {
        url: '/og-image-comparison.jpg',
        width: 1200,
        height: 630,
        alt: 'Frontier vs Competitors Comparison Chart',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
}

export default function ComparisonPage() {
  return (
    <main className="min-h-screen">
      <ComparisonHero />
      <FeatureComparison />
      <CompetitorAnalysis />
      <WhyChooseFrontier />
      <MigrationSection />
      <ComparisonCTA />
    </main>
  )
}
