#!/bin/bash

echo "🔧 Removing duplicate dynamic exports..."

# List of files with duplicates
files=(
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
  "frontend/src/app/api/campaigns/my-campaigns/route.ts"
  "frontend/src/app/api/contacts/lookup/route.ts"
  "frontend/src/app/api/kpi/dashboard/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "/Users/zenan/kennex/$file" ]; then
    echo "🔄 Processing: $file"
    
    # Remove duplicate dynamic exports and comments
    # Keep only the first occurrence
    sed -i '' '
      /export const dynamic.*force-dynamic/ {
        x
        /^$/ {
          x
          b skip
        }
        x
        d
        :skip
        x
        s/.*/found/
        x
      }
      /\/\/ Force dynamic rendering for this route/ {
        N
        /\n.*export const dynamic.*force-dynamic/ {
          x
          /found/ {
            x
            d
          }
          x
        }
      }
    ' "/Users/zenan/kennex/$file"
    
    echo "✅ Processed: $file"
  else
    echo "❌ File not found: $file"
  fi
done

echo "🎉 Completed removing duplicate dynamic exports"