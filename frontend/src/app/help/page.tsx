'use client';

import { MainLayout } from '@/components/layout';

export default function HelpPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
          <p className="mt-2 text-lg text-gray-600">
            Find answers to your questions and get assistance with Kennex AI.
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">❓</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Help Center</h3>
              <p className="text-gray-600 mb-4">
                Comprehensive help documentation and support resources.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h4 className="font-medium text-gray-900 mb-2">Coming Soon:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Getting started guides</li>
                  <li>• Feature documentation</li>
                  <li>• Video tutorials</li>
                  <li>• FAQ section</li>
                  <li>• Contact support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}