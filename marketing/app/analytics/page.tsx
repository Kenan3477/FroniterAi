import { Metadata } from 'next'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { FunnelAnalysis } from '@/components/analytics/FunnelAnalysis'
import { ConversionTracking } from '@/components/analytics/ConversionTracking'
import { SEOPerformance } from '@/components/analytics/SEOPerformance'
import { ContentAnalytics } from '@/components/analytics/ContentAnalytics'
import { CampaignPerformance } from '@/components/analytics/CampaignPerformance'

export const metadata: Metadata = {
  title: 'Marketing Analytics Dashboard - Track Your Marketing Performance',
  description: 'Comprehensive marketing analytics dashboard to track website performance, conversion funnels, SEO metrics, and campaign ROI in real-time.',
  robots: {
    index: false, // Private dashboard
    follow: false,
  },
}

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen bg-secondary-50">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Marketing Analytics Dashboard
          </h1>
          <p className="text-secondary-600">
            Track your marketing performance, conversion funnels, and ROI in real-time
          </p>
        </div>

        <div className="space-y-8">
          <AnalyticsDashboard />
          <FunnelAnalysis />
          <ConversionTracking />
          <SEOPerformance />
          <ContentAnalytics />
          <CampaignPerformance />
        </div>
      </div>
    </main>
  )
}
