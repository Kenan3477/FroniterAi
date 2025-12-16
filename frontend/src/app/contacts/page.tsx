'use client';

import { MainLayout } from '@/components/layout';

export default function ContactsPage() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage your contact database and customer relationships.
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Management</h3>
              <p className="text-gray-600 mb-4">
                Advanced CRM functionality with intelligent contact management and segmentation.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h4 className="font-medium text-gray-900 mb-2">Coming Soon:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Contact database management</li>
                  <li>• Smart tagging and segmentation</li>
                  <li>• Import/export functionality</li>
                  <li>• Contact interaction history</li>
                  <li>• Advanced search and filtering</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}