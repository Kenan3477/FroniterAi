import { Metadata } from 'next'
import { CaseStudiesHero } from '@/components/case-studies/CaseStudiesHero'
import { IndustryFilter } from '@/components/case-studies/IndustryFilter'
import { CaseStudyGrid } from '@/components/case-studies/CaseStudyGrid'
import { ROICalculator } from '@/components/case-studies/ROICalculator'
import { SuccessMetrics } from '@/components/case-studies/SuccessMetrics'
import { CaseStudiesCTA } from '@/components/case-studies/CaseStudiesCTA'

export const metadata: Metadata = {
  title: 'Case Studies - Real ROI from Frontier Operations Platform',
  description: 'See how companies across different industries achieved 340% ROI and 40% efficiency gains with Frontier. Real results, real metrics, real transformation.',
  keywords: [
    'operations platform case studies',
    'business process automation ROI',
    'operational efficiency case studies',
    'digital transformation results',
    'enterprise operations success stories',
    'workflow automation benefits',
    'business operations improvement',
    'cost reduction case studies'
  ],
  openGraph: {
    title: 'Case Studies - Real ROI from Frontier Operations Platform',
    description: 'Discover how leading companies achieved remarkable results with Frontier Operations Platform across manufacturing, healthcare, finance, and more.',
    url: 'https://frontier-ops.com/case-studies',
    siteName: 'Frontier Operations',
    images: [
      {
        url: '/og-image-case-studies.jpg',
        width: 1200,
        height: 630,
        alt: 'Frontier Operations Case Studies ROI Results',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
}

export default function CaseStudiesPage() {
  return (
    <main className="min-h-screen">
      <CaseStudiesHero />
      <SuccessMetrics />
      <IndustryFilter />
      <CaseStudyGrid />
      <ROICalculator />
      <CaseStudiesCTA />
    </main>
  )
}
