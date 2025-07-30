'use client'

import { AdminDashboard } from '@/components/admin'
import { useAuth } from '@/hooks/useAuth'
import { redirect } from 'next/navigation'

export default function AdminPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    redirect('/dashboard')
  }

  return <AdminDashboard />
}
