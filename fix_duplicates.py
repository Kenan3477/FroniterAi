#!/usr/bin/env python3

import re
import os

# List of files with duplicates
files = [
    "frontend/src/app/api/admin/audit-logs/export/route.ts",
    "frontend/src/app/api/admin/audit-logs/route.ts", 
    "frontend/src/app/api/admin/audit-logs/stats/route.ts",
    "frontend/src/app/api/admin/business-settings/route.ts",
    "frontend/src/app/api/admin/business-settings/stats/route.ts",
    "frontend/src/app/api/admin/campaigns/available/route.ts",
    "frontend/src/app/api/admin/dnc/stats/route.ts",
    "frontend/src/app/api/admin/reports/export/route.ts",
    "frontend/src/app/api/admin/reports/generate/route.ts",
    "frontend/src/app/api/admin/users/stats/route.ts",
    "frontend/src/app/api/campaigns/my-campaigns/route.ts",
    "frontend/src/app/api/contacts/lookup/route.ts",
    "frontend/src/app/api/kpi/dashboard/route.ts"
]

print("🔧 Fixing duplicate dynamic exports...")

for file_path in files:
    full_path = f"/Users/zenan/kennex/{file_path}"
    
    if os.path.exists(full_path):
        print(f"🔄 Processing: {file_path}")
        
        with open(full_path, 'r') as f:
            content = f.read()
        
        # Remove duplicate dynamic exports and their comments
        # Split content into lines
        lines = content.split('\n')
        new_lines = []
        dynamic_found = False
        skip_next = False
        
        for i, line in enumerate(lines):
            # Skip line if marked
            if skip_next:
                skip_next = False
                continue
                
            # Check for dynamic export comment
            if "// Force dynamic rendering for this route" in line:
                # Look ahead to see if next line is dynamic export
                if i + 1 < len(lines) and "export const dynamic" in lines[i + 1]:
                    if dynamic_found:
                        # Skip this comment and the next export line
                        skip_next = True
                        continue
                    else:
                        dynamic_found = True
            
            # Check for dynamic export line
            elif "export const dynamic" in line and "force-dynamic" in line:
                if dynamic_found:
                    # Skip duplicate
                    continue
                else:
                    dynamic_found = True
            
            new_lines.append(line)
        
        # Write back the fixed content
        with open(full_path, 'w') as f:
            f.write('\n'.join(new_lines))
        
        print(f"✅ Fixed: {file_path}")
    else:
        print(f"❌ File not found: {file_path}")

print("🎉 Completed fixing duplicate dynamic exports")