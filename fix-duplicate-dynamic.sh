#!/bin/bash

# Script to fix duplicate dynamic exports in API routes

echo "🔧 Fixing duplicate dynamic exports..."

# List of files that have duplicate dynamic exports
files=(
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

for file in "${files[@]}"; do
  if [ -f "/Users/zenan/kennex/$file" ]; then
    echo "🔄 Processing: $file"
    
    # Count how many dynamic exports exist
    dynamic_count=$(grep -c "export const dynamic" "/Users/zenan/kennex/$file")
    
    if [ $dynamic_count -gt 1 ]; then
      echo "⚠️  Found $dynamic_count dynamic exports, removing duplicates..."
      
      # Create a temporary file
      temp_file=$(mktemp)
      
      # Keep only the first occurrence of the dynamic export
      awk '
      /export const dynamic/ {
        if (!seen) {
          print
          seen = 1
        }
        next
      }
      /\/\/ Force dynamic rendering for this route/ {
        if (getline > 0 && $0 ~ /export const dynamic/ && seen) {
          next
        } else {
          print prev
          print
        }
        next
      }
      { print }
      { prev = $0 }
      ' "/Users/zenan/kennex/$file" > "$temp_file"
      
      # Replace the original file
      mv "$temp_file" "/Users/zenan/kennex/$file"
      
      echo "✅ Fixed duplicates in: $file"
    else
      echo "✅ No duplicates found in: $file"
    fi
  else
    echo "❌ File not found: $file"
  fi
done

echo "🎉 Completed fixing duplicate dynamic exports"