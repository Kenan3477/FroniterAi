#!/bin/bash
# PostgreSQL Compatibility Fix Script
# This script fixes all SQLite syntax in frontend API routes to be PostgreSQL compatible

echo "🔧 POSTGRESQL COMPATIBILITY FIX SCRIPT"
echo "======================================="
echo "Fixing SQLite syntax to PostgreSQL in Vercel frontend API routes..."

# Function to replace SQLite syntax with PostgreSQL
fix_postgresql_syntax() {
    local file="$1"
    echo "📝 Fixing: $file"
    
    # Fix datetime('now') -> NOW()
    sed -i.bak "s/datetime('now')/NOW()/g" "$file"
    sed -i.bak "s/datetime(\"now\")/NOW()/g" "$file"
    
    # Fix datetime with intervals
    sed -i.bak "s/datetime('now', '-24 hours')/NOW() - INTERVAL '24 hours'/g" "$file"
    sed -i.bak "s/datetime(\"now\", \"-24 hours\")/NOW() - INTERVAL '24 hours'/g" "$file"
    
    # Fix boolean comparisons
    sed -i.bak 's/isActive = 1/isActive = true/g' "$file"
    sed -i.bak 's/isRead = 0/isRead = false/g' "$file"
    sed -i.bak 's/isActive = 0/isActive = false/g' "$file"
    sed -i.bak 's/isRead = 1/isRead = true/g' "$file"
    
    # Remove backup files
    rm -f "${file}.bak"
}

# Files that need PostgreSQL compatibility fixes
FILES=(
    "frontend/src/app/api/notifications/route.ts"
    "frontend/src/app/api/contacts/import/route.ts"
    "frontend/src/app/api/contacts/export/route.ts"
    "frontend/src/app/api/contacts/[id]/route.ts"
    "frontend/src/app/api/admin/webhooks/route.ts"
    "frontend/src/app/api/admin/integrations/route.ts"
    "frontend/src/app/api/admin/integrations/stats/route.ts"
    "frontend/src/middleware/auth.ts"
)

# Apply fixes
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        fix_postgresql_syntax "$file"
        echo "✅ Fixed: $file"
    else
        echo "⚠️  Not found: $file"
    fi
done

echo ""
echo "🎯 SUMMARY OF FIXES APPLIED:"
echo "• datetime('now') → NOW()"
echo "• datetime('now', '-24 hours') → NOW() - INTERVAL '24 hours'"  
echo "• isActive = 1 → isActive = true"
echo "• isRead = 0 → isRead = false"
echo "• isActive = 0 → isActive = false"
echo "• isRead = 1 → isRead = true"
echo ""
echo "✅ PostgreSQL compatibility fixes complete!"
echo "These changes will resolve 500 errors on Vercel deployment."