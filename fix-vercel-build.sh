#!/bin/bash

# Script to add dynamic exports to API routes causing Vercel build failures

echo "🔧 Adding dynamic exports to API routes..."

# List of API routes that need dynamic export
routes=(
  "frontend/src/app/api/admin/agent-coaching/route.ts"
  "frontend/src/app/api/admin/agents/route.ts"
  "frontend/src/app/api/admin/audit-logs/export/route.ts"
  "frontend/src/app/api/admin/audit-logs/route.ts"
  "frontend/src/app/api/admin/audit-logs/stats/route.ts"
  "frontend/src/app/api/admin/business-settings/route.ts"
  "frontend/src/app/api/admin/business-settings/stats/route.ts"
  "frontend/src/app/api/admin/campaigns/available/route.ts"
  "frontend/src/app/api/admin/dnc/stats/route.ts"
  "frontend/src/app/api/admin/reports/export/route.ts"
  "frontend/src/app/api/admin/reports/generate/route.ts"
  "frontend/src/app/api/admin/users/stats/route.ts"
  "frontend/src/app/api/call-records/route.ts"
  "frontend/src/app/api/campaigns/my-campaigns/route.ts"
  "frontend/src/app/api/coaching/agents/route.ts"
  "frontend/src/app/api/contacts/lookup/route.ts"
  "frontend/src/app/api/dashboard/simple-stats/route.ts"
  "frontend/src/app/api/flows/route.ts"
  "frontend/src/app/api/kpi/dashboard/route.ts"
)

for route in "${routes[@]}"; do
  if [ -f "/Users/zenan/kennex/$route" ]; then
    echo "🔄 Processing: $route"
    
    # Check if dynamic export already exists
    if ! grep -q "export const dynamic" "/Users/zenan/kennex/$route"; then
      # Add dynamic export after imports
      sed -i '' '/^import/a\
\
// Force dynamic rendering for this route\
export const dynamic = '\''force-dynamic'\'';
' "/Users/zenan/kennex/$route"
      echo "✅ Added dynamic export to: $route"
    else
      echo "⏭️  Dynamic export already exists in: $route"
    fi
  else
    echo "❌ File not found: $route"
  fi
done

echo "🎉 Completed adding dynamic exports to API routes"