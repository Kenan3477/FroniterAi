'use client';

import { ReactNode } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { EventSystemProvider } from '@/contexts/EventSystemContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { store } from '@/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthGuard>
              <EventSystemProvider>
                {children}
              </EventSystemProvider>
            </AuthGuard>
          </AuthProvider>
        </QueryClientProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}