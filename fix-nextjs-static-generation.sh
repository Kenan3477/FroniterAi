#!/bin/bash
# Fix Next.js Static Generation Issues for API Routes
# This script adds the required 'export const dynamic = "force-dynamic";' directive
# to all API routes to prevent static generation errors

echo "🔧 FIXING NEXT.JS STATIC GENERATION ISSUES"
echo "=========================================="

# List of API route files that need the dynamic export directive
API_ROUTES=(
    "src/app/api/notifications/route.ts"
    "src/app/api/notifications/summary/route.ts" 
    "src/app/api/notifications/due-callbacks/route.ts"
    "src/app/api/admin/business-settings/stats/route.ts"
    "src/app/api/admin/audit-logs/route.ts"
    "src/app/api/admin/audit-logs/stats/route.ts"
    "src/app/api/admin/user-sessions/route.ts"
    "src/app/api/admin/integrations/stats/route.ts"
    "src/app/api/admin/webhooks/route.ts"
    "src/app/api/debug/auth/route.ts"
    "src/app/api/pause-events/compliance-report/route.ts"
    "src/app/api/pause-events/stats/route.ts"
    "src/app/api/users/route.ts"
    "src/app/api/users/profile/route.ts"
    "src/app/api/contacts/import/route.ts"
    "src/app/api/contacts/export/route.ts"
    "src/app/api/contacts/[id]/route.ts"
)

add_dynamic_export() {
    local file="$1"
    if [ -f "$file" ]; then
        # Check if the file already has the dynamic export
        if grep -q "export const dynamic" "$file"; then
            echo "✅ Already has dynamic export: $file"
        else
            echo "📝 Adding dynamic export to: $file"
            
            # Find the line after imports and before the first export
            # Add the dynamic export directive
            sed -i.bak '/^import/,/^$/!b;/^$/a\
\
// Force dynamic rendering to prevent static generation errors\
export const dynamic = "force-dynamic";
' "$file"
            
            # Remove backup file
            rm -f "${file}.bak"
            echo "✅ Added dynamic export to: $file"
        fi
    else
        echo "⚠️  File not found: $file"
    fi
}

# Process all API routes
for route in "${API_ROUTES[@]}"; do
    add_dynamic_export "$route"
done

echo ""
echo "🎯 SUMMARY:"
echo "Added 'export const dynamic = \"force-dynamic\";' to API routes"
echo "This prevents Next.js from trying to statically generate API routes"
echo "that use request headers, which causes build failures."
echo ""
echo "✅ Next.js static generation issues fixed!"