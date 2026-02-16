'use client';

import React from 'react';
import { MainLayout } from '@/components/layout';
import { CallRecordsView } from '@/components/reports/CallRecordsView';

export default function CallRecordsPage() {
  return (
    <MainLayout>
      <CallRecordsView />
    </MainLayout>
  );
}